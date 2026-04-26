require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./config/prisma');

const PASSWORD = 'Pass@1234';

/* ── Doctors ─────────────────────────────────────────────── */
const DOCTORS = [
  {
    fullName: 'Dr. Ahmedul Kabir',
    email: 'ahmedul.kabir@aroggo.com',
    specialization: 'Cardiology',
    licenseNumber: 'BMDC-12345',
    hospitalName: 'National Heart Foundation Hospital',
    maxDailyVisits: 20,
    avatarUrl: 'https://i.pravatar.cc/300?img=12',
    bio: 'Interventional cardiologist with 15+ years of experience managing hypertensive and ischemic heart disease.',
    specialties: ['Cardiology', 'Interventional Cardiology', 'Echocardiography'],
    hospitalHistory: [
      { hospitalName: 'National Heart Foundation Hospital', startedAt: '2016-01-01', endedAt: null },
      { hospitalName: 'Bangabandhu Sheikh Mujib Medical University', startedAt: '2010-03-01', endedAt: '2015-12-31' },
      { hospitalName: 'Dhaka Medical College Hospital', startedAt: '2006-06-01', endedAt: '2010-02-28' },
    ],
    degrees: [
      { title: 'MBBS',  institution: 'Dhaka Medical College',                    year: 2004 },
      { title: 'FCPS (Medicine)', institution: 'Bangladesh College of Physicians and Surgeons', year: 2010 },
      { title: 'MD (Cardiology)', institution: 'BSMMU',                           year: 2014 },
    ],
    achievements: [
      { title: 'Best Cardiologist Award',       description: 'Awarded by Bangladesh Cardiac Society for clinical excellence.', year: 2021 },
      { title: 'Published in Lancet',           description: 'Co-authored a paper on rural hypertension outcomes.',            year: 2019 },
    ],
  },
  {
    fullName: 'Dr. Tahmina Begum',
    email: 'tahmina.begum@aroggo.com',
    specialization: 'Gynecology',
    licenseNumber: 'BMDC-23456',
    hospitalName: 'Dhaka Medical College Hospital',
    maxDailyVisits: 18,
    avatarUrl: 'https://i.pravatar.cc/300?img=47',
    bio: 'Consultant gynecologist focused on PCOS, high-risk pregnancy, and minimally invasive gynecological surgery.',
    specialties: ['Gynecology', 'Obstetrics', 'Reproductive Endocrinology'],
    hospitalHistory: [
      { hospitalName: 'Dhaka Medical College Hospital', startedAt: '2015-07-01', endedAt: null },
      { hospitalName: 'Sir Salimullah Medical College and Mitford Hospital', startedAt: '2009-01-15', endedAt: '2015-06-30' },
    ],
    degrees: [
      { title: 'MBBS',               institution: 'Sir Salimullah Medical College', year: 2005 },
      { title: 'FCPS (Gynae & Obs)', institution: 'BCPS',                            year: 2012 },
    ],
    achievements: [
      { title: 'Women in Medicine Award', description: 'Recognized for contribution to maternal health in underserved areas.', year: 2022 },
    ],
  },
  {
    fullName: 'Dr. Rezaul Karim',
    email: 'rezaul.karim@aroggo.com',
    specialization: 'Neurology',
    licenseNumber: 'BMDC-34567',
    hospitalName: 'Bangabandhu Sheikh Mujib Medical University',
    maxDailyVisits: 15,
    avatarUrl: 'https://i.pravatar.cc/300?img=15',
    bio: 'Neurologist specializing in stroke management, epilepsy, and movement disorders.',
    specialties: ['Neurology', 'Stroke Medicine', 'Epileptology'],
    hospitalHistory: [
      { hospitalName: 'Bangabandhu Sheikh Mujib Medical University', startedAt: '2013-02-01', endedAt: null },
      { hospitalName: 'National Institute of Neurosciences & Hospital', startedAt: '2008-08-01', endedAt: '2013-01-31' },
    ],
    degrees: [
      { title: 'MBBS',            institution: 'Chittagong Medical College', year: 2003 },
      { title: 'MD (Neurology)',  institution: 'BSMMU',                       year: 2011 },
    ],
    achievements: [
      { title: 'Stroke Care Fellowship', description: 'Completed advanced stroke fellowship at AIIMS, New Delhi.', year: 2016 },
    ],
  },
  {
    fullName: 'Dr. Shahnaz Parvin',
    email: 'shahnaz.parvin@aroggo.com',
    specialization: 'Dermatology',
    licenseNumber: 'BMDC-45678',
    hospitalName: 'Shaheed Suhrawardy Medical College Hospital',
    maxDailyVisits: 25,
    avatarUrl: 'https://i.pravatar.cc/300?img=44',
    bio: 'Dermatologist with expertise in clinical dermatology, cosmetic procedures, and pediatric skin disorders.',
    specialties: ['Dermatology', 'Cosmetology', 'Pediatric Dermatology'],
    hospitalHistory: [
      { hospitalName: 'Shaheed Suhrawardy Medical College Hospital', startedAt: '2017-04-01', endedAt: null },
      { hospitalName: 'Dhaka Medical College Hospital', startedAt: '2012-09-01', endedAt: '2017-03-31' },
    ],
    degrees: [
      { title: 'MBBS',           institution: 'Rajshahi Medical College', year: 2007 },
      { title: 'DDV',            institution: 'BSMMU',                     year: 2013 },
    ],
    achievements: [
      { title: 'IADVL Young Achiever', description: 'Awarded by the Indian Association of Dermatologists.', year: 2020 },
    ],
  },
  {
    fullName: 'Dr. Mahmudur Rahman',
    email: 'mahmudur.rahman@aroggo.com',
    specialization: 'Orthopedics',
    licenseNumber: 'BMDC-56789',
    hospitalName: 'National Institute of Traumatology and Orthopaedic Rehabilitation',
    maxDailyVisits: 16,
    avatarUrl: 'https://i.pravatar.cc/300?img=33',
    bio: 'Orthopedic surgeon with a special interest in joint replacement and sports injuries.',
    specialties: ['Orthopedics', 'Joint Replacement', 'Sports Medicine'],
    hospitalHistory: [
      { hospitalName: 'National Institute of Traumatology and Orthopaedic Rehabilitation', startedAt: '2014-10-01', endedAt: null },
      { hospitalName: 'Dhaka Medical College Hospital', startedAt: '2008-02-01', endedAt: '2014-09-30' },
    ],
    degrees: [
      { title: 'MBBS',          institution: 'Mymensingh Medical College', year: 2003 },
      { title: 'MS (Ortho)',    institution: 'BSMMU',                       year: 2011 },
    ],
    achievements: [
      { title: '500+ Knee Replacements', description: 'Lead surgeon for a flagship joint replacement program.', year: 2023 },
    ],
  },
  {
    fullName: 'Dr. Ferdousi Khanam',
    email: 'ferdousi.khanam@aroggo.com',
    specialization: 'Pediatrics',
    licenseNumber: 'BMDC-67890',
    hospitalName: 'Dhaka Shishu Hospital',
    maxDailyVisits: 30,
    avatarUrl: 'https://i.pravatar.cc/300?img=48',
    bio: 'Pediatrician focused on neonatal care, childhood immunization, and developmental disorders.',
    specialties: ['Pediatrics', 'Neonatology', 'Child Development'],
    hospitalHistory: [
      { hospitalName: 'Dhaka Shishu Hospital', startedAt: '2012-05-01', endedAt: null },
      { hospitalName: 'Sir Salimullah Medical College and Mitford Hospital', startedAt: '2006-10-01', endedAt: '2012-04-30' },
    ],
    degrees: [
      { title: 'MBBS',              institution: 'Sylhet MAG Osmani Medical College', year: 2002 },
      { title: 'FCPS (Pediatrics)', institution: 'BCPS',                                year: 2010 },
    ],
    achievements: [
      { title: 'UNICEF Appreciation', description: 'For leading an immunization drive in Cox’s Bazar.', year: 2019 },
    ],
  },
  {
    fullName: 'Dr. Abdus Salam',
    email: 'abdus.salam@aroggo.com',
    specialization: 'General Medicine',
    licenseNumber: 'BMDC-78901',
    hospitalName: 'Sir Salimullah Medical College and Mitford Hospital',
    maxDailyVisits: 35,
    avatarUrl: 'https://i.pravatar.cc/300?img=52',
    bio: 'Internal medicine consultant with experience managing diabetes, hypertension, and infectious diseases.',
    specialties: ['General Medicine', 'Diabetology', 'Infectious Diseases'],
    hospitalHistory: [
      { hospitalName: 'Sir Salimullah Medical College and Mitford Hospital', startedAt: '2011-11-01', endedAt: null },
      { hospitalName: 'Rajshahi Medical College Hospital', startedAt: '2005-07-01', endedAt: '2011-10-31' },
    ],
    degrees: [
      { title: 'MBBS',             institution: 'Rajshahi Medical College', year: 2000 },
      { title: 'FCPS (Medicine)',  institution: 'BCPS',                      year: 2009 },
    ],
    achievements: [
      { title: 'COVID-19 Frontline Award', description: 'Recognized by the Ministry of Health for pandemic service.', year: 2021 },
    ],
  },
  {
    fullName: 'Dr. Nasrin Sultana',
    email: 'nasrin.sultana@aroggo.com',
    specialization: 'Ophthalmology',
    licenseNumber: 'BMDC-89012',
    hospitalName: 'National Institute of Ophthalmology',
    maxDailyVisits: 22,
    avatarUrl: 'https://i.pravatar.cc/300?img=49',
    bio: 'Ophthalmologist specialized in cataract surgery, pediatric ophthalmology, and refractive errors.',
    specialties: ['Ophthalmology', 'Cataract Surgery', 'Pediatric Ophthalmology'],
    hospitalHistory: [
      { hospitalName: 'National Institute of Ophthalmology', startedAt: '2015-03-01', endedAt: null },
      { hospitalName: 'Islamia Eye Hospital', startedAt: '2009-06-01', endedAt: '2015-02-28' },
    ],
    degrees: [
      { title: 'MBBS',               institution: 'Chittagong Medical College', year: 2004 },
      { title: 'DO',                 institution: 'BSMMU',                       year: 2010 },
      { title: 'FCPS (Ophthalmology)', institution: 'BCPS',                     year: 2014 },
    ],
    achievements: [
      { title: '10,000+ Cataract Surgeries', description: 'Milestone reached through rural eye-camp outreach.', year: 2023 },
    ],
  },
];

