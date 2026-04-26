const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { notifyUser } = require('../utils/notify');

const router = express.Router();

const VALID_METHOD_TYPES = ['BKASH', 'ROCKET', 'NAGAD', 'CASH'];
const MOBILE_METHOD_TYPES = ['BKASH', 'ROCKET', 'NAGAD'];

function sanitizeNumber(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\s-]/g, '').trim();
}

function buildReceiptNumber(paymentId) {
  return `RCP-${String(paymentId).padStart(6, '0')}`;
}

async function loadDoctor(userId) {
  return prisma.doctor.findUnique({ where: { userId }, include: { user: true } });
}

async function loadPatient(userId) {
  return prisma.patient.findUnique({ where: { userId }, include: { user: true } });
}

/* ─────────────── Doctor payment methods ─────────────── */

// GET /api/payments/methods  — doctor's own list
router.get('/methods', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await loadDoctor(req.user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });
    const methods = await prisma.doctorPaymentMethod.findMany({
      where: { doctorId: doctor.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(methods);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payment methods.' });
  }
});

// POST /api/payments/methods
router.post('/methods', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const type = String(req.body.type || '').toUpperCase();
    const number = sanitizeNumber(req.body.number);
    const label = typeof req.body.label === 'string' ? req.body.label.trim() : null;

    if (!MOBILE_METHOD_TYPES.includes(type)) {
      return res.status(400).json({ error: 'type must be BKASH, ROCKET, or NAGAD.' });
    }
    if (!/^\d{11}$/.test(number)) {
      return res.status(400).json({ error: 'number must be an 11-digit mobile number.' });
    }

    const doctor = await loadDoctor(req.user.id);
    const method = await prisma.doctorPaymentMethod.create({
      data: { doctorId: doctor.id, type, number, label: label || null },
    });
    res.status(201).json(method);
  } catch (err) {
    if (String(err?.code) === 'P2002') {
      return res.status(409).json({ error: 'This payment method is already saved.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to add payment method.' });
  }
});

// PATCH /api/payments/methods/:id  — toggle isActive or change label
router.patch('/methods/:id', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const doctor = await loadDoctor(req.user.id);
    const existing = await prisma.doctorPaymentMethod.findUnique({ where: { id } });
    if (!existing || existing.doctorId !== doctor.id) {
      return res.status(404).json({ error: 'Payment method not found.' });
    }
    const data = {};
    if (typeof req.body.isActive === 'boolean') data.isActive = req.body.isActive;
    if (typeof req.body.label === 'string') data.label = req.body.label.trim() || null;
    const updated = await prisma.doctorPaymentMethod.update({ where: { id }, data });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update payment method.' });
  }
});

// DELETE /api/payments/methods/:id
router.delete('/methods/:id', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const doctor = await loadDoctor(req.user.id);
    const existing = await prisma.doctorPaymentMethod.findUnique({ where: { id } });
    if (!existing || existing.doctorId !== doctor.id) {
      return res.status(404).json({ error: 'Payment method not found.' });
    }
    await prisma.doctorPaymentMethod.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete payment method.' });
  }
});

/* ─────────────── Per-appointment payment ─────────────── */

// POST /api/payments/appointments/:id  — doctor sets fee (creates Payment row)
router.post('/appointments/:id', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
      return res.status(400).json({ error: 'amount must be a non-negative number.' });
    }

    const doctor = await loadDoctor(req.user.id);
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { payment: true, patient: { include: { user: true } } },
    });
    if (!visit || visit.doctorId !== doctor.id) {
      return res.status(404).json({ error: 'Visit not found.' });
    }
    if (visit.payment) {
      return res.status(409).json({ error: 'Payment already created for this visit.' });
    }

    const payment = await prisma.payment.create({
      data: {
        appointmentId: visit.id,
        doctorId: doctor.id,
        patientId: visit.patientId,
        amount: Math.round(amount),
        status: amount === 0 ? 'WAIVED' : 'PENDING',
        waivedAt: amount === 0 ? new Date() : null,
      },
    });

    if (amount > 0) {
      await notifyUser(
        visit.patient.userId,
        'Payment due',
        `Dr. ${doctor.user.fullName} has requested ৳${amount} for your visit. Tap to pay.`,
        'payment_due',
        { visitId: visit.id, paymentId: payment.id, amount }
      );
    }

    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create payment.' });
  }
});

