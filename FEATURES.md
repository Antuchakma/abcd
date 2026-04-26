# AROGGO — Project Overview & Features

## Overview

**AROGGO** is a mobile health management platform built with React Native (Expo) on the frontend and Node.js/Express on the backend, backed by a PostgreSQL database via Prisma ORM.

The app connects **patients**, **doctors**, and **admins** in a unified healthcare workflow — from booking appointments and writing prescriptions to uploading medical reports with automatic OCR extraction of health metrics.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Frontend | React Native (Expo Router) |
| Backend API | Node.js + Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT (7-day expiry) |
| File Uploads | Multer |
| OCR / PDF Parsing | Tesseract.js + pdfjs-dist |
| HTTP Client | Axios |

---

## User Roles

| Role | Description |
|------|-------------|
| `PATIENT` | Registers directly, manages their own health data |
| `DOCTOR` | Registers and waits for admin approval before logging in |
| `ADMIN` | Approves doctors and monitors the platform |

---

## Implemented Features

### Authentication

- **Register** as a Patient or Doctor with role-specific profile fields
- **Login** with email and password, returns a JWT token
- **JWT-protected routes** — all API calls attach a Bearer token automatically
- Doctors are **blocked from logging in** until an admin approves their account
- **Auto logout** on token expiry (401 response clears stored token)


---

### Patient Features

#### Dashboard
- View a summary of connected doctors, upcoming appointments, and recent health metrics

#### Doctor Connections
- Send a connection request to a doctor using their Doctor ID
- View all connections with status: `PENDING` or `ACCEPTED`

#### Appointments
- View all appointments created by connected doctors
- Each appointment shows: problem notes, status (OPEN/CLOSED), prescriptions, health metrics, and attached reports
- Upload medical test reports (PDF/JPG/PNG) directly from an appointment

#### Medical Reports
- Upload reports independently (not tied to an appointment)
- System automatically extracts health metrics from uploaded files using OCR
- View all reports with extracted text and linked doctor info

#### Prescriptions
- View all prescriptions written by doctors
- Each prescription lists: diagnosis, notes, and all medicines with dosage, frequency, duration, and purpose

#### Health Metrics
- View all recorded health metrics (blood glucose, blood pressure, cholesterol, hemoglobin, weight, BMI, etc.)
- Metrics are grouped by type and displayed as line charts showing trends over time

#### Medical History
- Add, view, and delete personal medical history entries
- Tracks condition name, details, start/end dates, and whether it is chronic

#### Health Chatbot
- Keyword-based AI health assistant
- Recognises symptoms and responds with possible conditions, recommended specialist types, and self-care tips
- Stores full conversation history

---

### Doctor Features

#### Dashboard
- View profile details: specialization, hospital name, license number
- See total patient and prescription counts
- Display personal Doctor ID to share with patients

#### Patient Connections
- View incoming connection requests from patients
- Accept or reject requests
- View list of all accepted patients

#### Patient Details
- Deep-dive into any connected patient's data:
  - Medical history
  - All prescriptions and medicines
  - Uploaded medical reports
  - Health metric history

#### Appointments
- Create appointments for connected patients with problem notes
- Add prescriptions (diagnosis, notes, medicines) to an appointment
- Record health metrics (e.g. blood pressure reading) during an appointment
- Close appointments when consultation is complete
- View all appointment history with full details

#### Medicine Database
- Search existing medicines by name when writing prescriptions
- Create new medicine entries (name, manufacturer, description)

---

### Admin Features

#### Dashboard
- System-wide statistics: total users, total patients, total doctors, pending approvals

#### Doctor Approval Management
- View all registered doctors with their details (name, email, specialization, license number, Doctor ID)
- Approve pending doctors to grant login access
- Revoke approval from previously approved doctors

---

## Data Models

| Model | Description |
|-------|-------------|
| `User` | Base account with role (PATIENT / DOCTOR / ADMIN) |
| `Patient` | Patient profile: date of birth, gender, blood group |
| `Doctor` | Doctor profile: specialization, license, hospital, approval status |
| `DoctorPatient` | Connection between a doctor and patient (PENDING / ACCEPTED) |
| `Appointment` | Appointment record with problem notes and status (OPEN / CLOSED) |
| `Prescription` | Prescription linked to doctor, patient, and optional appointment |
| `PrescriptionMedicine` | Individual medicine on a prescription with dosage and schedule |
| `Medicine` | Medicine catalogue (name, manufacturer, description) |
| `MedicalReport` | Uploaded file with extracted OCR text, linked to patient and optional doctor/appointment |
| `PatientMedicalHistory` | Past and chronic conditions for a patient |
| `ChatMessage` | Chat history between a patient and the health chatbot |
| `HealthMetric` | Individual health measurement (type, value, unit, recorded timestamp) |

---

## API Endpoints Summary

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Register, login, get current user |
| `/api/patient` | Patient profile and medical history |
| `/api/doctor` | Doctor profile and patient management |
| `/api/connections` | Doctor-patient connection requests |
| `/api/appointments` | Appointment creation and management |
| `/api/prescriptions` | Prescription creation and retrieval |
| `/api/medicines` | Medicine search and creation |
| `/api/reports` | Report upload (OCR) and retrieval |
| `/api/health-metrics` | Health metric recording and retrieval |
| `/api/chat` | Health chatbot messages |
| `/api/admin` | Admin dashboard stats and doctor approval |

---

## Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/aroggo_db"
JWT_SECRET="your_secret_key_here"
PORT=5000
```

For the frontend, create `frontend/.env`:

```env
EXPO_PUBLIC_API_URL=http://<your-machine-ip>:5000
```

---

## Getting Started

### Backend
```bash
cd backend
npm install
npm run prisma:generate   # generates Prisma client
npm run prisma:migrate    # runs database migrations
npm run dev               # starts server with nodemon
```

### Frontend
```bash
cd frontend
npm install
npx expo start
```