/* ── Patients ────────────────────────────────────────────── */
const PATIENTS = [
  {
    fullName: 'Rahim Uddin',
    email: 'rahim.uddin@gmail.com',
    dateOfBirth: new Date('1985-03-14'),
    gender: 'Male',
    bloodGroup: 'B+',
  },
  {
    fullName: 'Sumaiya Akter',
    email: 'sumaiya.akter@gmail.com',
    dateOfBirth: new Date('1993-07-22'),
    gender: 'Female',
    bloodGroup: 'A+',
  },
  {
    fullName: 'Kamal Hossain',
    email: 'kamal.hossain@gmail.com',
    dateOfBirth: new Date('1978-11-05'),
    gender: 'Male',
    bloodGroup: 'O+',
  },
  {
    fullName: 'Roksana Begum',
    email: 'roksana.begum@gmail.com',
    dateOfBirth: new Date('1990-01-30'),
    gender: 'Female',
    bloodGroup: 'AB+',
  },
  {
    fullName: 'Mizanur Rahman',
    email: 'mizanur.rahman@gmail.com',
    dateOfBirth: new Date('1970-09-18'),
    gender: 'Male',
    bloodGroup: 'O-',
  },
  {
    fullName: 'Nusrat Jahan',
    email: 'nusrat.jahan@gmail.com',
    dateOfBirth: new Date('2000-05-10'),
    gender: 'Female',
    bloodGroup: 'B-',
  },
];

