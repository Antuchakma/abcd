import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Alert, RefreshControl, ActivityIndicator, Modal, Clipboard as LegacyClipboard,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { paymentsApi, Payment, PaymentMethodType, DoctorPaymentMethod } from '@/services/api';

const METHOD_COLORS: Record<PaymentMethodType, string> = {
  BKASH: '#E2136E',
  ROCKET: '#8B2F97',
  NAGAD: '#F05A22',
  CASH: '#34A853',
};

const CASH_METHOD_ID = -1;

type Mine = Payment & {
  appointment: { id: number; visitDate: string; doctor: { user: { fullName: string } } };
};

export default function PatientPaymentsScreen() {
  const { isDark } = useAppTheme();
  const c = makeColors(isDark);

  const [payments, setPayments] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pay-modal state
  const [openVisitId, setOpenVisitId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    payment: Payment | null;
    methods: DoctorPaymentMethod[];
    doctor: { fullName: string };
  } | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<DoctorPaymentMethod | null>(null);
  const [txnId, setTxnId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await paymentsApi.mine();
      setPayments(data);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load payments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const openPay = async (visitId: number) => {
    setOpenVisitId(visitId);
    setDetail(null);
    setSelectedMethod(null);
    setTxnId('');
    try {
      const d = await paymentsApi.getForVisit(visitId);
      setDetail({ payment: d.payment, methods: d.methods, doctor: d.doctor });
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load.');
      setOpenVisitId(null);
    }
  };

  const copyNumber = (n: string) => {
    LegacyClipboard.setString(n);
    Alert.alert('Copied', `${n} copied to clipboard.`);
  };

  const submit = async () => {
    if (!openVisitId || !selectedMethod) {
      Alert.alert('Pick a method', 'Choose how you paid.');
      return;
    }
    if (selectedMethod.type !== 'CASH' && !txnId.trim()) {
      Alert.alert('Transaction ID required', 'Please paste your mobile-banking transaction ID.');
      return;
    }
    setSubmitting(true);
    try {
      await paymentsApi.submit(openVisitId, {
        methodType: selectedMethod.type,
        methodNumber: selectedMethod.type === 'CASH' ? undefined : selectedMethod.number,
        patientTxnId: txnId.trim() || undefined,
      });
      setOpenVisitId(null);
      await load();
      Alert.alert(
        'Thanks!',
        'We told your doctor. The reminder will clear once the doctor confirms receipt.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatus = (p: Mine) => {
    if (p.status === 'PAID') {
      return <Text style={{ color: c.green, fontWeight: '700' }}>PAID · {p.receiptNumber}</Text>;
    }
    if (p.status === 'WAIVED') {
      return <Text style={{ color: c.textSec, fontWeight: '600' }}>Waived</Text>;
    }
    if (p.status === 'AWAITING_CONFIRMATION') {
      return <Text style={{ color: c.amber, fontWeight: '700' }}>Awaiting doctor confirmation</Text>;
    }
    return <Text style={{ color: c.red, fontWeight: '700' }}>Payment due</Text>;
  };

  const unpaid = payments.filter((p) => p.status === 'PENDING');

  if (loading) {
    return <View style={[styles.center, { backgroundColor: c.bg }]}><ActivityIndicator color={c.primary} /></View>;
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={[styles.header, { color: c.text }]}>Payments</Text>

      {unpaid.length > 0 && (
        <View style={[styles.banner, { backgroundColor: c.redLight, borderColor: c.red }]}>
          <Ionicons name="alert-circle" size={22} color={c.red} />
          <Text style={{ color: c.red, fontWeight: '700', marginLeft: 8, flex: 1 }}>
            You have {unpaid.length} uncleared payment{unpaid.length === 1 ? '' : 's'}. Please pay to clear the reminder.
          </Text>
        </View>
      )}

      {payments.length === 0 ? (
        <Text style={[styles.empty, { color: c.textSec }]}>No payments yet.</Text>
      ) : payments.map((p) => (
        <View key={p.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.docName, { color: c.text }]}>Dr. {p.appointment.doctor.user.fullName}</Text>
            <Text style={[styles.amount, { color: c.primary }]}>৳{p.amount}</Text>
          </View>
          <Text style={[styles.meta, { color: c.textSec }]}>
            Visit {new Date(p.appointment.visitDate).toLocaleDateString()}
          </Text>
          <View style={{ marginTop: 6 }}>{renderStatus(p)}</View>
          {p.status === 'PENDING' && (
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: c.primary }]}
              onPress={() => openPay(p.appointmentId)}
            >
              <Ionicons name="card-outline" size={16} color="#fff" />
              <Text style={styles.btnText}>Pay now</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <Modal
        visible={openVisitId !== null}
        animationType="slide"
        onRequestClose={() => setOpenVisitId(null)}
      >
        <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.scroll}>
          <View style={styles.rowBetween}>
            <Text style={[styles.header, { color: c.text }]}>Pay your doctor</Text>
            <TouchableOpacity onPress={() => setOpenVisitId(null)}>
              <Ionicons name="close" size={26} color={c.text} />
            </TouchableOpacity>
          </View>

          {!detail ? (
            <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
          ) : !detail.payment ? (
            <Text style={[styles.empty, { color: c.textSec }]}>No payment request.</Text>
          ) : (
            <>
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.meta, { color: c.textSec }]}>Amount to pay</Text>
                <Text style={[styles.bigAmount, { color: c.primary }]}>৳{detail.payment.amount}</Text>
                <Text style={[styles.meta, { color: c.textSec }]}>to Dr. {detail.doctor.fullName}</Text>
              </View>

              <Text style={[styles.stepTitle, { color: c.text }]}>1. Pick a method and send the money</Text>
              <Text style={[styles.helpText, { color: c.textSec }]}>
                Open your Bkash / Rocket / Nagad app, send the exact amount to the chosen number, then come back here.
              </Text>

              {/* Always-available cash option */}
              <TouchableOpacity
                style={[
                  styles.methodCard,
                  {
                    backgroundColor: c.card,
                    borderColor: selectedMethod?.id === CASH_METHOD_ID ? METHOD_COLORS.CASH : c.border,
                  },
                  selectedMethod?.id === CASH_METHOD_ID && { borderWidth: 2 },
                ]}
                onPress={() =>
                  setSelectedMethod({
                    id: CASH_METHOD_ID,
                    doctorId: 0,
                    type: 'CASH',
                    number: '',
                    label: 'Pay in cash at the clinic',
                    isActive: true,
                    createdAt: '',
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: METHOD_COLORS.CASH, fontWeight: '800' }}>CASH</Text>
                  <Text style={[styles.number, { color: c.text }]}>Pay at the clinic</Text>
                  <Text style={[styles.meta, { color: c.textSec }]}>
                    Hand the money to your doctor in person.
                  </Text>
                </View>
                <Ionicons name="cash-outline" size={26} color={METHOD_COLORS.CASH} />
              </TouchableOpacity>

              {detail.methods.length === 0 && (
                <Text style={[styles.helpText, { color: c.textSec }]}>
                  The doctor has not added a mobile-banking number — you can still pay in cash above.
                </Text>
              )}

              {detail.methods.map((m) => {
                const isSelected = selectedMethod?.id === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.methodCard,
                      { backgroundColor: c.card, borderColor: isSelected ? METHOD_COLORS[m.type] : c.border },
                      isSelected && { borderWidth: 2 },
                    ]}
                    onPress={() => setSelectedMethod(m)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: METHOD_COLORS[m.type], fontWeight: '800' }}>{m.type}</Text>
                      <Text style={[styles.number, { color: c.text }]}>{m.number}</Text>
                      {m.label ? <Text style={[styles.meta, { color: c.textSec }]}>{m.label}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={[styles.copyBtn, { backgroundColor: c.primaryLight }]}
                      onPress={() => copyNumber(m.number)}
                    >
                      <Ionicons name="copy-outline" size={16} color={c.primary} />
                      <Text style={{ color: c.primary, fontWeight: '600', marginLeft: 4 }}>Copy</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.stepTitle, { color: c.text }]}>2. Confirm you have sent the payment</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
                placeholder="Transaction ID (optional)"
                placeholderTextColor={c.textMuted}
                value={txnId}
                onChangeText={setTxnId}
              />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: selectedMethod ? c.green : c.border },
                ]}
                disabled={!selectedMethod || submitting}
                onPress={submit}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.btnText}>
                  {submitting
                    ? 'Submitting…'
                    : selectedMethod?.type === 'CASH'
                    ? "I'll pay in cash at the visit"
                    : "I've sent the payment"}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.helpText, { color: c.textSec, textAlign: 'center', marginTop: 10 }]}>
                The reminder will soften to "awaiting confirmation" and clear once your doctor verifies.
              </Text>
            </>
          )}
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}

