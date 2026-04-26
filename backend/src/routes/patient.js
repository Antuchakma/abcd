const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/patient/profile
router.get('/profile', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { userId: req.user.id },
      include: { user: { select: { fullName: true, email: true, createdAt: true } } },
    });
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patient profile.' });
  }
});

// PUT /api/patient/profile
router.put('/profile', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const { dateOfBirth, gender, bloodGroup } = req.body;
    const patient = await prisma.patient.update({
      where: { userId: req.user.id },
      data: {
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender && { gender }),
        ...(bloodGroup && { bloodGroup }),
      },
    });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update patient profile.' });
  }
});

// GET /api/patient/history
router.get('/history', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const history = await prisma.patientMedicalHistory.findMany({
      where: { patientId: patient.id },
      orderBy: { startDate: 'desc' },
    });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medical history.' });
  }
});

// POST /api/patient/history
router.post('/history', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const { conditionName, details, startDate, endDate, isChronic } = req.body;
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const entry = await prisma.patientMedicalHistory.create({
      data: {
        patientId: patient.id,
        conditionName,
        details,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isChronic: Boolean(isChronic),
      },
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add medical history.' });
  }
});

// DELETE /api/patient/history/:id
router.delete('/history/:id', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    const entry = await prisma.patientMedicalHistory.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!entry || entry.patientId !== patient.id) {
      return res.status(404).json({ error: 'History entry not found.' });
    }
    await prisma.patientMedicalHistory.delete({ where: { id: entry.id } });
    res.json({ message: 'Deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete history entry.' });
  }
});

module.exports = router;
