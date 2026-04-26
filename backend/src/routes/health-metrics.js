const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/health-metrics — Patient's own metrics for charting
router.get('/', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const metrics = await prisma.healthMetric.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: 'asc' },
      include: {
        appointment: { include: { doctor: { include: { user: true } } } },
      },
    });
    res.json(metrics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch health metrics.' });
  }
});

module.exports = router;
