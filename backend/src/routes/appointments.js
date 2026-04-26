const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { notifyUser } = require('../utils/notify');

const router = express.Router();

const VISIT_INCLUDE = {
  patient: { include: { user: true } },
  doctor: { include: { user: true } },
  request: true,
  prescription: {
    include: { medicines: { include: { medicine: true } } },
  },
  healthMetrics: { orderBy: { recordedAt: 'asc' } },
  reports: true,
};

// GET /api/appointments — List visits (role-aware)
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      const visits = await prisma.appointment.findMany({
        where: { doctorId: doctor.id },
        include: VISIT_INCLUDE,
        orderBy: [{ visitDate: 'asc' }, { serialNumber: 'asc' }],
      });
      return res.json(visits);
    }
    if (req.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      const visits = await prisma.appointment.findMany({
        where: { patientId: patient.id },
        include: VISIT_INCLUDE,
        orderBy: [{ visitDate: 'asc' }, { serialNumber: 'asc' }],
      });
      return res.json(visits);
    }
    res.status(403).json({ error: 'Not allowed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visits.' });
  }
});

// GET /api/appointments/:id — Single visit
router.get('/:id', authenticate, async (req, res) => {
  try {
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: VISIT_INCLUDE,
    });
    if (!visit) return res.status(404).json({ error: 'Visit not found.' });
    res.json(visit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch visit.' });
  }
});

// PATCH /api/appointments/:id/start — Doctor starts the visit (SCHEDULED → ONGOING)
router.patch('/:id/start', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id }, include: { user: true } });
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { patient: { include: { user: true } } },
    });
    if (!visit || visit.doctorId !== doctor.id) return res.status(404).json({ error: 'Visit not found.' });
    if (visit.status !== 'SCHEDULED') return res.status(400).json({ error: 'Visit is not in SCHEDULED state.' });

    const updated = await prisma.appointment.update({
      where: { id: visit.id },
      data: { status: 'ONGOING' },
      include: VISIT_INCLUDE,
    });

    // Notify patient
    await notifyUser(
      visit.patient.userId,
      'Your visit has started',
      `Dr. ${doctor.user.fullName} has started your visit (Serial #${visit.serialNumber}).`,
      'visit_started',
      { visitId: visit.id }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start visit.' });
  }
});

// PATCH /api/appointments/:id/complete — Doctor completes the visit.
// Optional body: { amount } to also create the Payment row in one step.
router.patch('/:id/complete', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id }, include: { user: true } });
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { patient: { include: { user: true } }, payment: true },
    });
    if (!visit || visit.doctorId !== doctor.id) return res.status(404).json({ error: 'Visit not found.' });

    const body = req.body || {};
    let feeAmount = null;
    if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
      const parsed = Number(body.amount);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000000) {
        return res.status(400).json({ error: 'amount must be a non-negative number.' });
      }
      feeAmount = Math.round(parsed);
    }

    if (feeAmount !== null && !visit.payment) {
      await prisma.payment.create({
        data: {
          appointmentId: visit.id,
          doctorId: doctor.id,
          patientId: visit.patientId,
          amount: feeAmount,
          status: feeAmount === 0 ? 'WAIVED' : 'PENDING',
          waivedAt: feeAmount === 0 ? new Date() : null,
        },
      });
    }

    const updated = await prisma.appointment.update({
      where: { id: visit.id },
      data: { status: 'COMPLETED' },
      include: VISIT_INCLUDE,
    });

    await notifyUser(
      visit.patient.userId,
      'Visit completed',
      `Your visit with Dr. ${doctor.user.fullName} has been completed.`,
      'visit_completed',
      { visitId: visit.id }
    );

    if (feeAmount && feeAmount > 0) {
      await notifyUser(
        visit.patient.userId,
        'Payment due',
        `Dr. ${doctor.user.fullName} has requested ৳${feeAmount} for your visit. Tap to pay.`,
        'payment_due',
        { visitId: visit.id, amount: feeAmount }
      );
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete visit.' });
  }
});

