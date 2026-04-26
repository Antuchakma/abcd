import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert, Platform, Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { API_BASE_URL, paymentsApi } from '@/services/api';
import type { Payment } from '@/services/api';
import { useAppTheme } from '@/context/ThemeContext';
import { useSocket } from '@/context/SocketContext';

type VisitStatus = 'SCHEDULED' | 'ONGOING' | 'COMPLETED';

function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#f8fafc',
    card:         isDark ? '#1E293B' : '#ffffff',
    primary:      '#00BCD4',
    primaryLight: isDark ? '#0D3340' : '#e0f7fa',
    text:         isDark ? '#F1F5F9' : '#1e293b',
    textSec:      isDark ? '#94A3B8' : '#475569',
    textMuted:    isDark ? '#64748B' : '#94a3b8',
    border:       isDark ? '#334155' : '#e2e8f0',
    greenLight:   isDark ? '#0D2E22' : '#d1fae5',
    greenText:    isDark ? '#34d399' : '#065f46',
    amberLight:   isDark ? '#2E1F07' : '#fef3c7',
    amberText:    isDark ? '#fbbf24' : '#92400e',
    redLight:     isDark ? '#3D1219' : '#fee2e2',
    redText:      isDark ? '#f87171' : '#991b1b',
    blueLight:    isDark ? '#1a3a5c' : '#BBDEFB',
    blueText:     isDark ? '#60a5fa' : '#1d4ed8',
    purple:       '#6d28d9',
    purpleLight:  isDark ? '#2D1F4E' : '#ede9fe',
    inputBg:      isDark ? '#1A2535' : '#f8fafc',
    sectionBg:    isDark ? '#1A2535' : '#fafafa',
    cancelBg:     isDark ? '#334155' : '#f1f5f9',
    rxSheetBg:    isDark ? '#0F172A' : '#f8fafc',
    rxActionsBar: isDark ? '#1E293B' : '#ffffff',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    tabBar: { flexDirection: 'row', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    tabBtnActive: { borderBottomWidth: 2, borderBottomColor: C.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
    tabTextActive: { color: C.primary },
    list: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 40 },
    sectionHeader: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.textSec },
    emptySub: { fontSize: 13, color: C.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
    card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardDim: { opacity: 0.7 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: C.text },
    cardSub: { fontSize: 13, color: C.primary, marginTop: 2 },
    causeText: { fontSize: 14, color: C.textSec, marginBottom: 2 },
    notesText: { fontSize: 13, color: C.textMuted, marginBottom: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    pendingBadge: { backgroundColor: C.amberLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    pendingBadgeText: { fontSize: 11, fontWeight: '700', color: C.amberText },
    reqActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    rejectBtn: { flex: 1, backgroundColor: C.redLight, borderRadius: 8, padding: 10, alignItems: 'center' },
    rejectBtnText: { fontSize: 13, fontWeight: '700', color: C.redText },
    approveBtn: { flex: 2, backgroundColor: C.primary, borderRadius: 8, padding: 10, alignItems: 'center' },
    approveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    serialBadge: { backgroundColor: C.primaryLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    serialText: { fontSize: 13, fontWeight: '700', color: C.primary },
    hasPrescText: { fontSize: 12, color: C.primary, fontWeight: '600', marginTop: 4 },
    // modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 14 },
    detailHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    sectionLabel: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 6, marginTop: 10 },
    bodyText: { fontSize: 14, color: C.textSec, lineHeight: 20 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: C.textSec, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 10, fontSize: 14, color: C.text, marginBottom: 12, backgroundColor: C.inputBg },
    inputMulti: { height: 70, textAlignVertical: 'top' },
    hint: { fontSize: 12, color: C.textMuted, marginBottom: 10 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    cancelBtn: { flex: 1, backgroundColor: C.cancelBg, borderRadius: 10, padding: 13, alignItems: 'center' },
    cancelText: { fontWeight: '600', color: C.textSec, fontSize: 14 },
    submitBtn: { flex: 1, backgroundColor: C.primary, borderRadius: 10, padding: 13, alignItems: 'center' },
    submitText: { fontWeight: '700', color: '#fff', fontSize: 14 },
    closeBtn: { marginTop: 12, backgroundColor: C.cancelBg, borderRadius: 10, padding: 13, alignItems: 'center' },
    closeBtnText: { fontWeight: '600', color: C.textSec, fontSize: 14 },
    // action buttons
    startBtn: { backgroundColor: C.blueLight, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
    startBtnText: { fontSize: 14, fontWeight: '700', color: C.blueText },
    completeBtn: { backgroundColor: C.greenLight, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
    completeBtnText: { fontSize: 14, fontWeight: '700', color: C.greenText },
    addBtn: { backgroundColor: C.primaryLight, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: C.border },
    addBtnText: { color: C.primary, fontWeight: '700', fontSize: 14 },
    followupBtn: { backgroundColor: C.blueLight, borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: C.border },
    followupBtnText: { color: C.blueText, fontWeight: '700', fontSize: 14 },
    // prescription
    prescBox: { backgroundColor: C.primaryLight, borderRadius: 10, padding: 12 },
    prescSymptoms: { fontSize: 13, color: C.greenText, marginBottom: 4 },
    prescDiagnosis: { fontSize: 15, fontWeight: '700', color: C.greenText, marginBottom: 4 },
    prescNotes: { fontSize: 13, color: C.greenText, marginBottom: 6 },
    medRow: { backgroundColor: C.card, borderRadius: 8, padding: 8, marginBottom: 6 },
    medName: { fontSize: 14, fontWeight: '700', color: C.text },
    medDetail: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    medPurpose: { fontSize: 12, color: C.blueText, marginTop: 2 },
    noPrescBox: { backgroundColor: C.inputBg, borderRadius: 10, padding: 12, alignItems: 'center', marginVertical: 4 },
    // patient reports
    reportsBox: { gap: 8 },
    reportRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.inputBg, borderRadius: 10, padding: 10, gap: 10 },
    reportIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.purpleLight, justifyContent: 'center', alignItems: 'center' },
    reportIconText: { fontSize: 18 },
    reportType: { fontSize: 13, fontWeight: '700', color: C.text },
    reportDate: { fontSize: 11, color: C.textMuted, marginTop: 1 },
    reportMetrics: { marginTop: 6, gap: 4 },
    reportMetricRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    reportMetricType: { fontSize: 12, fontWeight: '600', color: C.textSec, textTransform: 'capitalize' },
    reportMetricValue: { fontSize: 12, fontWeight: '700', color: C.blueText },
    reportExtracted: { fontSize: 11, color: C.textMuted, marginTop: 4, lineHeight: 16 },
    ocrBadge: { backgroundColor: C.purpleLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
    ocrBadgeText: { fontSize: 10, fontWeight: '700', color: C.purple },
    noPrescText: { fontSize: 13, color: C.textMuted },
    // medicine search
    medDropdown: { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden' },
    medDropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    medDropdownName: { fontSize: 14, fontWeight: '700', color: C.text },
    medDropdownMfr: { fontSize: 12, color: C.textMuted, marginTop: 1 },
    selectedMedBox: { backgroundColor: C.primaryLight, borderRadius: 10, padding: 12, marginBottom: 12 },
    selectedMedName: { fontSize: 14, fontWeight: '700', color: C.greenText, marginBottom: 10 },
    addMedBtn: { backgroundColor: C.primary, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 4 },
    addMedBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    addedMedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderRadius: 8, padding: 10, marginBottom: 6 },
    removeMed: { fontSize: 16, color: '#ef4444', paddingLeft: 8 },
    // metrics
    metricRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.inputBg, borderRadius: 8, padding: 10, marginBottom: 6 },
    metricType: { fontSize: 13, fontWeight: '600', color: C.text, textTransform: 'capitalize' },
    metricValue: { fontSize: 13, fontWeight: '700', color: C.primary },
    // SCHEDULED-only hint
    scheduledOnlyBox: { backgroundColor: C.blueLight, borderRadius: 12, padding: 14, marginTop: 10, alignItems: 'center', gap: 10 },
    scheduledOnlyHint: { fontSize: 13, color: C.textSec, textAlign: 'center', fontStyle: 'italic' },
    // filter row
    filterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 8, paddingRight: 8 },
    filterChips: { paddingHorizontal: 12, gap: 8 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterChipText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
    filterChipTextActive: { color: '#fff' },
    calToggleBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.inputBg, justifyContent: 'center', alignItems: 'center' },
    calToggleBtnActive: { backgroundColor: C.greenLight },
    calToggleText: { fontSize: 16 },
    // calendar
    calBox: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8 },
    calNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
    calNavBtn: { fontSize: 24, fontWeight: '700', color: C.primary, paddingHorizontal: 8 },
    calMonthLabel: { fontSize: 15, fontWeight: '700', color: C.text },
    calDayHeaders: { flexDirection: 'row', paddingHorizontal: 4 },
    calDayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: C.textMuted, paddingVertical: 4 },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 4 },
    calCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
    calCellToday: { borderWidth: 1, borderColor: C.primary, borderRadius: 8 },
    calCellSelected: { backgroundColor: C.primary, borderRadius: 8 },
    calDayText: { fontSize: 13, fontWeight: '600', color: C.text },
    calDayTextSelected: { color: '#fff' },
    calDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.primary, marginTop: 1 },
    calDotSelected: { backgroundColor: '#fff' },
    calDayVisits: { paddingHorizontal: 14, paddingTop: 8 },
    calDayVisitsTitle: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 6 },
    calDayVisitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.inputBg, borderRadius: 8, padding: 8, marginBottom: 6 },
    calDaySerialBadge: { backgroundColor: C.greenLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    calDaySerialText: { fontSize: 12, fontWeight: '700', color: C.primary },
    calDayVisitName: { fontSize: 13, fontWeight: '600', color: C.text, flex: 1 },
  });
}

function makeRxStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.75)', justifyContent: 'flex-end' },
    sheet: { maxHeight: '96%', backgroundColor: C.rxSheetBg, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
    // letterhead — intentional fixed brand colors
    letterhead: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1e3a5f', padding: 16, paddingBottom: 14 },
    clinicName: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 3 },
    doctorName: { fontSize: 13, fontWeight: '700', color: '#90CAF9', marginBottom: 1 },
    doctorMeta: { fontSize: 11, color: '#BBDEFB', lineHeight: 15 },
    rxCircle: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#90CAF9', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    rxCircleText: { fontSize: 19, fontWeight: '800', color: '#fff', fontStyle: 'italic' },
    dividerThick: { height: 3, backgroundColor: '#00BCD4' },
    dividerThin: { height: 1, backgroundColor: C.border, marginHorizontal: 14, marginVertical: 6 },
    // patient row (read-only)
    patientRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4, gap: 10 },
    patientFieldLg: { flex: 2, minWidth: 120 },
    patientFieldSm: { flex: 1, minWidth: 60 },
    fieldLabel: { fontSize: 9, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
    fieldReadOnly: { fontSize: 13, fontWeight: '600', color: C.textSec, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 3 },
    // form rows (editable)
    section: { paddingHorizontal: 14, paddingVertical: 6 },
    formRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    rowLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, width: 36, paddingTop: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
    lineInput: { flex: 1, borderBottomWidth: 1.5, borderBottomColor: C.border, paddingVertical: 6, paddingHorizontal: 4, fontSize: 14, color: C.text, minHeight: 36 },
    // ℞ section
    rxSection: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.sectionBg },
    rxSymbol: { fontSize: 26, fontWeight: '800', color: C.blueText, marginBottom: 6, fontStyle: 'italic' },
    // added medicine entry
    medEntry: { flexDirection: 'row', marginBottom: 10, borderLeftWidth: 3, borderLeftColor: C.primary, paddingLeft: 8 },
    medEntryLeft: { width: 20 },
    medEntryNum: { fontSize: 13, fontWeight: '700', color: C.textMuted, paddingTop: 1 },
    medEntryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    medEntryName: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
    medEntryDosage: { fontSize: 13, fontWeight: '600', color: C.primary },
    removeBtn: { padding: 2 },
    removeBtnText: { fontSize: 14, color: '#ef4444' },
    medEntryDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
    medEntryDetail: { fontSize: 12, color: C.textMuted },
    medEntryDot: { fontSize: 12, color: C.border },
    // add medicine search
    addMedSection: { marginTop: 4, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, backgroundColor: C.card },
    addMedLabel: { fontSize: 11, fontWeight: '700', color: C.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    searchInput: { borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 6, fontSize: 14, color: C.text, marginBottom: 4 },
    dropdown: { backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 6 },
    dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    dropdownName: { fontSize: 14, fontWeight: '700', color: C.text },
    dropdownMfr: { fontSize: 11, color: C.textMuted, marginTop: 1 },
    // pending medicine detail fields
    pendingMedBox: { backgroundColor: C.primaryLight, borderRadius: 8, padding: 10, marginTop: 6 },
    pendingMedName: { fontSize: 14, fontWeight: '700', color: C.greenText, marginBottom: 8 },
    pendingMedFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    pendingMedField: { width: '48%' },
    pendingMedInput: { borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: 4, fontSize: 13, color: C.text },
    confirmMedBtn: { backgroundColor: C.primary, borderRadius: 8, padding: 9, alignItems: 'center' },
    confirmMedText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    // footer
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14 },
    footerHint: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
    signatureArea: { alignItems: 'flex-end' },
    signatureLine: { width: 110, height: 1, backgroundColor: C.text, marginBottom: 3 },
    signatureName: { fontSize: 11, fontWeight: '700', color: C.text },
    signatureSpec: { fontSize: 10, color: C.textMuted },
    // action bar
    actions: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.rxActionsBar },
    cancelBtn: { flex: 1, backgroundColor: C.cancelBg, borderRadius: 10, padding: 13, alignItems: 'center' },
    cancelText: { fontWeight: '600', color: C.textSec, fontSize: 14 },
    saveBtn: { flex: 2, backgroundColor: '#1e3a5f', borderRadius: 10, padding: 13, alignItems: 'center' },
    saveText: { fontWeight: '700', color: '#fff', fontSize: 14 },
  });
}

