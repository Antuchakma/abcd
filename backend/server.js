const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const authRoutes = require('./src/routes/auth');
const doctorRoutes = require('./src/routes/doctor');
const patientRoutes = require('./src/routes/patient');
const prescriptionRoutes = require('./src/routes/prescription');
const medicineRoutes = require('./src/routes/medicine');
const reportRoutes = require('./src/routes/report');
const chatRoutes = require('./src/routes/chat');
const connectionRoutes = require('./src/routes/connections');
const appointmentRoutes = require('./src/routes/appointments');
const appointmentRequestRoutes = require('./src/routes/appointment-requests');
const adminRoutes = require('./src/routes/admin');
const healthMetricRoutes = require('./src/routes/health-metrics');
const notificationRoutes = require('./src/routes/notifications');
const paymentRoutes = require('./src/routes/payments');

const path = require('path');
const { init: initSocket } = require('./src/socket');

const app = express();
const httpServer = http.createServer(app);
initSocket(httpServer);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/appointment-requests', appointmentRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/health-metrics', healthMetricRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', message: 'AROGGO API running' }));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`AROGGO backend running on http://localhost:${PORT}`);
});