function makeColors(isDark: boolean) {
  return {
    bg: isDark ? '#0F172A' : '#F4F7FE',
    card: isDark ? '#1E293B' : '#FFFFFF',
    primary: '#4E8EE8',
    primaryLight: isDark ? '#1E3A5F' : '#EBF3FF',
    text: isDark ? '#F1F5F9' : '#1C2B3A',
    textSec: isDark ? '#94A3B8' : '#5A6C82',
    textMuted: isDark ? '#64748B' : '#9AAFC2',
    border: isDark ? '#334155' : '#DDE9FF',
    green: '#2ECC9B',
    amber: '#F5A435',
    red: '#E85A6A',
    redLight: isDark ? '#3D1219' : '#FEECEE',
  };
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  banner: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12,
    padding: 12, marginBottom: 14,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  docName: { fontSize: 16, fontWeight: '700' },
  amount: { fontSize: 20, fontWeight: '800' },
  bigAmount: { fontSize: 36, fontWeight: '900', marginVertical: 6 },
  meta: { fontSize: 12, marginTop: 2 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10, marginTop: 10,
  },
  btnText: { color: '#fff', fontWeight: '700' },
  stepTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  helpText: { fontSize: 13, marginBottom: 10 },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  number: { fontSize: 18, fontWeight: '800', marginTop: 2, letterSpacing: 1 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
  },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12,
    marginBottom: 12, fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, marginTop: 6,
  },
  empty: { textAlign: 'center', padding: 24, fontSize: 14 },
});