export default function DoctorAppointments() {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);
  const rx = makeRxStyles(C);

  const [tab, setTab] = useState<'PENDING' | 'TODAY' | 'SCHEDULED' | 'COMPLETED'>('PENDING');

  // Requests
  const [requests, setRequests] = useState<any[]>([]);
  const [reqLoading, setReqLoading] = useState(true);

  // Visits
  const [visits, setVisits] = useState<any[]>([]);
  const [visitLoading, setVisitLoading] = useState(true);

  // Selected visit detail
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [selectedVisitPayment, setSelectedVisitPayment] = useState<Payment | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentActing, setPaymentActing] = useState(false);

  // Complete-visit payment amount
  const [completeModalVisit, setCompleteModalVisit] = useState<any>(null);
  const [completeAmount, setCompleteAmount] = useState('');
  const [completingVisit, setCompletingVisit] = useState(false);

  // Prescription state
  const [prescModal, setPrescModal] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescNotes, setPrescNotes] = useState('');
  const [prescMedicines, setPrescMedicines] = useState<any[]>([]);

  // Medicine search
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<any[]>([]);
  const [medSearching, setMedSearching] = useState(false);
  const [pendingMed, setPendingMed] = useState<any>(null);
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medDuration, setMedDuration] = useState('');
  const [medPurpose, setMedPurpose] = useState('');

  // Metrics state
  const [metricsModal, setMetricsModal] = useState(false);
  const [metricType, setMetricType] = useState('');
  const [metricValue, setMetricValue] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [pendingMetrics, setPendingMetrics] = useState<any[]>([]);

  // Follow-up state
  const [followupModal, setFollowupModal] = useState(false);
  const [followupCause, setFollowupCause] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);

  // Doctor profile for prescription letterhead
  const [doctorProfile, setDoctorProfile] = useState<any>(null);

  // Calendar picker for approving requests
  const [calPickerReqId, setCalPickerReqId] = useState<number | null>(null);
  const [calPickerDate, setCalPickerDate] = useState<Date>(new Date());
  const [showCalPicker, setShowCalPicker] = useState(false);
  const [showDateInput, setShowDateInput] = useState(false);

  // Visit list calendar state
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);
  const { socket } = useSocket();

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
      fetchVisits();
      if (!doctorProfile) {
        api.get('/api/doctor/profile').then((r) => setDoctorProfile(r.data)).catch(() => {});
      }
    }, [])
  );

  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      fetchRequests();
      fetchVisits();
      if (selectedVisit?.id) {
        api.get(`/api/appointments/${selectedVisit.id}`).then((r) => setSelectedVisit(r.data)).catch(() => {});
        loadPaymentForVisit(selectedVisit.id);
      }
    };
    socket.on('notification', refresh);
    return () => {
      socket.off('notification', refresh);
    };
  }, [socket, selectedVisit?.id]);

  useEffect(() => {
    if (selectedVisit?.id && selectedVisit.status === 'COMPLETED') {
      loadPaymentForVisit(selectedVisit.id);
      return;
    }
    setSelectedVisitPayment(null);
  }, [selectedVisit?.id, selectedVisit?.status]);

  async function openReportFile(fileUrl: string) {
    const absoluteUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
    try {
      await Linking.openURL(absoluteUrl);
    } catch {
      Alert.alert('Open Failed', 'Could not open the uploaded report file.');
    }
  }

  async function fetchRequests() {
    try {
      const r = await api.get('/api/appointment-requests');
      setRequests(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setReqLoading(false);
    }
  }

  async function fetchVisits() {
    try {
      const r = await api.get('/api/appointments');
      setVisits(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setVisitLoading(false);
    }
  }

  async function loadPaymentForVisit(visitId: number) {
    setPaymentLoading(true);
    try {
      const paymentDetail = await paymentsApi.getForVisit(visitId);
      setSelectedVisitPayment(paymentDetail.payment);
    } catch {
      setSelectedVisitPayment(null);
    } finally {
      setPaymentLoading(false);
    }
  }

  function openApproveCalendar(id: number) {
    setCalPickerReqId(id);
    setCalPickerDate(new Date());
    setShowCalPicker(true);
    setShowDateInput(true);
  }

  async function confirmApprove() {
    if (!calPickerReqId) return;
    setShowCalPicker(false);
    try {
      await api.patch(`/api/appointment-requests/${calPickerReqId}/approve`, {
        visitDate: calPickerDate.toISOString(),
      });
      setCalPickerReqId(null);
      fetchRequests();
      fetchVisits();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to approve.');
    }
  }

  async function rejectRequest(id: number) {
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/appointment-requests/${id}/reject`);
            fetchRequests();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to reject.');
          }
        },
      },
    ]);
  }

  async function startVisit(id: number) {
    try {
      const r = await api.patch(`/api/appointments/${id}/start`);
      setSelectedVisit(r.data);
      fetchVisits();
      setPrescModal(true);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to start visit.');
    }
  }

  function openCompleteVisitModal(visit: any) {
    setCompleteModalVisit(visit);
    setCompleteAmount('');
  }

  async function submitCompleteVisit() {
    if (!completeModalVisit) return;
    if (!completeAmount.trim()) {
      Alert.alert('Amount required', 'Please enter the visit fee amount. Use 0 to waive.');
      return;
    }
    const parsed = Number(completeAmount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert('Invalid amount', 'Please enter a valid non-negative amount.');
      return;
    }

    setCompletingVisit(true);
    try {
      const r = await api.patch(`/api/appointments/${completeModalVisit.id}/complete`, {
        amount: Math.round(parsed),
      });
      setSelectedVisit(r.data);
      setCompleteModalVisit(null);
      setCompleteAmount('');
      fetchVisits();
      loadPaymentForVisit(r.data.id);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to complete.');
    } finally {
      setCompletingVisit(false);
    }
  }

  async function confirmPaymentReceived(visitId: number) {
    setPaymentActing(true);
    try {
      const updated = await paymentsApi.confirm(visitId);
      setSelectedVisitPayment(updated);
      fetchVisits();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to confirm payment.');
    } finally {
      setPaymentActing(false);
    }
  }

  async function searchMedicines(query: string) {
    setMedSearch(query);
    if (query.length < 2) { setMedResults([]); return; }
    setMedSearching(true);
    try {
      const r = await api.get('/api/medicines', { params: { search: query } });
      setMedResults(r.data.slice(0, 8));
    } catch {
      setMedResults([]);
    } finally {
      setMedSearching(false);
    }
  }

  function selectMedicine(med: any) {
    setPendingMed(med);
    setMedSearch(med.name);
    setMedResults([]);
  }

  function addMedicineToList() {
    if (!pendingMed) return Alert.alert('Error', 'Search and select a medicine first.');
    if (!medDosage.trim() || !medFrequency.trim() || !medDuration.trim()) {
      return Alert.alert('Error', 'Dosage, frequency, and duration are required.');
    }
    setPrescMedicines([...prescMedicines, {
      medicineId: pendingMed.id,
      name: pendingMed.name,
      dosage: medDosage.trim(),
      frequency: medFrequency.trim(),
      duration: medDuration.trim(),
      purpose: medPurpose.trim(),
    }]);
    setPendingMed(null);
    setMedSearch('');
    setMedDosage('');
    setMedFrequency('');
    setMedDuration('');
    setMedPurpose('');
  }

  function removeMedicine(idx: number) {
    setPrescMedicines(prescMedicines.filter((_, i) => i !== idx));
  }

  async function savePrescription() {
    if (!diagnosis.trim()) return Alert.alert('Error', 'Diagnosis is required.');
    try {
      await api.post(`/api/appointments/${selectedVisit.id}/prescription`, {
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim(),
        notes: prescNotes.trim() || undefined,
        medicines: prescMedicines.map(({ name, ...m }) => m),
      });
      setPrescModal(false);
      resetPrescForm();
      const r = await api.get(`/api/appointments/${selectedVisit.id}`);
      setSelectedVisit(r.data);
      fetchVisits();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to save prescription.');
    }
  }

  function resetPrescForm() {
    setSymptoms(''); setDiagnosis(''); setPrescNotes('');
    setPrescMedicines([]); setPendingMed(null); setMedSearch('');
    setMedDosage(''); setMedFrequency(''); setMedDuration(''); setMedPurpose('');
  }

  function addMetricToList() {
    if (!metricType.trim() || !metricValue.trim() || !metricUnit.trim()) {
      return Alert.alert('Error', 'All metric fields are required.');
    }
    setPendingMetrics([...pendingMetrics, { metricType: metricType.trim(), value: Number(metricValue), unit: metricUnit.trim() }]);
    setMetricType(''); setMetricValue(''); setMetricUnit('');
  }

  async function saveMetrics() {
    if (pendingMetrics.length === 0) return Alert.alert('Error', 'Add at least one metric.');
    try {
      await api.post(`/api/appointments/${selectedVisit.id}/metrics`, { metrics: pendingMetrics });
      setMetricsModal(false);
      setPendingMetrics([]);
      const r = await api.get(`/api/appointments/${selectedVisit.id}`);
      setSelectedVisit(r.data);
      fetchVisits();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to save metrics.');
    }
  }

  async function createFollowup() {
    if (!followupCause.trim()) return Alert.alert('Error', 'Cause is required.');
    setFollowupLoading(true);
    try {
      await api.post(`/api/appointments/${selectedVisit.id}/followup`, {
        cause: followupCause.trim(),
        notes: followupNotes.trim() || undefined,
      });
      setFollowupModal(false);
      setFollowupCause(''); setFollowupNotes('');
      Alert.alert('Done', 'Follow-up visit scheduled.');
      fetchVisits();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create follow-up.');
    } finally {
      setFollowupLoading(false);
    }
  }

  const pendingReqs = requests.filter((r) => r.status === 'PENDING');
  const todayKey = calKey(new Date());
  const todayVisits = visits.filter((v) => calKey(new Date(v.visitDate)) === todayKey && v.status !== 'COMPLETED');
  const scheduledVisits = visits.filter((v) => v.status === 'SCHEDULED' && calKey(new Date(v.visitDate)) !== todayKey);
  const completedVisits = visits.filter((v) => v.status === 'COMPLETED');

  function calKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  const visitDaySet = new Set(visits.map((v) => calKey(new Date(v.visitDate))));
  const calVisitsForDay = selectedCalDay ? visits.filter((v) => calKey(new Date(v.visitDate)) === selectedCalDay) : [];
  function buildCalendarDays() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  return (
    <View style={styles.root}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'PENDING' && styles.tabBtnActive]}
          onPress={() => setTab('PENDING')}
        >
          <Text style={[styles.tabText, tab === 'PENDING' && styles.tabTextActive]}>
            Pending {pendingReqs.length > 0 ? ` (${pendingReqs.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'TODAY' && styles.tabBtnActive]}
          onPress={() => setTab('TODAY')}
        >
          <Text style={[styles.tabText, tab === 'TODAY' && styles.tabTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'SCHEDULED' && styles.tabBtnActive]}
          onPress={() => setTab('SCHEDULED')}
        >
          <Text style={[styles.tabText, tab === 'SCHEDULED' && styles.tabTextActive]}>Scheduled</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'COMPLETED' && styles.tabBtnActive]}
          onPress={() => setTab('COMPLETED')}
        >
          <Text style={[styles.tabText, tab === 'COMPLETED' && styles.tabTextActive]}>Completed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {tab === 'PENDING' && (
          reqLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : pendingReqs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No pending approvals</Text>
              <Text style={styles.emptySub}>Patient appointment requests will appear here</Text>
            </View>
          ) : (
            pendingReqs.map((req) => (
              <View key={`pending-${req.id}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{req.patient?.user?.fullName}</Text>
                    <Text style={styles.cardSub}>{new Date(req.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                  </View>
                </View>
                <Text style={styles.causeText}>{req.cause}</Text>
                {req.notes ? <Text style={styles.notesText}>{req.notes}</Text> : null}
                <View style={styles.reqActions}>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(req.id)}>
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => openApproveCalendar(req.id)}>
                    <Text style={styles.approveBtnText}>Approve & Schedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        )}

        {tab === 'TODAY' && (
          visitLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : todayVisits.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No todays visits</Text>
              <Text style={styles.emptySub}>Visits scheduled for today will appear here</Text>
            </View>
          ) : (
            todayVisits.map((v) => <DoctorVisitCard key={`today-${v.id}`} visit={v} onPress={() => setSelectedVisit(v)} />)
          )
        )}

        {tab === 'SCHEDULED' && (
          visitLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : scheduledVisits.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗓️</Text>
              <Text style={styles.emptyText}>No scheduled visits</Text>
              <Text style={styles.emptySub}>Upcoming scheduled visits will appear here</Text>
            </View>
          ) : (
            scheduledVisits.map((v) => <DoctorVisitCard key={`scheduled-${v.id}`} visit={v} onPress={() => setSelectedVisit(v)} />)
          )
        )}

        {tab === 'COMPLETED' && (
          visitLoading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : completedVisits.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No completed visits</Text>
              <Text style={styles.emptySub}>Completed visits will appear here</Text>
            </View>
          ) : (
            completedVisits.map((v) => <DoctorVisitCard key={`completed-${v.id}`} visit={v} onPress={() => setSelectedVisit(v)} />)
          )
        )}
      </ScrollView>

      {/* ─── VISIT DETAIL MODAL ─── */}
      <Modal visible={!!selectedVisit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '92%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedVisit && (
                <>
                  <View style={styles.detailHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>{selectedVisit.patient?.user?.fullName}</Text>
                      <Text style={styles.cardSub}>{new Date(selectedVisit.visitDate).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <VisitStatusBadge status={selectedVisit.status} />
                      <View style={styles.serialBadge}>
                        <Text style={styles.serialText}>#{selectedVisit.serialNumber}</Text>
                      </View>
                    </View>
                  </View>

                  {selectedVisit.cause ? (
                    <>
                      <Text style={styles.sectionLabel}>Reason</Text>
                      <Text style={styles.bodyText}>{selectedVisit.cause}</Text>
                    </>
                  ) : null}

                  {/* ── SCHEDULED: only Start Visit shown ── */}
                  {selectedVisit.status === 'SCHEDULED' && (
                    <View style={styles.scheduledOnlyBox}>
                      <Text style={styles.scheduledOnlyHint}>Start the visit to access prescription and metrics.</Text>
                      <TouchableOpacity style={styles.startBtn} onPress={() => startVisit(selectedVisit.id)}>
                        <Text style={styles.startBtnText}>▶ Start Visit</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* ── ONGOING / COMPLETED: full detail ── */}
                  {selectedVisit.status !== 'SCHEDULED' && (
                    <>
                      {selectedVisit.status === 'ONGOING' && (
                        <TouchableOpacity style={styles.completeBtn} onPress={() => openCompleteVisitModal(selectedVisit)}>
                          <Text style={styles.completeBtnText}>✔ Complete Visit</Text>
                        </TouchableOpacity>
                      )}

                      {selectedVisit.status === 'COMPLETED' && (
                        <>
                          <Text style={styles.sectionLabel}>Payment</Text>
                          {paymentLoading ? (
                            <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 10 }} />
                          ) : !selectedVisitPayment ? (
                            <View style={styles.noPrescBox}>
                              <Text style={styles.noPrescText}>No payment request recorded for this visit.</Text>
                            </View>
                          ) : (
                            <View style={styles.prescBox}>
                              <Text style={styles.prescDiagnosis}>Amount: ৳{selectedVisitPayment.amount}</Text>
                              <Text style={styles.prescNotes}>Status: {selectedVisitPayment.status}</Text>
                              {selectedVisitPayment.selectedMethodType ? (
                                <Text style={styles.prescNotes}>
                                  Method: {selectedVisitPayment.selectedMethodType}
                                  {selectedVisitPayment.selectedMethodNumber ? ` (${selectedVisitPayment.selectedMethodNumber})` : ''}
                                </Text>
                              ) : null}
                              {selectedVisitPayment.patientTxnId ? (
                                <Text style={styles.prescNotes}>Transaction ID: {selectedVisitPayment.patientTxnId}</Text>
                              ) : null}

                              {selectedVisitPayment.status === 'AWAITING_CONFIRMATION' && (
                                <TouchableOpacity
                                  style={[styles.completeBtn, paymentActing && { opacity: 0.6 }]}
                                  disabled={paymentActing}
                                  onPress={() => confirmPaymentReceived(selectedVisit.id)}
                                >
                                  <Text style={styles.completeBtnText}>Payment Received</Text>
                                </TouchableOpacity>
                              )}

                              {selectedVisitPayment.status === 'PENDING' && (
                                <Text style={styles.hint}>Waiting for patient to submit payment details.</Text>
                              )}

                              {selectedVisitPayment.status === 'PAID' && (
                                <Text style={styles.hint}>Payment confirmed successfully.</Text>
                              )}
                            </View>
                          )}
                        </>
                      )}

                      {/* Prescription */}
                      <Text style={styles.sectionLabel}>Prescription</Text>
                      {selectedVisit.prescription ? (
                        <View style={styles.prescBox}>
                          {selectedVisit.prescription.symptoms ? (
                            <Text style={styles.prescSymptoms}>Symptoms: {selectedVisit.prescription.symptoms}</Text>
                          ) : null}
                          <Text style={styles.prescDiagnosis}>{selectedVisit.prescription.diagnosis}</Text>
                          {selectedVisit.prescription.notes ? (
                            <Text style={styles.prescNotes}>{selectedVisit.prescription.notes}</Text>
                          ) : null}
                          {selectedVisit.prescription.medicines?.length > 0 && (
                            <View style={{ marginTop: 8 }}>
                              {selectedVisit.prescription.medicines.map((m: any) => (
                                <View key={m.id} style={styles.medRow}>
                                  <Text style={styles.medName}>{m.medicine?.name}</Text>
                                  <Text style={styles.medDetail}>{m.dosage} · {m.frequency} · {m.duration}</Text>
                                  {m.purpose ? <Text style={styles.medPurpose}>For: {m.purpose}</Text> : null}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ) : selectedVisit.status === 'ONGOING' ? (
                        <TouchableOpacity style={styles.addBtn} onPress={() => setPrescModal(true)}>
                          <Text style={styles.addBtnText}>+ Write Prescription</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.noPrescBox}>
                          <Text style={styles.noPrescText}>No prescription issued</Text>
                        </View>
                      )}

                      {/* Health metrics */}
                      {selectedVisit.healthMetrics?.length > 0 && (
                        <>
                          <Text style={styles.sectionLabel}>Health Metrics</Text>
                          {selectedVisit.healthMetrics.map((m: any) => (
                            <View key={m.id} style={styles.metricRow}>
                              <Text style={styles.metricType}>{m.metricType.replace(/_/g, ' ')}</Text>
                              <Text style={styles.metricValue}>{m.value} {m.unit}</Text>
                            </View>
                          ))}
                        </>
                      )}
                      {selectedVisit.status === 'ONGOING' && (
                        <TouchableOpacity style={styles.addBtn} onPress={() => setMetricsModal(true)}>
                          <Text style={styles.addBtnText}>+ Record Health Metrics</Text>
                        </TouchableOpacity>
                      )}

                      {/* Patient reports */}
                      {selectedVisit.reports?.length > 0 && (
                        <>
                          <Text style={styles.sectionLabel}>Patient Reports</Text>
                          <View style={styles.reportsBox}>
                            {selectedVisit.reports.map((r: any) => (
                              <TouchableOpacity key={r.id} style={styles.reportRow} onPress={() => openReportFile(r.fileUrl)}>
                                <View style={styles.reportIconBox}>
                                  <Text style={styles.reportIconText}>📄</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.reportType}>{r.reportType}</Text>
                                  <Text style={styles.reportDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                                  {r.extractedText && (() => {
                                    try {
                                      const metrics = JSON.parse(r.extractedText);
                                      if (Array.isArray(metrics) && metrics.length > 0) {
                                        return (
                                          <View style={styles.reportMetrics}>
                                            {metrics.map((m: any, i: number) => (
                                              <View key={i} style={styles.reportMetricRow}>
                                                <Text style={styles.reportMetricType}>{m.metricType?.replace(/_/g, ' ')}</Text>
                                                <Text style={styles.reportMetricValue}>{m.value} {m.unit}</Text>
                                              </View>
                                            ))}
                                          </View>
                                        );
                                      }
                                    } catch {}
                                    return r.extractedText ? (
                                      <Text style={styles.reportExtracted} numberOfLines={3}>{r.extractedText}</Text>
                                    ) : null;
                                  })()}
                                </View>
                                <View style={styles.ocrBadge}>
                                  <Text style={styles.ocrBadgeText}>OCR</Text>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}

                      {/* Follow-up */}
                      <TouchableOpacity style={styles.followupBtn} onPress={() => setFollowupModal(true)}>
                        <Text style={styles.followupBtnText}>Schedule Follow-up Visit</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedVisit(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── PRESCRIPTION SHEET FORM MODAL ─── */}
      <Modal visible={prescModal} animationType="slide" transparent>
        <View style={rx.overlay}>
          <View style={rx.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* ── LETTERHEAD ── */}
              <View style={rx.letterhead}>
                <View style={{ flex: 1 }}>
                  <Text style={rx.clinicName}>{doctorProfile?.hospitalName || 'Aroggo Health Clinic'}</Text>
                  <Text style={rx.doctorName}>Dr. {doctorProfile?.user?.fullName}</Text>
                  <Text style={rx.doctorMeta}>{doctorProfile?.specialization}</Text>
                  <Text style={rx.doctorMeta}>Reg. No: {doctorProfile?.licenseNumber}</Text>
                </View>
                <View style={rx.rxCircle}>
                  <Text style={rx.rxCircleText}>Rx</Text>
                </View>
              </View>
              <View style={rx.dividerThick} />

              {/* ── PATIENT ROW (read-only) ── */}
              {selectedVisit && (() => {
                const dob = selectedVisit.patient?.dateOfBirth ? new Date(selectedVisit.patient.dateOfBirth) : null;
                const age = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;
                return (
                  <View style={rx.patientRow}>
                    <View style={rx.patientFieldLg}>
                      <Text style={rx.fieldLabel}>Patient Name</Text>
                      <Text style={rx.fieldReadOnly}>{selectedVisit.patient?.user?.fullName || '—'}</Text>
                    </View>
                    {age !== null && (
                      <View style={rx.patientFieldSm}>
                        <Text style={rx.fieldLabel}>Age</Text>
                        <Text style={rx.fieldReadOnly}>{age} yr</Text>
                      </View>
                    )}
                    {selectedVisit.patient?.gender && (
                      <View style={rx.patientFieldSm}>
                        <Text style={rx.fieldLabel}>Sex</Text>
                        <Text style={rx.fieldReadOnly}>{selectedVisit.patient.gender}</Text>
                      </View>
                    )}
                    <View style={rx.patientFieldSm}>
                      <Text style={rx.fieldLabel}>Date</Text>
                      <Text style={rx.fieldReadOnly}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                    </View>
                  </View>
                );
              })()}
              <View style={rx.dividerThin} />

              {/* ── C/O & DIAGNOSIS ── */}
              <View style={rx.section}>
                <View style={rx.formRow}>
                  <Text style={rx.rowLabel}>C/O</Text>
                  <TextInput
                    style={rx.lineInput}
                    value={symptoms}
                    onChangeText={setSymptoms}
                    placeholder="Complaints / symptoms..."
                    placeholderTextColor={C.textMuted}
                    multiline
                  />
                </View>
                <View style={rx.formRow}>
                  <Text style={[rx.rowLabel, { color: C.blueText, fontWeight: '700' }]}>Dx</Text>
                  <TextInput
                    style={[rx.lineInput, { fontWeight: '700' }]}
                    value={diagnosis}
                    onChangeText={setDiagnosis}
                    placeholder="Diagnosis (required)..."
                    placeholderTextColor={C.textMuted}
                    multiline
                  />
                </View>
              </View>
              <View style={rx.dividerThin} />

              {/* ── ℞ MEDICINES ── */}
              <View style={rx.rxSection}>
                <Text style={rx.rxSymbol}>℞</Text>

                {prescMedicines.map((m, i) => (
                  <View key={i} style={rx.medEntry}>
                    <View style={rx.medEntryLeft}>
                      <Text style={rx.medEntryNum}>{i + 1}.</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={rx.medEntryNameRow}>
                        <Text style={rx.medEntryName}>{m.name}</Text>
                        <Text style={rx.medEntryDosage}>{m.dosage}</Text>
                        <TouchableOpacity onPress={() => removeMedicine(i)} style={rx.removeBtn}>
                          <Text style={rx.removeBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={rx.medEntryDetails}>
                        <Text style={rx.medEntryDetail}>{m.frequency}</Text>
                        <Text style={rx.medEntryDot}>·</Text>
                        <Text style={rx.medEntryDetail}>{m.duration}</Text>
                        {m.purpose ? <><Text style={rx.medEntryDot}>·</Text><Text style={rx.medEntryDetail}>{m.purpose}</Text></> : null}
                      </View>
                    </View>
                  </View>
                ))}

                <View style={rx.addMedSection}>
                  <Text style={rx.addMedLabel}>+ Add Medicine</Text>
                  <TextInput
                    style={rx.searchInput}
                    value={medSearch}
                    onChangeText={searchMedicines}
                    placeholder="Search by medicine name..."
                    placeholderTextColor={C.textMuted}
                  />
                  {medSearching && <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 4 }} />}
                  {medResults.length > 0 && (
                    <View style={rx.dropdown}>
                      {medResults.map((med) => (
                        <TouchableOpacity key={med.id} style={rx.dropdownItem} onPress={() => selectMedicine(med)}>
                          <Text style={rx.dropdownName}>{med.name}</Text>
                          <Text style={rx.dropdownMfr}>{med.manufacturer}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {pendingMed && (
                    <View style={rx.pendingMedBox}>
                      <Text style={rx.pendingMedName}>{pendingMed.name}</Text>
                      <View style={rx.pendingMedFields}>
                        <View style={rx.pendingMedField}>
                          <Text style={rx.fieldLabel}>Dosage</Text>
                          <TextInput style={rx.pendingMedInput} value={medDosage} onChangeText={setMedDosage} placeholder="500mg" placeholderTextColor={C.textMuted} />
                        </View>
                        <View style={rx.pendingMedField}>
                          <Text style={rx.fieldLabel}>Frequency</Text>
                          <TextInput style={rx.pendingMedInput} value={medFrequency} onChangeText={setMedFrequency} placeholder="Twice daily" placeholderTextColor={C.textMuted} />
                        </View>
                        <View style={rx.pendingMedField}>
                          <Text style={rx.fieldLabel}>Duration</Text>
                          <TextInput style={rx.pendingMedInput} value={medDuration} onChangeText={setMedDuration} placeholder="7 days" placeholderTextColor={C.textMuted} />
                        </View>
                        <View style={rx.pendingMedField}>
                          <Text style={rx.fieldLabel}>Purpose</Text>
                          <TextInput style={rx.pendingMedInput} value={medPurpose} onChangeText={setMedPurpose} placeholder="optional" placeholderTextColor={C.textMuted} />
                        </View>
                      </View>
                      <TouchableOpacity style={rx.confirmMedBtn} onPress={addMedicineToList}>
                        <Text style={rx.confirmMedText}>Confirm & Add</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
              <View style={rx.dividerThin} />

              {/* ── NOTES / INSTRUCTIONS ── */}
              <View style={rx.section}>
                <View style={rx.formRow}>
                  <Text style={rx.rowLabel}>Inst.</Text>
                  <TextInput
                    style={[rx.lineInput, { minHeight: 48 }]}
                    value={prescNotes}
                    onChangeText={setPrescNotes}
                    placeholder="Instructions / additional notes..."
                    placeholderTextColor={C.textMuted}
                    multiline
                  />
                </View>
              </View>
              <View style={rx.dividerThin} />

              {/* ── SIGNATURE FOOTER ── */}
              <View style={rx.footer}>
                <Text style={rx.footerHint}>Next visit as directed</Text>
                <View style={rx.signatureArea}>
                  <View style={rx.signatureLine} />
                  <Text style={rx.signatureName}>Dr. {doctorProfile?.user?.fullName}</Text>
                  <Text style={rx.signatureSpec}>{doctorProfile?.specialization}</Text>
                </View>
              </View>

            </ScrollView>

            <View style={rx.actions}>
              <TouchableOpacity style={rx.cancelBtn} onPress={() => { setPrescModal(false); resetPrescForm(); }}>
                <Text style={rx.cancelText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={rx.saveBtn} onPress={savePrescription}>
                <Text style={rx.saveText}>Issue Prescription</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── APPROVE: DATE PICKER MODAL ─── */}
      <Modal visible={showCalPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { paddingBottom: 24 }]}>
            <Text style={styles.modalTitle}>Select Appointment Date</Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
              Choose the date for this appointment.
            </Text>

            {showDateInput ? (
              <DateTimePicker
                value={calPickerDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                minimumDate={new Date()}
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={C.primary}
                onChange={(event, selectedDate) => {
                  if (Platform.OS === 'android') {
                    setShowDateInput(false);
                  }
                  if (event.type === 'set' && selectedDate) {
                    const adjusted = new Date(selectedDate);
                    adjusted.setHours(12, 0, 0, 0);
                    setCalPickerDate(adjusted);
                  }
                }}
              />
            ) : (
              <TouchableOpacity
                onPress={() => setShowDateInput(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.inputBg, borderRadius: 12, padding: 14, marginVertical: 8 }}
              >
                <Text style={{ fontSize: 22 }}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>
                    {calPickerDate.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Tap to change date</Text>
                </View>
                <Text style={{ fontSize: 13, color: C.blueText, fontWeight: '700' }}>Change</Text>
              </TouchableOpacity>
            )}

            <View style={{ marginTop: 8 }}>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setShowCalPicker(false); setCalPickerReqId(null); setShowDateInput(false); }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.approveBtn} onPress={confirmApprove}>
                  <Text style={styles.approveBtnText}>
                    Confirm — {calPickerDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── METRICS MODAL ─── */}
      <Modal visible={metricsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Record Health Metrics</Text>
            <Text style={styles.hint}>Types: blood_pressure, sugar, weight, bmi, cholesterol, hemoglobin...</Text>
            <TextInput style={styles.input} value={metricType} onChangeText={setMetricType} placeholder="Metric type" placeholderTextColor={C.textMuted} autoCapitalize="none" />
            <TextInput style={styles.input} value={metricValue} onChangeText={setMetricValue} placeholder="Value (e.g. 120)" placeholderTextColor={C.textMuted} keyboardType="numeric" />
            <TextInput style={styles.input} value={metricUnit} onChangeText={setMetricUnit} placeholder="Unit (e.g. mg/dL)" placeholderTextColor={C.textMuted} />
            <TouchableOpacity style={styles.addMedBtn} onPress={addMetricToList}>
              <Text style={styles.addMedBtnText}>+ Add to List</Text>
            </TouchableOpacity>
            {pendingMetrics.map((m, i) => (
              <View key={i} style={styles.metricRow}>
                <Text style={styles.metricType}>{m.metricType}</Text>
                <Text style={styles.metricValue}>{m.value} {m.unit}</Text>
              </View>
            ))}
            <View style={[styles.modalActions, { marginTop: 12 }]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setMetricsModal(false); setPendingMetrics([]); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, pendingMetrics.length === 0 && { opacity: 0.5 }]} onPress={saveMetrics} disabled={pendingMetrics.length === 0}>
                <Text style={styles.submitText}>Save All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── COMPLETE VISIT WITH FEE ─── */}
      <Modal visible={!!completeModalVisit} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Complete Visit & Request Payment</Text>
            <Text style={styles.hint}>
              Enter the visit fee amount. Use 0 if this visit is free.
            </Text>
            <TextInput
              style={styles.input}
              value={completeAmount}
              onChangeText={setCompleteAmount}
              placeholder="Visit fee amount"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setCompleteModalVisit(null);
                  setCompleteAmount('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, completingVisit && { opacity: 0.6 }]}
                onPress={submitCompleteVisit}
                disabled={completingVisit}
              >
                {completingVisit ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Complete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── FOLLOW-UP MODAL ─── */}
      <Modal visible={followupModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Schedule Follow-up</Text>
            <Text style={styles.inputLabel}>Reason *</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={followupCause}
              onChangeText={setFollowupCause}
              placeholder="Reason for follow-up..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={2}
            />
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={followupNotes}
              onChangeText={setFollowupNotes}
              placeholder="Additional notes..."
              placeholderTextColor={C.textMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setFollowupModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, followupLoading && { opacity: 0.6 }]}
                onPress={createFollowup}
                disabled={followupLoading}
              >
                {followupLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Schedule</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ReqStatusBadge({ status }: { status: string }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const isApproved = status === 'APPROVED';
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: isApproved ? C.greenLight : C.redLight }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: isApproved ? C.greenText : C.redText }}>{status}</Text>
    </View>
  );
}

function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const colors: Record<VisitStatus, { bg: string; text: string }> = {
    SCHEDULED: { bg: C.blueLight,  text: C.blueText  },
    ONGOING:   { bg: C.greenLight, text: C.greenText  },
    COMPLETED: { bg: C.cancelBg,   text: C.textMuted  },
  };
  const c = colors[status] ?? colors.SCHEDULED;
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{status}</Text>
    </View>
  );
}

function DoctorVisitCard({ visit, onPress }: { visit: any; onPress: () => void }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{visit.patient?.user?.fullName}</Text>
          <Text style={styles.cardSub}>{new Date(visit.visitDate).toLocaleDateString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <VisitStatusBadge status={visit.status} />
          <View style={styles.serialBadge}>
            <Text style={styles.serialText}>#{visit.serialNumber}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.causeText} numberOfLines={2}>{visit.cause}</Text>
      {visit.prescription && (
        <Text style={styles.hasPrescText}>Rx: {visit.prescription.diagnosis}</Text>
      )}
    </TouchableOpacity>
  );
}
