import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Alert, Modal, TextInput, Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import api, { API_BASE_URL, paymentsApi, PaymentMethodType } from '@/services/api';
import type { DoctorPaymentMethod, Payment } from '@/services/api';
import { useSocket } from '@/context/SocketContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#F4F7FE',
    card:         isDark ? '#1E293B' : '#FFFFFF',
    primary:      '#4E8EE8',
    primaryLight: isDark ? '#1E3A5F' : '#EBF3FF',
    primaryPale:  isDark ? '#1A2E4A' : '#F5F8FF',
    text:         isDark ? '#F1F5F9' : '#1C2B3A',
    textSec:      isDark ? '#94A3B8' : '#5A6C82',
    textMuted:    isDark ? '#64748B' : '#9AAFC2',
    border:       isDark ? '#334155' : '#DDE9FF',
    green:        '#2ECC9B',
    greenLight:   isDark ? '#0D2E22' : '#E8FAF3',
    amber:        '#F5A435',
    amberLight:   isDark ? '#2E1F07' : '#FFF5E5',
    red:          '#E85A6A',
    redLight:     isDark ? '#3D1219' : '#FEECEE',
    purpleLight:  isDark ? '#2D1F4E' : '#F0EDFF',
    cancelBg:     isDark ? '#334155' : '#F1F5F9',
    prescBoxBg:   isDark ? '#1A2E4A' : '#EEF8FF',
    noPrescBg:    isDark ? '#1E293B' : '#F8FAFC',
    uploadClosedBg: isDark ? '#1E293B' : '#F8FAFC',
    overlayBg:    'rgba(15,25,45,0.5)',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    tabBar:       { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    tabBtn:       { flex: 1, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
    tabBtnActive: { borderBottomWidth: 2.5, borderBottomColor: C.primary },
    tabText:      { fontSize: 14, fontWeight: '600', color: C.textMuted },
    tabTextActive:{ color: C.primary, fontWeight: '700' },
    tabBadge:     { backgroundColor: C.primary, borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },

    list:         { flex: 1 },
    listContent:  { padding: 16, paddingBottom: 100 },
    sectionHeader:{ fontSize: 11, fontWeight: '800', color: C.textMuted, marginBottom: 10, marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.8 },

    empty:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    emptyText:    { fontSize: 16, fontWeight: '700', color: C.text },
    emptySub:     { fontSize: 13, color: C.textMuted, marginTop: 4 },

    card:         { backgroundColor: C.card, borderRadius: 18, marginBottom: 12, flexDirection: 'row', shadowColor: C.primary, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
    cardOngoing:  { shadowColor: C.green, shadowOpacity: 0.12 },
    cardLeft:     {},
    cardAccent:   { width: 4, flex: 1 },
    cardBody:     { flex: 1, padding: 16 },
    cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardTitle:    { fontSize: 15, fontWeight: '800', color: C.text },
    cardSpec:     { fontSize: 12, color: C.primary, marginTop: 2, fontWeight: '600' },
    cardCause:    { fontSize: 13, color: C.textSec, marginBottom: 8, lineHeight: 19 },
    cardDateRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardDate:     { fontSize: 12, color: C.textMuted },
    serialBadgeSmall:     { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    serialBadgeSmallText: { fontSize: 11, fontWeight: '700', color: C.primary },

    fab: {
      position: 'absolute', bottom: 24, right: 24,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: C.primary,
      justifyContent: 'center', alignItems: 'center',
      shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    },

    overlay:      { flex: 1, backgroundColor: C.overlayBg, justifyContent: 'flex-end' },
    sheet:        { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingTop: 12 },
    dragHandle:   { width: 38, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
    sheetTitle:   { fontSize: 19, fontWeight: '800', color: C.text, marginBottom: 18, letterSpacing: -0.3 },
    inputLabel:   { fontSize: 13, fontWeight: '600', color: C.textSec, marginBottom: 7 },
    input:        { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, color: C.text, marginBottom: 16, backgroundColor: C.primaryPale },
    inputMulti:   { height: 84, textAlignVertical: 'top' },
    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn:    { flex: 1, backgroundColor: C.cancelBg, borderRadius: 12, padding: 14, alignItems: 'center' },
    cancelText:   { fontWeight: '700', color: C.textSec, fontSize: 14 },
    submitBtn:    { flex: 1, backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
    submitText:   { fontWeight: '700', color: '#fff', fontSize: 14 },
    cameraActionBtn: { marginTop: 10, backgroundColor: C.primaryLight, borderRadius: 12, padding: 14, alignItems: 'center' },
    cameraActionText: { fontWeight: '700', color: C.primary, fontSize: 14 },
    noDoctorsText:{ fontSize: 13, color: C.textMuted, marginBottom: 14 },
    doctorChip:       { backgroundColor: C.primaryPale, borderRadius: 12, padding: 12, marginRight: 10, minWidth: 130, borderWidth: 1.5, borderColor: C.border },
    doctorChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    doctorChipName:   { fontSize: 13, fontWeight: '700', color: C.text },
    doctorChipSpec:   { fontSize: 11, color: C.textSec, marginTop: 2 },

    detailHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
    detailDoctorSub: { fontSize: 14, color: C.primary, fontWeight: '600', marginTop: 2 },
    serialBadge:     { backgroundColor: C.primaryLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
    serialBadgeText: { fontSize: 15, fontWeight: '800', color: C.primary },
    visitMetaRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    visitMetaLeft:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
    visitMetaText:   { fontSize: 12, color: C.textSec },
    visitMetaDot:    { color: C.textMuted, fontSize: 12 },
    sectionBlock:    { marginBottom: 16 },
    sectionLabel:    { fontSize: 12, fontWeight: '800', color: C.textSec, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    bodyText:        { fontSize: 14, color: C.textSec, lineHeight: 20 },
    prescBox:        { backgroundColor: C.prescBoxBg, borderRadius: 14, padding: 14 },
    prescSymptoms:   { fontSize: 13, color: C.green, marginBottom: 5, fontWeight: '600' },
    prescDiagnosis:  { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 5 },
    prescNotes:      { fontSize: 13, color: C.textSec, marginBottom: 8 },
    medRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.card, borderRadius: 10, padding: 10, marginBottom: 7 },
    medDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginTop: 5 },
    medName:         { fontSize: 14, fontWeight: '700', color: C.text },
    medDetail:       { fontSize: 12, color: C.textSec, marginTop: 2 },
    medPurpose:      { fontSize: 12, color: C.primary, marginTop: 2 },
    noPrescBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.noPrescBg, borderRadius: 12, padding: 14, marginBottom: 14 },
    noPrescText:     { fontSize: 13, color: C.textMuted },
    metricRow:       { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.primaryPale, borderRadius: 10, padding: 12, marginBottom: 6 },
    metricType:      { fontSize: 13, fontWeight: '600', color: C.text, textTransform: 'capitalize' },
    metricValue:     { fontSize: 13, fontWeight: '800', color: C.primary },
    reportRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryPale, borderRadius: 10, padding: 12, marginBottom: 6 },
    reportIconBox:   { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    reportType:      { fontSize: 13, fontWeight: '700', color: C.text },
    reportDate:      { fontSize: 11, color: C.textMuted, marginTop: 2 },
    ocrBadge:        { backgroundColor: C.purpleLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    ocrText:         { fontSize: 10, fontWeight: '700', color: '#8B75E8' },
    uploadBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, backgroundColor: C.primaryLight, borderRadius: 12, padding: 13, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed' },
    uploadBtnText:   { fontSize: 14, fontWeight: '600', color: C.primary },
    uploadClosedBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: C.uploadClosedBg, borderRadius: 12, padding: 12 },
    uploadClosedText:{ fontSize: 12, color: C.textMuted, fontStyle: 'italic' },
    closeBtn:        { marginTop: 14, backgroundColor: C.cancelBg, borderRadius: 12, padding: 14, alignItems: 'center' },
    closeBtnText:    { fontWeight: '700', color: C.textSec, fontSize: 14 },
    paymentCard:     { backgroundColor: C.primaryPale, borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 10 },
    paymentTitle:    { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: 4 },
    paymentHelp:     { fontSize: 12, color: C.textSec, marginTop: 2 },
    methodCard:      { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, marginTop: 8, backgroundColor: C.card },
    methodName:      { fontSize: 12, fontWeight: '800', color: C.primary },
    methodNumber:    { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 2 },
    paymentSubmitBtn:{ backgroundColor: C.green, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
    paymentSubmitTxt:{ color: '#fff', fontWeight: '800', fontSize: 13 },
    successPill:     { backgroundColor: C.greenLight, borderRadius: 8, padding: 10, marginTop: 8 },
    successText:     { color: C.green, fontWeight: '700', fontSize: 12 },
  });
}

type RequestStatus     = 'PENDING' | 'APPROVED' | 'REJECTED';
type AppointmentStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED';

export default function PatientAppointments() {
  const { socket } = useSocket();
  const [tab, setTab] = useState<'pending' | 'today' | 'scheduled' | 'completed'>('pending');
  const [loading, setLoading]           = useState(true);
  const [newReqModal, setNewReqModal]   = useState(false);
  const [doctors, setDoctors]           = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [cause, setCause]               = useState('');
  const [notes, setNotes]               = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [reportTypeModal, setReportTypeModal] = useState<{ apptId: number } | null>(null);
  const [reportType, setReportType]     = useState('Lab Report');
  const [uploading, setUploading]       = useState<number | null>(null);
  const [requests, setRequests]         = useState<any[]>([]);
  const [appts, setAppts]               = useState<any[]>([]);
  const [paymentDetail, setPaymentDetail] = useState<{ payment: Payment | null; methods: DoctorPaymentMethod[] } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<DoctorPaymentMethod | null>(null);
  const [txnId, setTxnId] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      loadAll();
      if (selectedAppt?.id) {
        api.get(`/api/appointments/${selectedAppt.id}`).then((r) => setSelectedAppt(r.data)).catch(() => {});
        loadPaymentForAppointment(selectedAppt.id);
      }
    };
    socket.on('notification', refresh);
    return () => { socket.off('notification', refresh); };
  }, [socket, selectedAppt?.id]);

  async function loadAll() {
    setLoading(true);
    const [reqRes, apptRes] = await Promise.allSettled([
      api.get('/api/appointment-requests'),
      api.get('/api/appointments'),
    ]);
    if (reqRes.status === 'fulfilled')  setRequests(reqRes.value.data);
    if (apptRes.status === 'fulfilled') setAppts(apptRes.value.data);
    setLoading(false);
  }

  async function loadDoctors() {
    try {
      const r        = await api.get('/api/connections');
      const accepted = r.data.filter((c: any) => c.status === 'ACCEPTED');
      setDoctors(accepted.map((c: any) => c.doctor));
    } catch (err) {
      console.error(err);
    }
  }

  async function openReportFile(fileUrl: string) {
    const absoluteUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
    try {
      await Linking.openURL(absoluteUrl);
    } catch {
      Alert.alert('Open Failed', 'Could not open the uploaded report file.');
    }
  }

  async function loadPaymentForAppointment(appointmentId: number) {
    setPaymentLoading(true);
    try {
      const data = await paymentsApi.getForVisit(appointmentId);
      setPaymentDetail({ payment: data.payment, methods: data.methods });
    } catch {
      setPaymentDetail({ payment: null, methods: [] });
    } finally {
      setPaymentLoading(false);
    }
  }

  async function openAppointmentDetail(appt: any) {
    setSelectedAppt(appt);
    setTxnId('');
    setSelectedMethod(null);
    if (appt.status === 'COMPLETED') {
      await loadPaymentForAppointment(appt.id);
    } else {
      setPaymentDetail(null);
    }
  }

  async function submitPaymentDone() {
    if (!selectedAppt || !paymentDetail?.payment || !selectedMethod) {
      Alert.alert('Payment method required', 'Please choose one payment option first.');
      return;
    }
    if (selectedMethod.type !== 'CASH' && !txnId.trim()) {
      Alert.alert('Transaction ID required', 'Please paste the mobile-banking transaction ID.');
      return;
    }

    setPaymentSubmitting(true);
    try {
      await paymentsApi.submit(selectedAppt.id, {
        methodType: selectedMethod.type as PaymentMethodType,
        methodNumber: selectedMethod.type === 'CASH' ? undefined : selectedMethod.number,
        patientTxnId: txnId.trim() || undefined,
      });
      await loadAll();
      await loadPaymentForAppointment(selectedAppt.id);
      Alert.alert('Payment submitted', 'Payment done was sent to the doctor for confirmation.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to submit payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function submitRequest() {
    if (!selectedDoctor) return Alert.alert('Error', 'Please select a doctor.');
    if (!cause.trim())   return Alert.alert('Error', 'Please describe the reason for your appointment.');
    setSubmitting(true);
    try {
      await api.post('/api/appointment-requests', {
        doctorId: selectedDoctor.id,
        cause:    cause.trim(),
        notes:    notes.trim() || undefined,
      });
      setNewReqModal(false);
      setCause(''); setNotes(''); setSelectedDoctor(null);
      loadAll();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to send request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function pickAndUpload(apptId: number, type: string) {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    await uploadReport(apptId, type, {
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType ?? 'application/octet-stream',
    });
  }

  async function captureAndUpload(apptId: number, type: string) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to capture report photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    await uploadReport(apptId, type, {
      uri: asset.uri,
      name: asset.fileName ?? `report-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }

  async function uploadReport(
    apptId: number,
    type: string,
    file: { uri: string; name: string; mimeType: string }
  ) {
    setReportTypeModal(null);
    try {
      setUploading(apptId);

      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as any);
      formData.append('appointmentId', String(apptId));
      formData.append('reportType', type);

      const res = await api.post('/api/reports', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { savedMetrics } = res.data;
      const refreshed = await api.get(`/api/appointments/${apptId}`);
      setSelectedAppt(refreshed.data);
      loadAll();

      if (savedMetrics?.length > 0) {
        Alert.alert(
          'Report Uploaded',
          `Extracted ${savedMetrics.length} health metric${savedMetrics.length > 1 ? 's' : ''}:\n` +
            savedMetrics.map((m: any) => `• ${m.metricType.replace(/_/g, ' ')}: ${m.value} ${m.unit}`).join('\n')
        );
      } else {
        Alert.alert('Report Uploaded', 'Report saved successfully.');
      }
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.response?.data?.error || 'Could not upload the report.');
    } finally {
      setUploading(null);
    }
  }

  const todayKey = new Date().toDateString();
  const upcomingAppts = appts.filter((a) => a.status === 'SCHEDULED' || a.status === 'ONGOING');
  const pendingReqs   = requests.filter((r) => r.status === 'PENDING');
  const todayVisits = upcomingAppts.filter((a) => new Date(a.visitDate).toDateString() === todayKey);
  const scheduledVisits = upcomingAppts.filter((a) => new Date(a.visitDate).toDateString() !== todayKey);
  const previousAppts = appts.filter((a) => a.status === 'COMPLETED');
  const activePayment = paymentDetail?.payment;

  return (
    <View style={styles.root}>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'pending' && styles.tabBtnActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>Pending </Text>
          {pendingReqs.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingReqs.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'today' && styles.tabBtnActive]}
          onPress={() => setTab('today')}
        >
          <Text style={[styles.tabText, tab === 'today' && styles.tabTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'scheduled' && styles.tabBtnActive]}
          onPress={() => setTab('scheduled')}
        >
          <Text style={[styles.tabText, tab === 'scheduled' && styles.tabTextActive]}>Scheduled</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'completed' && styles.tabBtnActive]}
          onPress={() => setTab('completed')}
        >
          <Text style={[styles.tabText, tab === 'completed' && styles.tabTextActive]}>Completed</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={C.primary} />
      ) : (
        <>
          {/* ── Pending Approval Tab ── */}
          {tab === 'pending' && (
            <View style={{ flex: 1 }}>
              {pendingReqs.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="calendar-outline" size={36} color={C.primary} />
                  </View>
                  <Text style={styles.emptyText}>No pending approvals</Text>
                  <Text style={styles.emptySub}>Tap + to request a new appointment</Text>
                </View>
              ) : (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                  {pendingReqs.map((r) => (
                    <RequestCard key={r.id} req={r} />
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.fab}
                onPress={() => { loadDoctors(); setNewReqModal(true); }}
              >
                <Ionicons name="add" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Todays Visits Tab ── */}
          {tab === 'today' && (
            <View style={{ flex: 1 }}>
              {todayVisits.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="sunny-outline" size={36} color={C.textMuted} />
                  </View>
                  <Text style={styles.emptyText}>No todays visits</Text>
                  <Text style={styles.emptySub}>Today visits will appear here</Text>
                </View>
              ) : (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                  {todayVisits.map((a) => (
                    <ApptCard key={`today-${a.id}`} appt={a} onPress={() => openAppointmentDetail(a)} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── Scheduled Visits Tab ── */}
          {tab === 'scheduled' && (
            <View style={{ flex: 1 }}>
              {scheduledVisits.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="calendar-outline" size={36} color={C.textMuted} />
                  </View>
                  <Text style={styles.emptyText}>No scheduled visits</Text>
                  <Text style={styles.emptySub}>Upcoming visits will appear here</Text>
                </View>
              ) : (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                  {scheduledVisits.map((a) => (
                    <ApptCard key={`scheduled-${a.id}`} appt={a} onPress={() => openAppointmentDetail(a)} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* ── Completed Visits Tab ── */}
          {tab === 'completed' && (
            <View style={{ flex: 1 }}>
              {previousAppts.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIconBox}>
                    <Ionicons name="checkmark-done-outline" size={36} color={C.textMuted} />
                  </View>
                  <Text style={styles.emptyText}>No completed visits</Text>
                  <Text style={styles.emptySub}>Completed appointments will appear here</Text>
                </View>
              ) : (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                  {previousAppts.map((a) => (
                    <ApptCard key={a.id} appt={a} onPress={() => openAppointmentDetail(a)} />
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </>
      )}

      {/* ── New Request Modal ── */}
      <Modal visible={newReqModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>Request Appointment</Text>

            <Text style={styles.inputLabel}>Select Doctor</Text>
            {doctors.length === 0 ? (
              <Text style={styles.noDoctorsText}>No connected doctors. Connect with a doctor first.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {doctors.map((doc: any) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={[styles.doctorChip, selectedDoctor?.id === doc.id && styles.doctorChipActive]}
                    onPress={() => setSelectedDoctor(doc)}
                  >
                    <Text style={[styles.doctorChipName, selectedDoctor?.id === doc.id && { color: '#fff' }]}>
                      Dr. {doc.user?.fullName}
                    </Text>
                    <Text style={[styles.doctorChipSpec, selectedDoctor?.id === doc.id && { color: '#BBDEFB' }]}>
                      {doc.specialization}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.inputLabel}>Reason for Appointment *</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={cause}
              onChangeText={setCause}
              placeholder="Describe your symptoms or reason..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Additional Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any other information..."
              placeholderTextColor={C.textMuted}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setNewReqModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={submitRequest}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.submitText}>Send Request</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Appointment Detail Modal ── */}
      <Modal visible={!!selectedAppt} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { maxHeight: '92%' }]}>
            <View style={styles.dragHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedAppt && (
                <>
                  <View style={styles.detailHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sheetTitle}>Appointment Detail</Text>
                      <Text style={styles.detailDoctorSub}>Dr. {selectedAppt.doctor?.user?.fullName}</Text>
                    </View>
                    <View style={styles.serialBadge}>
                      <Text style={styles.serialBadgeText}>#{selectedAppt.serialNumber}</Text>
                    </View>
                  </View>

                  <View style={styles.visitMetaRow}>
                    <View style={styles.visitMetaLeft}>
                      <Ionicons name="calendar-outline" size={13} color={C.textSec} />
                      <Text style={styles.visitMetaText}>
                        {new Date(selectedAppt.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </Text>
                      <Text style={styles.visitMetaDot}>·</Text>
                      <Text style={styles.visitMetaText}>{selectedAppt.doctor?.specialization}</Text>
                    </View>
                    <StatusBadge status={selectedAppt.status} />
                  </View>

                  {selectedAppt.cause ? (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionLabel}>Reason</Text>
                      <Text style={styles.bodyText}>{selectedAppt.cause}</Text>
                    </View>
                  ) : null}

                  {selectedAppt.prescription ? (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionLabel}>Prescription</Text>
                      <View style={styles.prescBox}>
                        {selectedAppt.prescription.symptoms ? (
                          <Text style={styles.prescSymptoms}>Symptoms: {selectedAppt.prescription.symptoms}</Text>
                        ) : null}
                        <Text style={styles.prescDiagnosis}>{selectedAppt.prescription.diagnosis}</Text>
                        {selectedAppt.prescription.notes ? (
                          <Text style={styles.prescNotes}>{selectedAppt.prescription.notes}</Text>
                        ) : null}
                        {selectedAppt.prescription.medicines?.map((m: any) => (
                          <View key={m.id} style={styles.medRow}>
                            <View style={styles.medDot} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.medName}>{m.medicine?.name}</Text>
                              <Text style={styles.medDetail}>{m.dosage} · {m.frequency} · {m.duration}</Text>
                              {m.purpose ? <Text style={styles.medPurpose}>For: {m.purpose}</Text> : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noPrescBox}>
                      <Ionicons name="document-text-outline" size={18} color={C.textMuted} />
                      <Text style={styles.noPrescText}>No prescription issued yet</Text>
                    </View>
                  )}

                  {selectedAppt.healthMetrics?.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionLabel}>Health Metrics</Text>
                      {selectedAppt.healthMetrics.map((m: any) => (
                        <View key={m.id} style={styles.metricRow}>
                          <Text style={styles.metricType}>{m.metricType.replace(/_/g, ' ')}</Text>
                          <Text style={styles.metricValue}>{m.value} {m.unit}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedAppt.reports?.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionLabel}>Uploaded Reports</Text>
                      {selectedAppt.reports.map((r: any) => (
                        <TouchableOpacity key={r.id} style={styles.reportRow} onPress={() => openReportFile(r.fileUrl)}>
                          <View style={styles.reportIconBox}>
                            <Ionicons name="document-outline" size={16} color={C.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reportType}>{r.reportType}</Text>
                            <Text style={styles.reportDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                          </View>
                          {r.extractedText && (
                            <View style={styles.ocrBadge}><Text style={styles.ocrText}>OCR</Text></View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {selectedAppt.status === 'COMPLETED' ? (
                    <View>
                      <View style={styles.uploadClosedBox}>
                        <Ionicons name="lock-closed-outline" size={14} color={C.textMuted} />
                        <Text style={styles.uploadClosedText}>Report upload closed — appointment completed</Text>
                      </View>

                      <View style={styles.paymentCard}>
                        <Text style={styles.paymentTitle}>Payment</Text>
                        {paymentLoading ? (
                          <ActivityIndicator size="small" color={C.primary} />
                        ) : !activePayment ? (
                          <Text style={styles.paymentHelp}>No payment requested for this visit.</Text>
                        ) : (
                          <>
                            <Text style={styles.paymentHelp}>Amount: ৳{activePayment.amount}</Text>
                            <Text style={styles.paymentHelp}>Status: {activePayment.status}</Text>

                            {activePayment.status === 'PENDING' && (
                              <>
                                <Text style={[styles.paymentHelp, { marginTop: 8 }]}>Choose payment option:</Text>

                                <TouchableOpacity
                                  style={[styles.methodCard, selectedMethod?.id === -1 && { borderColor: C.green, borderWidth: 2 }]}
                                  onPress={() =>
                                    setSelectedMethod({
                                      id: -1,
                                      doctorId: 0,
                                      type: 'CASH',
                                      number: '',
                                      label: 'Cash',
                                      isActive: true,
                                      createdAt: '',
                                    })
                                  }
                                >
                                  <Text style={styles.methodName}>CASH</Text>
                                  <Text style={styles.paymentHelp}>Pay directly to doctor</Text>
                                </TouchableOpacity>

                                {paymentDetail.methods.map((method) => (
                                  <TouchableOpacity
                                    key={method.id}
                                    style={[styles.methodCard, selectedMethod?.id === method.id && { borderColor: C.primary, borderWidth: 2 }]}
                                    onPress={() => setSelectedMethod(method)}
                                  >
                                    <Text style={styles.methodName}>{method.type}</Text>
                                    <Text style={styles.methodNumber}>{method.number}</Text>
                                    {selectedMethod?.id === method.id && (
                                      <Text style={styles.paymentHelp}>
                                        Send tk {activePayment.amount} to {method.number}
                                      </Text>
                                    )}
                                  </TouchableOpacity>
                                ))}

                                {selectedMethod?.type !== 'CASH' && (
                                  <TextInput
                                    style={styles.input}
                                    value={txnId}
                                    onChangeText={setTxnId}
                                    placeholder="Paste transaction ID"
                                    placeholderTextColor={C.textMuted}
                                  />
                                )}

                                <TouchableOpacity
                                  style={[styles.paymentSubmitBtn, paymentSubmitting && { opacity: 0.7 }]}
                                  onPress={submitPaymentDone}
                                  disabled={paymentSubmitting}
                                >
                                  <Text style={styles.paymentSubmitTxt}>
                                    {paymentSubmitting ? 'Submitting...' : 'Payment Done'}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}

                            {activePayment.status === 'AWAITING_CONFIRMATION' && (
                              <Text style={styles.paymentHelp}>Waiting for doctor to click payment received.</Text>
                            )}

                            {activePayment.status === 'PAID' && (
                              <View style={styles.successPill}>
                                <Text style={styles.successText}>Payment successful. Doctor confirmed receipt.</Text>
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.uploadBtn, uploading === selectedAppt.id && { opacity: 0.5 }]}
                      onPress={() => { setReportType('Lab Report'); setReportTypeModal({ apptId: selectedAppt.id }); }}
                      disabled={uploading === selectedAppt.id}
                    >
                      {uploading === selectedAppt.id ? (
                        <ActivityIndicator size="small" color={C.primary} />
                      ) : (
                        <>
                          <Ionicons name="cloud-upload-outline" size={16} color={C.primary} />
                          <Text style={styles.uploadBtnText}>Upload Test Report</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedAppt(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Report Type Modal ── */}
      <Modal visible={!!reportTypeModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>Upload Medical Report</Text>
            <Text style={styles.inputLabel}>Report Type</Text>
            <TextInput
              style={styles.input}
              value={reportType}
              onChangeText={setReportType}
              placeholder="e.g. Blood Test, X-Ray, Lipid Panel"
              placeholderTextColor={C.textMuted}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setReportTypeModal(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => reportTypeModal && pickAndUpload(reportTypeModal.apptId, reportType)}
              >
                <Text style={styles.submitText}>Choose File</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.cameraActionBtn}
              onPress={() => reportTypeModal && captureAndUpload(reportTypeModal.apptId, reportType)}
            >
              <Text style={styles.cameraActionText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ── sub-components ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const map: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
    SCHEDULED: { bg: C.primaryLight, text: C.primary,   label: 'Scheduled'   },
    ONGOING:   { bg: C.greenLight,   text: C.green,     label: 'In Progress' },
    COMPLETED: { bg: isDark ? '#334155' : '#F1F5F9', text: isDark ? '#94A3B8' : '#64748B', label: 'Completed' },
  };
  const c = map[status] ?? map.SCHEDULED;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{c.label}</Text>
    </View>
  );
}

function RequestBadge({ status }: { status: RequestStatus }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const map: Record<RequestStatus, { bg: string; text: string }> = {
    PENDING:  { bg: C.amberLight, text: C.amber },
    APPROVED: { bg: C.greenLight, text: C.green },
    REJECTED: { bg: C.redLight,   text: C.red   },
  };
  const c = map[status] ?? map.PENDING;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{status}</Text>
    </View>
  );
}

function ApptCard({ appt, onPress }: { appt: any; onPress: () => void }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);
  const isOngoing = appt.status === 'ONGOING';
  return (
    <TouchableOpacity style={[styles.card, isOngoing && styles.cardOngoing]} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.cardLeft}>
        <View style={[styles.cardAccent, { backgroundColor: isOngoing ? C.green : C.primary }]} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Dr. {appt.doctor?.user?.fullName}</Text>
            <Text style={styles.cardSpec}>{appt.doctor?.specialization}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 5 }}>
            <StatusBadge status={appt.status} />
            <View style={styles.serialBadgeSmall}>
              <Text style={styles.serialBadgeSmallText}>#{appt.serialNumber}</Text>
            </View>
          </View>
        </View>
        {appt.cause ? <Text style={styles.cardCause} numberOfLines={2}>{appt.cause}</Text> : null}
        <View style={styles.cardDateRow}>
          <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
          <Text style={styles.cardDate}>
            {new Date(appt.visitDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function RequestCard({ req }: { req: any }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.cardAccent, { backgroundColor: C.amber }]} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Dr. {req.doctor?.user?.fullName}</Text>
            <Text style={styles.cardSpec}>{req.doctor?.specialization}</Text>
          </View>
          <RequestBadge status={req.status} />
        </View>
        {req.cause ? <Text style={styles.cardCause} numberOfLines={2}>{req.cause}</Text> : null}
        <View style={styles.cardDateRow}>
          <Ionicons name="time-outline" size={11} color={C.textMuted} />
          <Text style={styles.cardDate}>Requested {new Date(req.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
    </View>
  );
}
