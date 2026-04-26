const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/stats
router.get('/stats', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const [userCount, doctorCount, patientCount, pendingDoctors, pendingDoctorRequests] = await Promise.all([
      prisma.user.count(),
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.doctor.count({ where: { isApproved: false } }),
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM "DoctorSignupRequest"
        WHERE "status" = 'PENDING'
      `,
    ]);
    res.json({ userCount, doctorCount, patientCount, pendingDoctors: pendingDoctors + pendingDoctorRequests[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// GET /api/admin/doctor-requests
router.get('/doctor-requests', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const requests = await prisma.$queryRaw`
      SELECT
        "id",
        "fullName",
        "email",
        "specialization",
        "licenseNumber",
        "hospitalName",
        "status",
        "reviewedAt",
        "createdAt",
        "updatedAt"
      FROM "DoctorSignupRequest"
      ORDER BY "id" DESC
    `;
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctor requests.' });
  }
});

// PATCH /api/admin/doctor-requests/:id/approve
router.patch('/doctor-requests/:id/approve', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const approvedDoctor = await prisma.$transaction(async (tx) => {
      const requestRows = await tx.$queryRaw`
        SELECT
          "id",
          "fullName",
          "email",
          "passwordHash",
          "specialization",
          "licenseNumber",
          "hospitalName",
          "status"
        FROM "DoctorSignupRequest"
        WHERE "id" = ${requestId}
        LIMIT 1
      `;
      const request = requestRows[0];
      if (!request) {
        const error = new Error('Doctor request not found.');
        error.statusCode = 404;
        throw error;
      }

      if (request.status !== 'PENDING') {
        const error = new Error('This request has already been reviewed.');
        error.statusCode = 400;
        throw error;
      }

      const existingUser = await tx.user.findUnique({ where: { email: request.email } });
      if (existingUser) {
        const error = new Error('A user with this email already exists.');
        error.statusCode = 409;
        throw error;
      }

      const user = await tx.user.create({
        data: {
          fullName: request.fullName,
          email: request.email,
          password: request.passwordHash,
          role: 'DOCTOR',
          doctor: {
            create: {
              specialization: request.specialization,
              licenseNumber: request.licenseNumber,
              hospitalName: request.hospitalName,
              isApproved: true,
              specialties: request.specialization
                ? { create: [{ name: request.specialization }] }
                : undefined,
              hospitalHistory: request.hospitalName
                ? { create: [{ hospitalName: request.hospitalName, startedAt: new Date() }] }
                : undefined,
            },
          },
        },
        include: { doctor: true, patient: true },
      });

      await tx.$executeRaw`
        UPDATE "DoctorSignupRequest"
        SET "status" = 'APPROVED',
            "reviewedAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${requestId}
      `;

      return user;
    });

    const { password: _, ...approvedDoctorWithoutPassword } = approvedDoctor;
    res.json(approvedDoctorWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to approve doctor request.' });
  }
});

// PATCH /api/admin/doctor-requests/:id/reject
router.patch('/doctor-requests/:id/reject', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const existing = await prisma.$queryRaw`
      SELECT 1
      FROM "DoctorSignupRequest"
      WHERE "id" = ${requestId}
      LIMIT 1
    `;
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Doctor request not found.' });
    }

    const requestRows = await prisma.$queryRaw`
      UPDATE "DoctorSignupRequest"
      SET "status" = 'REJECTED',
          "reviewedAt" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = ${requestId}
      RETURNING
        "id",
        "fullName",
        "email",
        "specialization",
        "licenseNumber",
        "hospitalName",
        "status",
        "reviewedAt",
        "createdAt",
        "updatedAt"
    `;
    const request = requestRows[0];
    const { passwordHash: _, ...requestWithoutPassword } = request;
    res.json(requestWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject doctor request.' });
  }
});

// GET /api/admin/doctors
router.get('/doctors', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: { user: true },
      orderBy: { id: 'desc' },
    });
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctors.' });
  }
});

// PATCH /api/admin/doctors/:id/approve
router.patch('/doctors/:id/approve', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.update({
      where: { id: Number(req.params.id) },
      data: { isApproved: true },
      include: { user: true },
    });
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve doctor.' });
  }
});

// PATCH /api/admin/doctors/:id/reject
router.patch('/doctors/:id/reject', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.update({
      where: { id: Number(req.params.id) },
      data: { isApproved: false },
      include: { user: true },
    });
    res.json(doctor);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update doctor status.' });
  }
});

module.exports = router;
