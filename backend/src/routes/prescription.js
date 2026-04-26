const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/prescriptions - create (doctor only)
router.post('/', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { patientId, diagnosis, notes, medicines } = req.body;
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    const prescription = await prisma.prescription.create({
      data: {
        doctorId: doctor.id,
        patientId: parseInt(patientId),
        diagnosis,
        notes,
        ...(medicines && medicines.length > 0 && {
          medicines: {
            create: medicines.map((m) => ({
              medicineId: parseInt(m.medicineId),
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              purpose: m.purpose,
            })),
          },
        }),
      },
      include: {
        medicines: { include: { medicine: true } },
        patient: { include: { user: { select: { fullName: true } } } },
        doctor: { include: { user: { select: { fullName: true } } } },
      },
    });

    res.status(201).json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create prescription.' });
  }
});

// GET /api/prescriptions
router.get('/', authenticate, async (req, res) => {
  try {
    let prescriptions;

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      prescriptions = await prisma.prescription.findMany({
        where: { doctorId: doctor.id },
        include: {
          medicines: { include: { medicine: true } },
          patient: { include: { user: { select: { fullName: true, email: true } } } },
          doctor: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      prescriptions = await prisma.prescription.findMany({
        where: { patientId: patient.id },
        include: {
          medicines: { include: { medicine: true } },
          doctor: { include: { user: { select: { fullName: true } } } },
          patient: { include: { user: { select: { fullName: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    res.json(prescriptions);
  } catch (err) {
    console.error('[GET /api/prescriptions]', err);
    res.status(500).json({ error: 'Failed to fetch prescriptions.' });
  }
});

// GET /api/prescriptions/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        medicines: { include: { medicine: true } },
        patient: { include: { user: { select: { fullName: true, email: true } } } },
        doctor: { include: { user: { select: { fullName: true, email: true } } } },
      },
    });
    if (!prescription) return res.status(404).json({ error: 'Prescription not found.' });
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prescription.' });
  }
});

// POST /api/prescriptions/:id/medicines - add medicine to existing prescription
router.post('/:id/medicines', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { medicineId, dosage, frequency, duration, purpose } = req.body;
    const entry = await prisma.prescriptionMedicine.create({
      data: {
        prescriptionId: parseInt(req.params.id),
        medicineId: parseInt(medicineId),
        dosage,
        frequency,
        duration,
        purpose,
      },
      include: { medicine: true },
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add medicine to prescription.' });
  }
});

module.exports = router;
