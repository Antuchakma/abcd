const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { extractMetricsFromReport } = require('../utils/report-ocr');
const { notifyUser } = require('../utils/notify');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST /api/reports — Upload a medical report, extract health metrics with OCR
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { reportType, patientId, appointmentId } = req.body;

    let resolvedPatientId;
    if (req.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      if (!patient) return res.status(404).json({ error: 'Patient not found.' });
      resolvedPatientId = patient.id;
    } else {
      resolvedPatientId = parseInt(patientId);
    }

    if (!req.file) return res.status(400).json({ error: 'A file is required.' });

    const fileUrl = `/uploads/${req.file.filename}`;
    const parsedAppointmentId = appointmentId ? parseInt(appointmentId) : null;

    let extractedMetrics = [];
    let extractedText = null;
    try {
      const extraction = await extractMetricsFromReport(req.file.path, req.file.mimetype);
      extractedMetrics = extraction.extractedMetrics;
      extractedText = extractedMetrics.length > 0 ? JSON.stringify(extractedMetrics) : extraction.ocrText || null;
    } catch (ocrErr) {
      console.error('OCR extraction error:', ocrErr.message);
    }

    const report = await prisma.medicalReport.create({
      data: {
        patientId: resolvedPatientId,
        appointmentId: parsedAppointmentId,
        reportType: reportType || 'Lab Report',
        fileUrl,
        extractedText,
      },
    });

    let savedMetrics = [];
    if (extractedMetrics.length > 0) {
      const validMetrics = extractedMetrics.filter(
        (m) => m.metricType && typeof m.value === 'number' && !isNaN(m.value) && m.unit
      );
      if (validMetrics.length > 0) {
        savedMetrics = await prisma.$transaction(
          validMetrics.map((m) =>
            prisma.healthMetric.create({
              data: {
                patientId: resolvedPatientId,
                appointmentId: parsedAppointmentId,
                metricType: m.metricType,
                value: m.value,
                unit: m.unit,
              },
            })
          )
        );
      }
    }

    // Notify the doctor linked to the appointment
    if (req.user.role === 'PATIENT' && parsedAppointmentId) {
      try {
        const appt = await prisma.appointment.findUnique({
          where: { id: parsedAppointmentId },
          include: { doctor: { include: { user: true } }, patient: { include: { user: true } } },
        });
        if (appt) {
          await notifyUser(
            appt.doctor.userId,
            'Patient uploaded a report',
            `${appt.patient.user.fullName} uploaded a ${reportType || 'Lab Report'} for their visit.`,
            'report_uploaded',
            { visitId: parsedAppointmentId }
          );
        }
      } catch (_) {}
    }

    res.status(201).json({ report, extractedMetrics, savedMetrics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload report.' });
  }
});

// GET /api/reports
router.get('/', authenticate, async (req, res) => {
  try {
    let reports;
    if (req.user.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
      reports = await prisma.medicalReport.findMany({
        where: { patientId: patient.id },
        include: {
          doctor: { include: { user: { select: { fullName: true } } } },
          appointment: { include: { doctor: { include: { user: { select: { fullName: true } } } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.user.role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { userId: req.user.id } });
      reports = await prisma.medicalReport.findMany({
        where: {
          OR: [
            { doctorId: doctor.id },
            { appointment: { doctorId: doctor.id } },
          ],
        },
        include: {
          patient: { include: { user: { select: { fullName: true } } } },
          appointment: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// GET /api/reports/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const report = await prisma.medicalReport.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        patient: { include: { user: { select: { fullName: true } } } },
        doctor: { include: { user: { select: { fullName: true } } } },
        appointment: true,
      },
    });
    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

module.exports = router;
