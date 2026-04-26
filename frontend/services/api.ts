import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set EXPO_PUBLIC_API_URL in your .env file, e.g.:
// EXPO_PUBLIC_API_URL=http://192.168.1.10:5000
// For Android emulator use: http://10.0.2.2:5000
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.240.249.103:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('aroggo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses by clearing stored token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('aroggo_token');
    }
    return Promise.reject(error);
  }
);

/* ─────────────── Payments API ─────────────── */
export type PaymentMethodType = 'BKASH' | 'ROCKET' | 'NAGAD' | 'CASH';
export type PaymentStatus = 'PENDING' | 'AWAITING_CONFIRMATION' | 'PAID' | 'WAIVED';

export interface DoctorPaymentMethod {
  id: number;
  doctorId: number;
  type: PaymentMethodType;
  number: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Payment {
  id: number;
  appointmentId: number;
  doctorId: number;
  patientId: number;
  amount: number;
  status: PaymentStatus;
  selectedMethodType: PaymentMethodType | null;
  selectedMethodNumber: string | null;
  patientTxnId: string | null;
  receiptNumber: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  waivedAt: string | null;
  createdAt: string;
}

export const paymentsApi = {
  // Doctor methods
  listMethods: () => api.get<DoctorPaymentMethod[]>('/api/payments/methods').then((r) => r.data),
  addMethod: (body: { type: PaymentMethodType; number: string; label?: string }) =>
    api.post<DoctorPaymentMethod>('/api/payments/methods', body).then((r) => r.data),
  updateMethod: (id: number, body: { isActive?: boolean; label?: string }) =>
    api.patch<DoctorPaymentMethod>(`/api/payments/methods/${id}`, body).then((r) => r.data),
  deleteMethod: (id: number) => api.delete(`/api/payments/methods/${id}`).then((r) => r.data),

  // Per-appointment
  createForVisit: (visitId: number, amount: number) =>
    api.post<Payment>(`/api/payments/appointments/${visitId}`, { amount }).then((r) => r.data),
  getForVisit: (visitId: number) =>
    api.get<{
      visitId: number;
      visitDate: string;
      doctor: { id: number; fullName: string };
      patient: { id: number; fullName: string };
      payment: Payment | null;
      methods: DoctorPaymentMethod[];
    }>(`/api/payments/appointments/${visitId}`).then((r) => r.data),
  submit: (
    visitId: number,
    body: { methodType: PaymentMethodType; methodNumber?: string; patientTxnId?: string }
  ) => api.patch<Payment>(`/api/payments/appointments/${visitId}/submit`, body).then((r) => r.data),
  confirm: (visitId: number) =>
    api.patch<Payment>(`/api/payments/appointments/${visitId}/confirm`).then((r) => r.data),
  markCashPaid: (visitId: number) =>
    api.patch<Payment>(`/api/payments/appointments/${visitId}/mark-cash-paid`).then((r) => r.data),
  waive: (visitId: number) =>
    api.patch<Payment>(`/api/payments/appointments/${visitId}/waive`).then((r) => r.data),
  receipt: (visitId: number) =>
    api.get(`/api/payments/appointments/${visitId}/receipt`).then((r) => r.data),

  // Listings
  mine: () =>
    api
      .get<(Payment & { appointment: { id: number; visitDate: string; doctor: { user: { fullName: string } } } })[]>(
        '/api/payments/mine'
      )
      .then((r) => r.data),
  incoming: () =>
    api
      .get<(Payment & { appointment: { id: number; visitDate: string; patient: { user: { fullName: string } } } })[]>(
        '/api/payments/incoming'
      )
      .then((r) => r.data),
};

export default api;
