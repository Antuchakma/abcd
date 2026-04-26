const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/medicines
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    const medicines = await prisma.medicine.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : undefined,
      orderBy: { name: 'asc' },
    });
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medicines.' });
  }
});

// POST /api/medicines - create (doctor only)
router.post('/', authenticate, requireRole('DOCTOR', 'ADMIN'), async (req, res) => {
  try {
    const { name, manufacturer, description } = req.body;
    if (!name || !manufacturer || !description) {
      return res.status(400).json({ error: 'name, manufacturer and description are required.' });
    }
    const medicine = await prisma.medicine.create({
      data: { name, manufacturer, description },
    });
    res.status(201).json(medicine);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create medicine.' });
  }
});

// GET /api/medicines/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const medicine = await prisma.medicine.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!medicine) return res.status(404).json({ error: 'Medicine not found.' });
    res.json(medicine);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medicine.' });
  }
});

module.exports = router;