/* ── Medicines ───────────────────────────────────────────── */
const MEDICINES = [
  { name: 'Napa 500mg',           manufacturer: 'Beximco Pharma',    description: 'Paracetamol tablet for fever and mild pain.' },
  { name: 'Seclo 20mg',           manufacturer: 'Square Pharma',     description: 'Omeprazole capsule for gastric ulcer and acidity.' },
  { name: 'Amlodipine 5mg',       manufacturer: 'ACI Limited',       description: 'Calcium channel blocker for hypertension.' },
  { name: 'Metformin 500mg',      manufacturer: 'Opsonin Pharma',    description: 'Biguanide for type 2 diabetes management.' },
  { name: 'Atorvastatin 10mg',    manufacturer: 'Renata Limited',    description: 'Statin for lowering LDL cholesterol.' },
  { name: 'Amoxicillin 500mg',    manufacturer: 'Drug International', description: 'Broad-spectrum penicillin antibiotic.' },
  { name: 'Cetirizine 10mg',      manufacturer: 'Aristopharma',      description: 'Antihistamine for allergic rhinitis and urticaria.' },
  { name: 'Losartan 50mg',        manufacturer: 'Healthcare Pharma', description: 'ARB for hypertension and diabetic nephropathy.' },
  { name: 'Pantoprazole 40mg',    manufacturer: 'General Pharma',    description: 'Proton pump inhibitor for GERD treatment.' },
  { name: 'Azithromycin 500mg',   manufacturer: 'Beximco Pharma',    description: 'Macrolide antibiotic for respiratory infections.' },
  { name: 'Insulin Mixtard 30/70',manufacturer: 'Novo Nordisk BD',   description: 'Biphasic insulin for type 1 and type 2 diabetes.' },
  { name: 'Clonazepam 0.5mg',     manufacturer: 'Square Pharma',     description: 'Benzodiazepine for seizures and anxiety disorders.' },
];

