const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

// GET /api/doctor/profile
router.get('/profile', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { userId: req.user.id },
      include: {
        user: { select: { fullName: true, email: true, createdAt: true } },
        specialties: { orderBy: { createdAt: 'asc' } },
        hospitalHistory: { orderBy: { startedAt: 'desc' } },
        degrees: { orderBy: { createdAt: 'desc' } },
        achievements: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });
    res.json(doctor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctor profile.' });
  }
});

// PUT /api/doctor/profile
router.put('/profile', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    if (req.body.licenseNumber && normalizeText(req.body.licenseNumber) !== normalizeText(doctor.licenseNumber)) {
      return res.status(403).json({ error: 'Medical license number cannot be changed.' });
    }

    if (req.body.specialization && normalizeText(req.body.specialization) !== normalizeText(doctor.specialization)) {
      return res.status(400).json({ error: 'Specialization is add-only. Use add specialization action.' });
    }

    const nextBio = typeof req.body.bio === 'string' ? req.body.bio.trim() : doctor.bio;
    const nextHospital = normalizeText(req.body.hospitalName);

    let updated;
    if (nextHospital && nextHospital !== doctor.hospitalName) {
      updated = await prisma.$transaction(async (tx) => {
        await tx.doctorHospitalHistory.updateMany({
          where: { doctorId: doctor.id, endedAt: null },
          data: { endedAt: new Date() },
        });

        await tx.doctorHospitalHistory.create({
          data: { doctorId: doctor.id, hospitalName: nextHospital, startedAt: new Date() },
        });

        return tx.doctor.update({
          where: { id: doctor.id },
          data: { hospitalName: nextHospital, bio: nextBio },
          include: {
            user: { select: { fullName: true, email: true, createdAt: true } },
            specialties: { orderBy: { createdAt: 'asc' } },
            hospitalHistory: { orderBy: { startedAt: 'desc' } },
            degrees: { orderBy: { createdAt: 'desc' } },
            achievements: { orderBy: { createdAt: 'desc' } },
          },
        });
      });
    } else {
      updated = await prisma.doctor.update({
        where: { id: doctor.id },
        data: { bio: nextBio },
        include: {
          user: { select: { fullName: true, email: true, createdAt: true } },
          specialties: { orderBy: { createdAt: 'asc' } },
          hospitalHistory: { orderBy: { startedAt: 'desc' } },
          degrees: { orderBy: { createdAt: 'desc' } },
          achievements: { orderBy: { createdAt: 'desc' } },
        },
      });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update doctor profile.' });
  }
});

// POST /api/doctor/profile/specialties
router.post('/profile/specialties', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const name = normalizeText(req.body.name);
    if (!name) return res.status(400).json({ error: 'Specialty name is required.' });

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const specialty = await prisma.doctorSpecialty.create({
      data: { doctorId: doctor.id, name },
    });

    if (!normalizeText(doctor.specialization)) {
      await prisma.doctor.update({ where: { id: doctor.id }, data: { specialization: name } });
    }

    res.status(201).json(specialty);
  } catch (err) {
    if (String(err?.code) === 'P2002') {
      return res.status(409).json({ error: 'This specialty already exists in your profile.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to add specialty.' });
  }
});

// POST /api/doctor/profile/degrees
router.post('/profile/degrees', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const title = normalizeText(req.body.title);
    const institution = normalizeText(req.body.institution) || null;
    const year = req.body.year ? Number(req.body.year) : null;
    if (!title) return res.status(400).json({ error: 'Degree title is required.' });
    if (year && (Number.isNaN(year) || year < 1900 || year > 2100)) {
      return res.status(400).json({ error: 'Degree year is invalid.' });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const degree = await prisma.doctorDegree.create({
      data: { doctorId: doctor.id, title, institution, year },
    });

    res.status(201).json(degree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add degree.' });
  }
});

// POST /api/doctor/profile/achievements
router.post('/profile/achievements', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const title = normalizeText(req.body.title);
    const description = normalizeText(req.body.description) || null;
    const year = req.body.year ? Number(req.body.year) : null;
    if (!title) return res.status(400).json({ error: 'Achievement title is required.' });
    if (year && (Number.isNaN(year) || year < 1900 || year > 2100)) {
      return res.status(400).json({ error: 'Achievement year is invalid.' });
    }

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const achievement = await prisma.doctorAchievement.create({
      data: { doctorId: doctor.id, title, description, year },
    });

    res.status(201).json(achievement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add achievement.' });
  }
});

