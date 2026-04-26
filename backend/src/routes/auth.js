const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const AVATAR_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role, ...profileData } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    if (!fullName || !normalizedEmail || !password || !role) {
      return res.status(400).json({ error: 'fullName, email, password and role are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    if (role === 'DOCTOR') {
      const specialization = typeof profileData.specialization === 'string' ? profileData.specialization.trim() : '';
      const licenseNumber = typeof profileData.licenseNumber === 'string' ? profileData.licenseNumber.trim() : '';
      const hospitalName = typeof profileData.hospitalName === 'string' ? profileData.hospitalName.trim() : '';

      if (!specialization || !licenseNumber || !hospitalName) {
        return res.status(400).json({ error: 'specialization, licenseNumber and hospitalName are required for doctor signup.' });
      }

      const pendingRequest = await prisma.$queryRaw`
        SELECT 1
        FROM "DoctorSignupRequest"
        WHERE "email" = ${normalizedEmail}
          AND "status" = 'PENDING'
        LIMIT 1
      `;
      if (pendingRequest.length > 0) {
        return res.status(409).json({ error: 'A doctor approval request is already pending for this email.' });
      }

      await prisma.$executeRaw`
        INSERT INTO "DoctorSignupRequest" (
          "fullName",
          "email",
          "passwordHash",
          "specialization",
          "licenseNumber",
          "hospitalName",
          "status",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${fullName.trim()},
          ${normalizedEmail},
          ${await bcrypt.hash(password, 10)},
          ${specialization},
          ${licenseNumber},
          ${hospitalName},
          'PENDING',
          NOW(),
          NOW()
        )
      `;

      return res.status(202).json({
        pendingApproval: true,
        message: 'Your doctor application has been submitted and is waiting for admin approval.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role,
        ...(role === 'PATIENT' && {
          patient: {
            create: {
              dateOfBirth: profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : new Date(),
              gender: profileData.gender || '',
              bloodGroup: profileData.bloodGroup || '',
            },
          },
        }),
      },
      include: { doctor: true, patient: true },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { doctor: true, patient: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.role === 'DOCTOR' && user.doctor && !user.doctor.isApproved) {
      return res.status(403).json({ error: 'Your account is pending admin approval.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { doctor: true, patient: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
});

// PUT /api/auth/change-email
router.put('/change-email', authenticate, async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const normalizedEmail = typeof newEmail === 'string' ? newEmail.trim().toLowerCase() : newEmail;
    if (!normalizedEmail || !currentPassword) {
      return res.status(400).json({ error: 'newEmail and currentPassword are required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(409).json({ error: 'Email is already in use.' });

    await prisma.user.update({ where: { id: req.user.id }, data: { email: normalizedEmail } });
    res.json({ message: 'Email updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update email.' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashedPassword } });

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// POST /api/auth/avatar — upload or replace the user's profile picture
router.post('/avatar', authenticate, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image file is required.' });

    const existing = await prisma.user.findUnique({ where: { id: req.user.id } });
    const newUrl = `/uploads/${req.file.filename}`;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: newUrl },
      include: { doctor: true, patient: true },
    });

    if (existing?.avatarUrl && existing.avatarUrl.startsWith('/uploads/')) {
      const oldPath = path.join(AVATAR_DIR, path.basename(existing.avatarUrl));
      fs.promises.unlink(oldPath).catch(() => {});
    }

    const { password: _, ...userWithoutPassword } = updated;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload avatar.' });
  }
});

module.exports = router;