/* ── helpers ─────────────────────────────────────────────── */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/* ── main ────────────────────────────────────────────────── */
async function main() {
  console.log('🗑️  Clearing all existing data...');

  // Delete in dependency order
  await prisma.prescriptionMedicine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.healthMetric.deleteMany();
  await prisma.medicalReport.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.appointmentRequest.deleteMany();
  await prisma.doctorPatient.deleteMany();
  await prisma.patientMedicalHistory.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.doctorSpecialty.deleteMany();
  await prisma.doctorHospitalHistory.deleteMany();
  await prisma.doctorDegree.deleteMany();
  await prisma.doctorAchievement.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅  All data cleared.\n');

  const hash = await bcrypt.hash(PASSWORD, 10);

  /* ── Admin ── */
  await prisma.user.create({
    data: { fullName: 'Admin', email: 'admin@aroggo.com', password: hash, role: 'ADMIN' },
  });
  console.log('👤  Admin created: admin@aroggo.com');

  /* ── Medicines ── */
  await prisma.medicine.createMany({ data: MEDICINES });
  const medicines = await prisma.medicine.findMany();
  console.log(`💊  ${medicines.length} medicines created.`);

  /* ── Doctors ── */
  const doctorRecords = [];
  for (const d of DOCTORS) {
    const user = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email: d.email,
        password: hash,
        role: 'DOCTOR',
        avatarUrl: d.avatarUrl,
        doctor: {
          create: {
            specialization: d.specialization,
            licenseNumber: d.licenseNumber,
            hospitalName: d.hospitalName,
            bio: d.bio,
            isApproved: true,
            maxDailyVisits: d.maxDailyVisits,
            specialties: {
              create: d.specialties.map((name) => ({ name })),
            },
            hospitalHistory: {
              create: d.hospitalHistory.map((h) => ({
                hospitalName: h.hospitalName,
                startedAt: new Date(h.startedAt),
                endedAt: h.endedAt ? new Date(h.endedAt) : null,
              })),
            },
            degrees: {
              create: d.degrees.map((g) => ({
                title: g.title,
                institution: g.institution,
                year: g.year,
              })),
            },
            achievements: {
              create: d.achievements.map((a) => ({
                title: a.title,
                description: a.description,
                year: a.year,
              })),
            },
          },
        },
      },
      include: { doctor: true },
    });
    doctorRecords.push(user.doctor);
    console.log(`🩺  Doctor: ${d.fullName} (${d.specialization}) — ${d.email}`);
  }

  /* ── Patients ── */
  const patientRecords = [];
  for (const p of PATIENTS) {
    const user = await prisma.user.create({
      data: {
        fullName: p.fullName,
        email: p.email,
        password: hash,
        role: 'PATIENT',
        patient: {
          create: {
            dateOfBirth: p.dateOfBirth,
            gender: p.gender,
            bloodGroup: p.bloodGroup,
          },
        },
      },
      include: { patient: true },
    });
    patientRecords.push(user.patient);
    console.log(`🧑  Patient: ${p.fullName} — ${p.email}`);
  }

  /* ── Connections ── */
  // Each patient connects to 2–3 doctors
  const connectionPairs = [
    [0, 0], [0, 1], [0, 2],   // Rahim → Dr. Kabir (cardio), Dr. Tahmina (gynec), Dr. Rezaul (neuro)
    [1, 1], [1, 5],            // Sumaiya → Dr. Tahmina, Dr. Ferdousi (peds)
    [2, 0], [2, 4], [2, 6],   // Kamal → Dr. Kabir, Dr. Mahmudur (ortho), Dr. Abdus (general)
    [3, 1], [3, 3],            // Roksana → Dr. Tahmina, Dr. Shahnaz (derm)
    [4, 6], [4, 0],            // Mizanur → Dr. Abdus, Dr. Kabir
    [5, 5], [5, 7],            // Nusrat → Dr. Ferdousi, Dr. Nasrin (ophthal)
  ];

  for (const [pi, di] of connectionPairs) {
    await prisma.doctorPatient.create({
      data: {
        doctorId: doctorRecords[di].id,
        patientId: patientRecords[pi].id,
        status: 'ACCEPTED',
      },
    });
  }
  console.log(`\n🔗  ${connectionPairs.length} doctor-patient connections created.`);

  /* ── Completed appointments + prescriptions + health metrics ── */
  const completedVisits = [
    // Rahim ↔ Dr. Kabir (cardiology)
    {
      doctorIdx: 0, patientIdx: 0,
      cause: 'Chest pain and breathlessness',
      visitDate: daysAgo(30),
      diagnosis: 'Hypertensive Heart Disease',
      symptoms: 'Chest tightness, shortness of breath on exertion, mild ankle swelling',
      notes: 'Start antihypertensive therapy. Low sodium diet advised. Follow up in 4 weeks.',
      medicines: [
        { medName: 'Amlodipine 5mg',    dosage: '5mg',  frequency: 'Once daily',     duration: '3 months', purpose: 'Blood pressure control' },
        { medName: 'Atorvastatin 10mg', dosage: '10mg', frequency: 'Once at night',  duration: '3 months', purpose: 'Cholesterol management' },
      ],
      metrics: [
        { metricType: 'systolic_bp', value: 158, unit: 'mmHg' },
        { metricType: 'diastolic_bp', value: 96, unit: 'mmHg' },
        { metricType: 'cholesterol_total', value: 230, unit: 'mg/dL' },
      ],
    },
    // Rahim ↔ Dr. Kabir (follow-up)
    {
      doctorIdx: 0, patientIdx: 0,
      cause: 'Follow-up for hypertension',
      visitDate: daysAgo(5),
      diagnosis: 'Hypertensive Heart Disease — improving',
      symptoms: 'Reduced chest tightness, no ankle swelling',
      notes: 'BP improving. Continue current medications. Recheck in 1 month.',
      medicines: [
        { medName: 'Amlodipine 5mg',    dosage: '5mg',  frequency: 'Once daily',    duration: '3 months', purpose: 'Blood pressure maintenance' },
        { medName: 'Losartan 50mg',     dosage: '50mg', frequency: 'Once daily',    duration: '3 months', purpose: 'Additional BP control' },
      ],
      metrics: [
        { metricType: 'systolic_bp', value: 138, unit: 'mmHg' },
        { metricType: 'diastolic_bp', value: 86, unit: 'mmHg' },
        { metricType: 'cholesterol_total', value: 198, unit: 'mg/dL' },
      ],
    },
    // Kamal ↔ Dr. Abdus (general medicine)
    {
      doctorIdx: 6, patientIdx: 2,
      cause: 'Persistent fever and fatigue',
      visitDate: daysAgo(14),
      diagnosis: 'Typhoid Fever',
      symptoms: 'High grade fever for 7 days, fatigue, abdominal discomfort, loss of appetite',
      notes: 'Widal test positive. Start ciprofloxacin course. Strict bed rest and oral rehydration.',
      medicines: [
        { medName: 'Azithromycin 500mg', dosage: '500mg', frequency: 'Once daily', duration: '14 days', purpose: 'Treatment of typhoid fever' },
        { medName: 'Napa 500mg',         dosage: '500mg', frequency: 'Three times daily', duration: '5 days', purpose: 'Fever and pain relief' },
        { medName: 'Pantoprazole 40mg',  dosage: '40mg',  frequency: 'Before breakfast', duration: '10 days', purpose: 'Gastric protection' },
      ],
      metrics: [
        { metricType: 'weight', value: 68, unit: 'kg' },
      ],
    },
    // Mizanur ↔ Dr. Kabir (diabetes + heart)
    {
      doctorIdx: 0, patientIdx: 4,
      cause: 'Routine cardiac and diabetic check',
      visitDate: daysAgo(20),
      diagnosis: 'Type 2 Diabetes Mellitus with Dyslipidaemia',
      symptoms: 'Increased thirst, polyuria, blurred vision, fatigue',
      notes: 'HbA1c elevated. Increase metformin dose. Dietary counselling provided.',
      medicines: [
        { medName: 'Metformin 500mg',    dosage: '1000mg', frequency: 'Twice daily with meals', duration: '3 months', purpose: 'Blood glucose control' },
        { medName: 'Atorvastatin 10mg',  dosage: '20mg',   frequency: 'Once at night', duration: '3 months', purpose: 'LDL reduction' },
      ],
      metrics: [
        { metricType: 'blood_glucose',   value: 186, unit: 'mg/dL' },
        { metricType: 'fasting_glucose', value: 148, unit: 'mg/dL' },
        { metricType: 'hba1c',           value: 7.8, unit: '%' },
        { metricType: 'cholesterol_ldl', value: 132, unit: 'mg/dL' },
        { metricType: 'cholesterol_hdl', value: 38,  unit: 'mg/dL' },
        { metricType: 'triglycerides',   value: 195, unit: 'mg/dL' },
        { metricType: 'weight',          value: 82,  unit: 'kg' },
        { metricType: 'bmi',             value: 27.4, unit: '' },
      ],
    },
    // Roksana ↔ Dr. Tahmina (gynecology)
    {
      doctorIdx: 1, patientIdx: 3,
      cause: 'Irregular menstrual cycle',
      visitDate: daysAgo(10),
      diagnosis: 'Polycystic Ovary Syndrome (PCOS)',
      symptoms: 'Irregular periods, mild hirsutism, weight gain',
      notes: 'USG confirmed PCOS. Lifestyle modification and low GI diet recommended.',
      medicines: [
        { medName: 'Metformin 500mg', dosage: '500mg', frequency: 'Twice daily',     duration: '3 months', purpose: 'Insulin sensitization for PCOS' },
        { medName: 'Cetirizine 10mg', dosage: '10mg',  frequency: 'Once at bedtime', duration: '1 month',  purpose: 'Allergic skin reaction' },
      ],
      metrics: [
        { metricType: 'weight', value: 71, unit: 'kg' },
        { metricType: 'bmi',    value: 26.1, unit: '' },
      ],
    },
    // Nusrat ↔ Dr. Nasrin (ophthalmology)
    {
      doctorIdx: 7, patientIdx: 5,
      cause: 'Blurred vision and eye strain',
      visitDate: daysAgo(7),
      diagnosis: 'Myopia with Astigmatism',
      symptoms: 'Difficulty reading distant objects, headache, eye strain after screen use',
      notes: 'Prescription glasses advised. Screen time limit to 1 hour continuous. Follow up in 6 months.',
      medicines: [
        { medName: 'Napa 500mg', dosage: '500mg', frequency: 'When needed', duration: '7 days', purpose: 'Headache relief' },
      ],
      metrics: [],
    },
  ];

  let visitCount = 0;
  for (const v of completedVisits) {
    const doctor  = doctorRecords[v.doctorIdx];
    const patient = patientRecords[v.patientIdx];

    // Create appointment request (APPROVED)
    const req = await prisma.appointmentRequest.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        cause: v.cause,
        status: 'APPROVED',
      },
    });

    // Create appointment (COMPLETED)
    const appt = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        requestId: req.id,
        cause: v.cause,
        visitDate: v.visitDate,
        serialNumber: visitCount + 1,
        status: 'COMPLETED',
      },
    });

    // Prescription
    const medIds = [];
    for (const m of v.medicines) {
      const med = medicines.find((x) => x.name === m.medName);
      if (med) medIds.push({ ...m, medicineId: med.id });
    }

    await prisma.prescription.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        appointmentId: appt.id,
        symptoms: v.symptoms,
        diagnosis: v.diagnosis,
        notes: v.notes,
        medicines: {
          create: medIds.map(({ medicineId, dosage, frequency, duration, purpose }) => ({
            medicineId, dosage, frequency, duration, purpose,
          })),
        },
      },
    });

    // Health metrics
    for (const metric of v.metrics) {
      await prisma.healthMetric.create({
        data: {
          patientId: patient.id,
          appointmentId: appt.id,
          metricType: metric.metricType,
          value: metric.value,
          unit: metric.unit,
          recordedAt: v.visitDate,
        },
      });
    }

    visitCount++;
  }
  console.log(`📋  ${visitCount} completed appointments with prescriptions created.`);

  /* ── Scheduled (upcoming) appointments ── */
  const scheduledVisits = [
    { doctorIdx: 0, patientIdx: 0, cause: 'Monthly BP follow-up', visitDate: daysFromNow(3),  serial: 1 },
    { doctorIdx: 6, patientIdx: 2, cause: 'Post-typhoid follow-up', visitDate: daysFromNow(5), serial: 1 },
    { doctorIdx: 1, patientIdx: 3, cause: 'PCOS 3-month review', visitDate: daysFromNow(8),   serial: 2 },
    { doctorIdx: 0, patientIdx: 4, cause: 'Diabetes 3-month review', visitDate: daysFromNow(12), serial: 1 },
    { doctorIdx: 5, patientIdx: 5, cause: 'Child wellness check', visitDate: daysFromNow(2),  serial: 3 },
  ];

  for (const v of scheduledVisits) {
    const doctor  = doctorRecords[v.doctorIdx];
    const patient = patientRecords[v.patientIdx];

    const req = await prisma.appointmentRequest.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        cause: v.cause,
        status: 'APPROVED',
      },
    });

    await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        requestId: req.id,
        cause: v.cause,
        visitDate: v.visitDate,
        serialNumber: v.serial,
        status: 'SCHEDULED',
      },
    });
  }
  console.log(`📅  ${scheduledVisits.length} upcoming appointments scheduled.`);

  /* ── Pending connection requests ── */
  await prisma.doctorPatient.create({
    data: { doctorId: doctorRecords[3].id, patientId: patientRecords[1].id, status: 'PENDING' }, // Sumaiya → Dr. Shahnaz (Dermatology)
  });
  await prisma.doctorPatient.create({
    data: { doctorId: doctorRecords[2].id, patientId: patientRecords[2].id, status: 'PENDING' }, // Kamal → Dr. Rezaul (Neurology)
  });
  console.log('⏳  2 pending connection requests added.');

  /* ── Summary ── */
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅  Seed complete! All accounts use password: Pass@1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🔐  Admin:');
  console.log('    admin@aroggo.com');
  console.log('\n🩺  Doctors:');
  DOCTORS.forEach((d) => console.log(`    ${d.email}  (${d.specialization})`));
  console.log('\n🧑  Patients:');
  PATIENTS.forEach((p) => console.log(`    ${p.email}`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error).finally(() => process.exit());
