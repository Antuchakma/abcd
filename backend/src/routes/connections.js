const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');
const { getIO } = require('../socket');
const { notifyUser } = require('../utils/notify');

const router = express.Router();

// POST /api/connections — Patient sends request to doctor by doctorId
router.post('/', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ error: 'doctorId is required.' });

    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id }, include: { user: true } });
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

    const doctor = await prisma.doctor.findUnique({ where: { id: Number(doctorId) }, include: { user: true } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });
    if (!doctor.isApproved) return res.status(400).json({ error: 'Doctor is not yet approved by admin.' });

    const existing = await prisma.doctorPatient.findUnique({
      where: { doctorId_patientId: { doctorId: doctor.id, patientId: patient.id } },
    });
    if (existing) return res.status(409).json({ error: 'Connection already exists.' });

    const conn = await prisma.doctorPatient.create({
      data: { doctorId: doctor.id, patientId: patient.id, status: 'PENDING' },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
    });

    // Notify the doctor via socket + DB notification
    getIO().to(`user_${doctor.userId}`).emit('new_connection_request', conn);
    await notifyUser(
      doctor.userId,
      'New connection request',
      `${patient.user.fullName} wants to connect with you as their doctor.`,
      'new_connection_request',
      { patientId: patient.id }
    );

    res.status(201).json(conn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create connection.' });
  }
});

// GET /api/connections — Get my connections (role-aware)
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (!patient) return res.status(404).json({ error: 'Patient not found.' });
      const connections = await prisma.doctorPatient.findMany({
        where: { patientId: patient.id },
        include: { doctor: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(connections);
    }
    if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });
      const connections = await prisma.doctorPatient.findMany({
        where: { doctorId: doctor.id },
        include: { patient: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(connections);
    }
    res.status(403).json({ error: 'Not allowed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch connections.' });
  }
});

// PATCH /api/connections/:id — Doctor accepts a request
router.patch('/:id', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== 'ACCEPTED') return res.status(400).json({ error: 'Status must be ACCEPTED.' });

    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    const conn = await prisma.doctorPatient.findUnique({ where: { id: Number(req.params.id) } });
    if (!conn || conn.doctorId !== doctor.id) return res.status(404).json({ error: 'Connection not found.' });

    const updated = await prisma.doctorPatient.update({
      where: { id: conn.id },
      data: { status },
      include: { patient: { include: { user: true } } },
    });

    const doctorWithUser = await prisma.doctor.findUnique({ where: { id: doctor.id }, include: { user: true } });
    getIO().to(`user_${updated.patient.userId}`).emit('connection_updated', { status: 'ACCEPTED', connectionId: conn.id });
    await notifyUser(
      updated.patient.userId,
      'Connection request accepted',
      `Dr. ${doctorWithUser.user.fullName} has accepted your connection request.`,
      'connection_updated',
      { doctorId: doctor.id }
    );

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update connection.' });
  }
});

// DELETE /api/connections/:id — Doctor rejects a request
router.delete('/:id', authenticate, requireRole('DOCTOR'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
    const conn = await prisma.doctorPatient.findUnique({
      where: { id: Number(req.params.id) },
      include: { patient: { include: { user: true } } },
    });
    if (!conn || conn.doctorId !== doctor.id) return res.status(404).json({ error: 'Connection not found.' });

    await prisma.doctorPatient.delete({ where: { id: conn.id } });

    const doctorWithUser = await prisma.doctor.findUnique({ where: { id: conn.doctorId }, include: { user: true } });
    getIO().to(`user_${conn.patient.userId}`).emit('connection_updated', { status: 'REJECTED', connectionId: conn.id });
    await notifyUser(
      conn.patient.userId,
      'Connection request declined',
      `Dr. ${doctorWithUser.user.fullName} has declined your connection request.`,
      'connection_rejected',
      { doctorId: conn.doctorId }
    );

    res.json({ message: 'Connection rejected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject connection.' });
  }
});

module.exports = router;