// GET /api/payments/appointments/:id  — both roles; returns payment + doctor's active methods
router.get('/appointments/:id', authenticate, async (req, res) => {
  try {
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        payment: true,
        doctor: { include: { user: { select: { fullName: true } } } },
        patient: { include: { user: { select: { fullName: true } } } },
      },
    });
    if (!visit) return res.status(404).json({ error: 'Visit not found.' });

    // Authorisation
    if (req.user.role === 'DOCTOR') {
      const doctor = await loadDoctor(req.user.id);
      if (!doctor || visit.doctorId !== doctor.id) return res.status(403).json({ error: 'Forbidden.' });
    } else if (req.user.role === 'PATIENT') {
      const patient = await loadPatient(req.user.id);
      if (!patient || visit.patientId !== patient.id) return res.status(403).json({ error: 'Forbidden.' });
    } else {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const methods = await prisma.doctorPaymentMethod.findMany({
      where: { doctorId: visit.doctorId, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      visitId: visit.id,
      visitDate: visit.visitDate,
      doctor: { id: visit.doctorId, fullName: visit.doctor.user.fullName },
      patient: { id: visit.patientId, fullName: visit.patient.user.fullName },
      payment: visit.payment,
      methods,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payment.' });
  }
});

// PATCH /api/payments/appointments/:id/submit  — patient marks "I've sent payment"
router.patch('/appointments/:id/submit', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const type = String(req.body.methodType || '').toUpperCase();
    const number = type === 'CASH' ? null : sanitizeNumber(req.body.methodNumber);
    const txnId = typeof req.body.patientTxnId === 'string' ? req.body.patientTxnId.trim() : null;

    if (!VALID_METHOD_TYPES.includes(type)) {
      return res.status(400).json({ error: 'methodType is invalid.' });
    }
    if (type !== 'CASH' && !number) {
      return res.status(400).json({ error: 'methodNumber is required for mobile banking.' });
    }
    if (type !== 'CASH' && !txnId) {
      return res.status(400).json({ error: 'patientTxnId is required for mobile banking submissions.' });
    }

    const patient = await loadPatient(req.user.id);
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { payment: true, doctor: { include: { user: true } } },
    });
    if (!visit || visit.patientId !== patient.id) return res.status(404).json({ error: 'Visit not found.' });
    if (!visit.payment) return res.status(400).json({ error: 'No payment has been requested for this visit.' });
    if (!['PENDING', 'AWAITING_CONFIRMATION'].includes(visit.payment.status)) {
      return res.status(400).json({ error: 'Payment is not awaiting patient action.' });
    }

    if (type !== 'CASH') {
      const method = await prisma.doctorPaymentMethod.findFirst({
        where: { doctorId: visit.doctorId, type, number, isActive: true },
      });
      if (!method) return res.status(400).json({ error: 'Selected payment method is not available.' });
    }

    const updated = await prisma.payment.update({
      where: { id: visit.payment.id },
      data: {
        status: 'AWAITING_CONFIRMATION',
        selectedMethodType: type,
        selectedMethodNumber: number,
        patientTxnId: txnId || null,
        submittedAt: new Date(),
      },
    });

    const via = type === 'CASH' ? 'cash' : `${type} (${number})`;
    await notifyUser(
      visit.doctor.user.id,
      'Payment submitted',
      `${patient.user.fullName} reports paying ৳${updated.amount} via ${via}. Please confirm receipt.`,
      'payment_submitted',
      { visitId: visit.id, paymentId: updated.id }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit payment.' });
  }
});

// PATCH /api/payments/appointments/:id/confirm  — doctor confirms receipt → PAID
router.patch('/appointments/:id/confirm', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await loadDoctor(req.user.id);
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { payment: true, patient: { include: { user: true } } },
    });
    if (!visit || visit.doctorId !== doctor.id) return res.status(404).json({ error: 'Visit not found.' });
    if (!visit.payment) return res.status(400).json({ error: 'No payment exists for this visit.' });
    if (visit.payment.status === 'PAID') return res.status(400).json({ error: 'Already marked paid.' });

    const updated = await prisma.payment.update({
      where: { id: visit.payment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        receiptNumber: visit.payment.receiptNumber || buildReceiptNumber(visit.payment.id),
      },
    });

    await notifyUser(
      visit.patient.userId,
      'Payment confirmed',
      `Dr. ${doctor.user.fullName} has confirmed your payment of ৳${updated.amount}. Receipt ${updated.receiptNumber} is available.`,
      'payment_confirmed',
      { visitId: visit.id, paymentId: updated.id, receiptNumber: updated.receiptNumber }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm payment.' });
  }
});

