const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Simple keyword-based chatbot response engine
function generateResponse(message) {
  const text = message.toLowerCase();

  const rules = [
    {
      keywords: ['headache', 'migraine', 'head pain', 'head ache'],
      condition: 'Headache / Migraine',
      specialist: 'Neurologist',
      advice: 'Stay hydrated, rest in a quiet dark room, and avoid screens.',
    },
    {
      keywords: ['chest pain', 'heart', 'palpitation', 'shortness of breath'],
      condition: 'Possible Cardiac Issue',
      specialist: 'Cardiologist',
      advice: 'If chest pain is severe or radiates to your arm/jaw, call emergency services immediately.',
    },
    {
      keywords: ['fever', 'temperature', 'chills', 'sweating'],
      condition: 'Fever / Possible Infection',
      specialist: 'General Physician',
      advice: 'Stay hydrated, rest, and take paracetamol if needed. See a doctor if fever exceeds 103°F (39.4°C).',
    },
    {
      keywords: ['cough', 'cold', 'flu', 'runny nose', 'sore throat', 'respiratory'],
      condition: 'Respiratory / Cold & Flu',
      specialist: 'Pulmonologist or General Physician',
      advice: 'Rest, drink warm fluids, and use steam inhalation for relief.',
    },
    {
      keywords: ['stomach', 'abdomen', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating'],
      condition: 'Gastrointestinal Issue',
      specialist: 'Gastroenterologist',
      advice: 'Stay hydrated with ORS if experiencing diarrhea. Avoid spicy and fatty foods.',
    },
    {
      keywords: ['skin', 'rash', 'itching', 'acne', 'hives', 'eczema'],
      condition: 'Skin Condition',
      specialist: 'Dermatologist',
      advice: 'Avoid scratching and harsh soaps. A topical antihistamine may provide temporary relief.',
    },
    {
      keywords: ['joint', 'bone', 'arthritis', 'knee pain', 'back pain', 'muscle pain'],
      condition: 'Musculoskeletal Issue',
      specialist: 'Orthopedist',
      advice: 'Apply ice/heat as appropriate, rest the affected area, and avoid heavy lifting.',
    },
    {
      keywords: ['eye', 'vision', 'blur', 'eye pain', 'redness in eye'],
      condition: 'Eye / Vision Issue',
      specialist: 'Ophthalmologist',
      advice: 'Avoid rubbing your eyes. Rest them and use artificial tears if needed.',
    },
    {
      keywords: ['anxiety', 'depression', 'mental', 'stress', 'panic', 'insomnia'],
      condition: 'Mental Health Concern',
      specialist: 'Psychiatrist or Psychologist',
      advice: 'Practice deep breathing, limit caffeine, and maintain a regular sleep schedule.',
    },
    {
      keywords: ['diabetes', 'sugar', 'thyroid', 'hormone', 'weight gain', 'weight loss'],
      condition: 'Endocrine / Metabolic Issue',
      specialist: 'Endocrinologist',
      advice: 'Monitor your diet, maintain a healthy weight, and check blood sugar levels regularly.',
    },
    {
      keywords: ['urine', 'kidney', 'bladder', 'urination', 'uti'],
      condition: 'Urinary / Renal Issue',
      specialist: 'Urologist or Nephrologist',
      advice: 'Drink plenty of water. Avoid holding urine for long periods.',
    },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return `Based on your symptoms, you may be experiencing **${rule.condition}**.\n\n` +
        `**Recommended Specialist:** ${rule.specialist}\n\n` +
        `**Self-care Tip:** ${rule.advice}\n\n` +
        `⚠️ This is not a medical diagnosis. Please consult a qualified doctor for proper evaluation and treatment.`;
    }
  }

  return 'Thank you for sharing your concern. Based on what you described, I recommend consulting a **General Physician** for a proper evaluation.\n\n⚠️ This chatbot provides general guidance only and is not a substitute for professional medical advice.';
}

// POST /api/chat - send a message
router.post('/', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const { messageText, messageType } = req.body;
    if (!messageText) return res.status(400).json({ error: 'messageText is required.' });

    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const responseText = generateResponse(messageText);

    const message = await prisma.chatMessage.create({
      data: {
        patientId: patient.id,
        messageText,
        responseText,
        messageType: messageType || 'SYMPTOM',
      },
    });

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process message.' });
  }
});

// GET /api/chat/history
router.get('/history', authenticate, requireRole('PATIENT'), async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { userId: req.user.id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    const messages = await prisma.chatMessage.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history.' });
  }
});

module.exports = router;
