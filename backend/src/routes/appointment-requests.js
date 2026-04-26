const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { notifyUser } = require('../utils/notify');

const router = express.Router();

const REQUEST_INCLUDE = {
  doctor: { include: { user: true } },
  patient: { include: { user: true } },
  visit: true,
};

// POST /api/appointment-requests — Patient requests an appointment
router.post('/', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const { doctorId, cause, notes } = req.body;
    if (!doctorId || !cause) {
      return res.status(400).json({ error: 'doctorId and cause are required.' });
    }

    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const conn = await prisma.doctorPatient.findUnique({
      where: { doctorId_patientId: { doctorId: Number(doctorId), patientId: patient.id } },
    });
    if (!conn || conn.status !== 'ACCEPTED') {
      return res.status(403).json({ error: 'You must be connected to this doctor first.' });
    }

    const patientWithUser = await prisma.patient.findUnique({ where: { id: patient.id }, include: { user: true } });
    const doctorForNotif = await prisma.doctor.findUnique({ where: { id: Number(doctorId) }, include: { user: true } });

    const request = await prisma.appointmentRequest.create({
      data: { doctorId: Number(doctorId), patientId: patient.id, cause, notes: notes || null },
      include: REQUEST_INCLUDE,
    });

    // Notify doctor
    await notifyUser(
      doctorForNotif.userId,
      'New appointment request',
      `${patientWithUser.user.fullName} has requested an appointment: "${cause}".`,
      'appointment_request',
      { requestId: request.id }
    );

    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create appointment request.' });
  }
});

// GET /api/appointment-requests — List requests (role-aware)
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      const requests = await prisma.appointmentRequest.findMany({
        where: { patientId: patient.id },
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
      return res.json(requests);
    }

    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      const requests = await prisma.appointmentRequest.findMany({
        where: { doctorId: doctor.id },
        include: REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
      });
      return res.json(requests);
    }

    res.status(403).json({ error: 'Not allowed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointment requests.' });
  }
});

// PATCH /api/appointment-requests/:id/approve — Doctor approves with a chosen date
router.patch('/:id/approve', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { visitDate: visitDateParam } = req.body;

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id }, include: { user: true } });
    const request = await prisma.appointmentRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { patient: { include: { user: true } } },
    });

    if (!request || request.doctorId !== doctor.id) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed.' });
    }

    // Use doctor-selected date or fall back to next available day
    let visitDate = visitDateParam ? new Date(visitDateParam) : null;
    if (!visitDate || isNaN(visitDate.getTime())) {
      visitDate = new Date();
      visitDate.setHours(0, 0, 0, 0);
      for (let d = 0; d < 30; d++) {
        const dayStart = new Date(visitDate);
        dayStart.setDate(visitDate.getDate() + d);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const count = await prisma.appointment.count({
          where: { doctorId: doctor.id, visitDate: { gte: dayStart, lte: dayEnd } },
        });
        if (count < doctor.maxDailyVisits) { visitDate = dayStart; break; }
      }
    }

    // Get serial number for that day
    const dayStart = new Date(visitDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(visitDate); dayEnd.setHours(23, 59, 59, 999);
    const dayCount = await prisma.appointment.count({
      where: { doctorId: doctor.id, visitDate: { gte: dayStart, lte: dayEnd } },
    });
    const serialNumber = dayCount + 1;

    const [updatedRequest, appointment] = await prisma.$transaction([
      prisma.appointmentRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED' },
        include: REQUEST_INCLUDE,
      }),
      prisma.appointment.create({
        data: {
          doctorId: doctor.id,
          patientId: request.patientId,
          requestId: request.id,
          cause: request.cause,
          notes: request.notes,
          visitDate,
          serialNumber,
          status: 'SCHEDULED',
        },
        include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
      }),
    ]);

    const dateStr = visitDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    await notifyUser(
      request.patient.userId,
      'Appointment confirmed',
      `Dr. ${doctor.user.fullName} has confirmed your appointment on ${dateStr} (Serial #${serialNumber}).`,
      'appointment_approved',
      { appointmentId: appointment.id, visitDate: visitDate.toISOString() }
    );

    res.json({ request: updatedRequest, appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve request.' });
  }
});

// PATCH /api/appointment-requests/:id/reject — Doctor rejects
router.patch('/:id/reject', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id }, include: { user: true } });
    const request = await prisma.appointmentRequest.findUnique({
      where: { id: Number(req.params.id) },
      include: { patient: { include: { user: true } } },
    });

    if (!request || request.doctorId !== doctor.id) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request already processed.' });
    }

    const updated = await prisma.appointmentRequest.update({
      where: { id: request.id },
      data: { status: 'REJECTED' },
      include: REQUEST_INCLUDE,
    });

    await notifyUser(
      request.patient.userId,
      'Appointment request declined',
      `Dr. ${doctor.user.fullName} has declined your appointment request.`,
      'appointment_rejected',
      { requestId: request.id }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject request.' });
  }
});

module.exports = router;