// GET /api/doctor/public/:doctorId - patient visible profile fields
router.get('/public/:doctorId', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const doctorId = Number(req.params.doctorId);
    if (!doctorId) return res.status(400).json({ error: 'Invalid doctor id.' });

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
        specialties: { orderBy: { createdAt: 'asc' } },
        hospitalHistory: { orderBy: { startedAt: 'desc' } },
        degrees: { orderBy: { createdAt: 'desc' } },
        achievements: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!doctor || !doctor.isApproved) return res.status(404).json({ error: 'Doctor not found.' });

    res.json({
      id: doctor.id,
      fullName: doctor.user.fullName,
      avatarUrl: doctor.user.avatarUrl,
      specialization: doctor.specialization,
      hospitalName: doctor.hospitalName,
      maxDailyVisits: doctor.maxDailyVisits,
      bio: doctor.bio,
      specialties: doctor.specialties,
      hospitalHistory: doctor.hospitalHistory,
      degrees: doctor.degrees,
      achievements: doctor.achievements,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctor public profile.' });
  }
});

// GET /api/doctor/patients - all patients this doctor has prescribed to
router.get('/patients', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    const prescriptions = await prisma.prescription.findMany({
      where: { doctorId: doctor.id },
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true } },
          },
        },
      },
    });

    // Deduplicate patients
    const patientsMap = new Map();
    prescriptions.forEach((p) => {
      if (!patientsMap.has(p.patient.id)) {
        patientsMap.set(p.patient.id, p.patient);
      }
    });

    res.json(Array.from(patientsMap.values()));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patients.' });
  }
});

// GET /api/doctor/patients/:patientId
router.get('/patients/:patientId', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: parseInt(req.params.patientId) },
      include: {
        user: { select: { fullName: true, email: true } },
        medicalHistory: true,
        prescriptions: {
          include: {
            medicines: { include: { medicine: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        medicalReports: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient.' });
  }
});

// GET /api/doctor/search?q=&specialization=&hospital=  (accessible by PATIENT)
router.get('/search', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const { q, specialization, hospital } = req.query;
    const and = [];

    if (q && q.trim()) {
      const numId = parseInt(q.trim(), 10);
      if (!isNaN(numId)) {
        and.push({ OR: [{ id: numId }, { user: { fullName: { contains: q.trim(), mode: 'insensitive' } } }] });
      } else {
        and.push({ user: { fullName: { contains: q.trim(), mode: 'insensitive' } } });
      }
    }
    if (specialization && specialization.trim()) {
      const s = specialization.trim();
      and.push({
        OR: [
          { specialization: { contains: s, mode: 'insensitive' } },
          { specialties: { some: { name: { contains: s, mode: 'insensitive' } } } },
        ],
      });
    }
    if (hospital && hospital.trim()) {
      and.push({ hospitalName: { contains: hospital.trim(), mode: 'insensitive' } });
    }

    const where = { isApproved: true, ...(and.length ? { AND: and } : {}) };
    const doctors = await prisma.doctor.findMany({
      where,
      include: {
        user: { select: { fullName: true } },
        specialties: { orderBy: { createdAt: 'asc' }, take: 5 },
      },
      take: 20,
      orderBy: { id: 'asc' },
    });
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed.' });
  }
});

// GET /api/doctor/suggestions?type=name|specialization|hospital&q=  (accessible by PATIENT)
router.get('/suggestions', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const { type, q = '' } = req.query;

    if (type === 'name') {
      const doctors = await prisma.doctor.findMany({
        where: { isApproved: true, user: { fullName: { contains: q, mode: 'insensitive' } } },
        include: { user: { select: { fullName: true } } },
        take: 8,
      });
      return res.json(doctors.map((d) => ({ id: d.id, name: d.user.fullName, specialization: d.specialization, hospitalName: d.hospitalName })));
    }

    if (type === 'specialization') {
      const rowsLegacy = await prisma.doctor.findMany({
        where: { isApproved: true, specialization: { contains: q, mode: 'insensitive' } },
        select: { specialization: true },
        distinct: ['specialization'],
        take: 8,
      });

      const rowsNew = await prisma.doctorSpecialty.findMany({
        where: { name: { contains: q, mode: 'insensitive' }, doctor: { isApproved: true } },
        select: { name: true },
        distinct: ['name'],
        take: 8,
      });

      const merged = Array.from(new Set([
        ...rowsLegacy.map((r) => r.specialization),
        ...rowsNew.map((r) => r.name),
      ].filter(Boolean)));
      return res.json(merged.slice(0, 8));
    }

    if (type === 'hospital') {
      const rows = await prisma.doctor.findMany({
        where: { isApproved: true, hospitalName: { contains: q, mode: 'insensitive' } },
        select: { hospitalName: true },
        distinct: ['hospitalName'],
        take: 8,
      });
      return res.json(rows.map((r) => r.hospitalName));
    }

    res.json([]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Suggestions failed.' });
  }
});

module.exports = router;