// PATCH /api/payments/appointments/:id/mark-cash-paid
// Doctor received physical cash at the clinic → one-tap PAID with CASH method.
router.patch('/appointments/:id/mark-cash-paid', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await loadDoctor(req.user.id);
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { payment: true, patient: { include: { user: true } } },
    });
    if (!visit || visit.doctorId !== doctor.id) return res.status(404).json({ error: 'Visit not found.' });
    if (!visit.payment) return res.status(400).json({ error: 'No payment exists for this visit.' });
    if (visit.payment.status === 'PAID') return res.status(400).json({ error: 'Already marked paid.' });

    const now = new Date();
    const updated = await prisma.payment.update({
      where: { id: visit.payment.id },
      data: {
        status: 'PAID',
        selectedMethodType: 'CASH',
        selectedMethodNumber: null,
        submittedAt: visit.payment.submittedAt || now,
        paidAt: now,
        receiptNumber: visit.payment.receiptNumber || buildReceiptNumber(visit.payment.id),
      },
    });

    await notifyUser(
      visit.patient.userId,
      'Payment confirmed (cash)',
      `Dr. ${doctor.user.fullName} has recorded your cash payment of ৳${updated.amount}. Receipt ${updated.receiptNumber} is available.`,
      'payment_confirmed',
      { visitId: visit.id, paymentId: updated.id, receiptNumber: updated.receiptNumber }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark cash paid.' });
  }
});

// PATCH /api/payments/appointments/:id/waive  — doctor waives the fee
router.patch('/appointments/:id/waive', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await loadDoctor(req.user.id);
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: { payment: true, patient: { include: { user: true } } },
    });
    if (!visit || visit.doctorId !== doctor.id) return res.status(404).json({ error: 'Visit not found.' });
    if (!visit.payment) return res.status(400).json({ error: 'No payment exists for this visit.' });
    if (visit.payment.status === 'PAID') return res.status(400).json({ error: 'Already paid.' });

    const updated = await prisma.payment.update({
      where: { id: visit.payment.id },
      data: { status: 'WAIVED', waivedAt: new Date() },
    });

    await notifyUser(
      visit.patient.userId,
      'Payment waived',
      `Dr. ${doctor.user.fullName} has waived the fee for your visit.`,
      'payment_waived',
      { visitId: visit.id, paymentId: updated.id }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to waive payment.' });
  }
});

// GET /api/payments/appointments/:id/receipt
router.get('/appointments/:id/receipt', authenticate, async (req, res) => {
  try {
    const visit = await prisma.appointment.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        payment: true,
        doctor: { include: { user: { select: { fullName: true } } } },
        patient: { include: { user: { select: { fullName: true } } } },
      },
    });
    if (!visit || !visit.payment || visit.payment.status !== 'PAID') {
      return res.status(404).json({ error: 'Receipt not available.' });
    }
    if (req.user.role === 'DOCTOR') {
      const doctor = await loadDoctor(req.user.id);
      if (!doctor || visit.doctorId !== doctor.id) return res.status(403).json({ error: 'Forbidden.' });
    } else if (req.user.role === 'PATIENT') {
      const patient = await loadPatient(req.user.id);
      if (!patient || visit.patientId !== patient.id) return res.status(403).json({ error: 'Forbidden.' });
    }

    res.json({
      receiptNumber: visit.payment.receiptNumber,
      amount: visit.payment.amount,
      paidAt: visit.payment.paidAt,
      method: {
        type: visit.payment.selectedMethodType,
        number: visit.payment.selectedMethodNumber,
      },
      patientTxnId: visit.payment.patientTxnId,
      visit: { id: visit.id, date: visit.visitDate, cause: visit.cause, serialNumber: visit.serialNumber },
      doctor: { id: visit.doctorId, fullName: visit.doctor.user.fullName, hospitalName: visit.doctor.hospitalName },
      patient: { id: visit.patientId, fullName: visit.patient.user.fullName },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load receipt.' });
  }
});

/* ─────────────── Listing endpoints ─────────────── */

// GET /api/payments/mine  — patient: all payments across their visits
router.get('/mine', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const patient = await loadPatient(req.user.id);
    const payments = await prisma.payment.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          include: {
            doctor: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
    });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load payments.' });
  }
});

// GET /api/payments/incoming  — doctor: payments awaiting confirmation or still pending
router.get('/incoming', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await loadDoctor(req.user.id);
    const payments = await prisma.payment.findMany({
      where: { doctorId: doctor.id, status: { in: ['PENDING', 'AWAITING_CONFIRMATION'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          include: {
            patient: { include: { user: { select: { fullName: true } } } },
          },
        },
      },
    });
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load incoming payments.' });
  }
});

module.exports = router;