// POST /api/appointments/:id/prescription — Save prescription for a visit
router.post('/:id/prescription', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { symptoms, diagnosis, notes, medicines } = req.body;
    if (!diagnosis) return res.status(400).json({ error: 'diagnosis is required.' });

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id }, include: { user: true } });
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { prescription: true, patient: { include: { user: true } } },
    });
    if (!visit || visit.doctorId !== doctor.id) return res.status(404).json({ error: 'Visit not found.' });
    if (visit.prescription) return res.status(409).json({ error: 'Prescription already exists for this visit.' });

    const prescription = await prisma.prescription.create({
      data: {
        doctorId: doctor.id,
        patientId: visit.patientId,
        appointmentId: visit.id,
        symptoms: symptoms || null,
        diagnosis,
        notes: notes || null,
        ...(medicines?.length > 0 && {
          medicines: {
            create: medicines.map((m) => ({
              medicineId: Number(m.medicineId),
              dosage: m.dosage || '',
              frequency: m.frequency || '',
              duration: m.duration || '',
              purpose: m.purpose || '',
            })),
          },
        }),
      },
      include: { medicines: { include: { medicine: true } } },
    });

    // Notify patient
    await notifyUser(
      visit.patient.userId,
      'Prescription issued',
      `Dr. ${doctor.user.fullName} has issued a prescription for your visit.`,
      'prescription_issued',
      { visitId: visit.id }
    );

    res.status(201).json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save prescription.' });
  }
});

// POST /api/appointments/:id/metrics — Record health metrics
router.post('/:id/metrics', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!metrics?.length) return res.status(400).json({ error: 'metrics array is required.' });

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    const visit = await prisma.appointment.findUnique({ where: { id: Number(req.params.id) } });
    if (!visit || visit.doctorId !== doctor.id) return res.status(404).json({ error: 'Visit not found.' });

    const created = await prisma.$transaction(
      metrics.map((m) =>
        prisma.healthMetric.create({
          data: {
            patientId: visit.patientId,
            appointmentId: visit.id,
            metricType: m.metricType,
            value: Number(m.value),
            unit: m.unit,
          },
        })
      )
    );
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add health metrics.' });
  }
});

// POST /api/appointments/:id/followup — Create a follow-up visit
router.post('/:id/followup', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { cause, notes } = req.body;
    if (!cause) return res.status(400).json({ error: 'cause is required.' });

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id }, include: { user: true } });
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { patient: { include: { user: true } } },
    });
    if (!visit || visit.doctorId !== doctor.id) return res.status(404).json({ error: 'Visit not found.' });

    let visitDate = new Date();
    visitDate.setHours(0, 0, 0, 0);
    let serialNumber = 1;

    for (let daysAhead = 1; daysAhead < 30; daysAhead++) {
      const dayStart = new Date(visitDate);
      dayStart.setDate(visitDate.getDate() + daysAhead);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await prisma.appointment.count({
        where: { doctorId: doctor.id, visitDate: { gte: dayStart, lte: dayEnd } },
      });

      if (count < doctor.maxDailyVisits) {
        visitDate = dayStart;
        serialNumber = count + 1;
        break;
      }
    }

    const followup = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: visit.patientId,
        cause,
        notes: notes || null,
        visitDate,
        serialNumber,
        status: 'SCHEDULED',
      },
      include: VISIT_INCLUDE,
    });

    // Notify patient
    await notifyUser(
      visit.patient.userId,
      'Follow-up visit scheduled',
      `Dr. ${doctor.user.fullName} has scheduled a follow-up visit for ${visitDate.toLocaleDateString()}.`,
      'followup_scheduled',
      { visitId: followup.id }
    );

    res.status(201).json(followup);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create follow-up.' });
  }
});

module.exports = router;
