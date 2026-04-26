import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { paymentsApi, DoctorPaymentMethod, PaymentMethodType, Payment } from '@/services/api';

const METHOD_TYPES: PaymentMethodType[] = ['BKASH', 'ROCKET', 'NAGAD'];
const METHOD_COLORS: Record<PaymentMethodType, string> = {
  BKASH: '#E2136E',
  ROCKET: '#8B2F97',
  NAGAD: '#F05A22',
};

type Incoming = Payment & {
  appointment: { id: number; visitDate: string; patient: { user: { fullName: string } } };
};

export default function DoctorPaymentsScreen() {
  const { isDark } = useAppTheme();
  const c = makeColors(isDark);

  const [tab, setTab] = useState<'incoming' | 'methods'>('incoming');
  const [methods, setMethods] = useState<DoctorPaymentMethod[]>([]);
  const [incoming, setIncoming] = useState<Incoming[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [newType, setNewType] = useState<PaymentMethodType>('BKASH');
  const [newNumber, setNewNumber] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, i] = await Promise.all([paymentsApi.listMethods(), paymentsApi.incoming()]);
      setMethods(m);
      setIncoming(i);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to load payments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const addMethod = async () => {
    const digits = newNumber.replace(/\D/g, '');
    if (digits.length !== 11) {
      Alert.alert('Invalid number', 'Enter an 11-digit mobile number.');
      return;
    }
    setAdding(true);
    try {
      await paymentsApi.addMethod({ type: newType, number: digits, label: newLabel || undefined });
      setNewNumber(''); setNewLabel('');
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add.');
    } finally {
      setAdding(false);
    }
  };

  const toggleMethod = async (m: DoctorPaymentMethod) => {
    try {
      await paymentsApi.updateMethod(m.id, { isActive: !m.isActive });
      await load();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed.');
    }
  };

  const removeMethod = (m: DoctorPaymentMethod) => {
    Alert.alert('Remove method', `Remove ${m.type} ${m.number}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try { await paymentsApi.deleteMethod(m.id); await load(); }
          catch (err: any) { Alert.alert('Error', err.response?.data?.error || 'Failed.'); }
        },
      },
    ]);
  };

  const confirmPayment = (p: Incoming) => {
    Alert.alert(
      'Confirm payment',
      `Mark ৳${p.amount} from ${p.appointment.patient.user.fullName} as received?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async () => {
            try { await paymentsApi.confirm(p.appointmentId); await load(); }
            catch (err: any) { Alert.alert('Error', err.response?.data?.error || 'Failed.'); }
          },
        },
      ]
    );
  };

  const markCashPaid = (p: Incoming) => {
    Alert.alert(
      'Cash received',
      `Record ৳${p.amount} from ${p.appointment.patient.user.fullName} as paid in cash?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark paid', onPress: async () => {
            try { await paymentsApi.markCashPaid(p.appointmentId); await load(); }
            catch (err: any) { Alert.alert('Error', err.response?.data?.error || 'Failed.'); }
          },
        },
      ]
    );
  };

  const waivePayment = (p: Incoming) => {
    Alert.alert('Waive fee', `Waive ৳${p.amount} for ${p.appointment.patient.user.fullName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Waive', onPress: async () => {
          try { await paymentsApi.waive(p.appointmentId); await load(); }
          catch (err: any) { Alert.alert('Error', err.response?.data?.error || 'Failed.'); }
        },
      },
    ]);
  };

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

      <View style={[styles.tabBar, { backgroundColor: c.card, borderColor: c.border }]}>
        {(['incoming', 'methods'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { backgroundColor: c.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={{ color: tab === t ? '#fff' : c.textSec, fontWeight: '600' }}>
              {t === 'incoming' ? `Incoming (${incoming.length})` : 'My Methods'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'incoming' && (
        <View>
          {incoming.length === 0 ? (
            <Text style={[styles.empty, { color: c.textSec }]}>No incoming payments.</Text>
          ) : incoming.map((p) => (
            <View key={p.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.patientName, { color: c.text }]}>{p.appointment.patient.user.fullName}</Text>
                <Text style={[styles.amount, { color: c.primary }]}>৳{p.amount}</Text>
              </View>
              <Text style={[styles.meta, { color: c.textSec }]}>
                Visit {new Date(p.appointment.visitDate).toLocaleDateString()}
              </Text>
              <View style={[styles.statusBadge, {
                backgroundColor: p.status === 'AWAITING_CONFIRMATION' ? c.amberLight : c.redLight,
              }]}>
                <Text style={{
                  color: p.status === 'AWAITING_CONFIRMATION' ? c.amber : c.red,
                  fontWeight: '600', fontSize: 12,
                }}>
                  {p.status === 'AWAITING_CONFIRMATION' ? 'Patient reports paid — verify' : 'Awaiting patient'}
                </Text>
              </View>
              {p.status === 'AWAITING_CONFIRMATION' && (
                <View style={styles.detailRow}>
                  <Text style={[styles.meta, { color: c.textSec }]}>
                    Via {p.selectedMethodType} • {p.selectedMethodNumber}
                    {p.patientTxnId ? ` • Txn: ${p.patientTxnId}` : ''}
                  </Text>
                </View>
              )}
              <View style={styles.actionRow}>
                {p.status === 'AWAITING_CONFIRMATION' && (
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: c.green }]}
                    onPress={() => confirmPayment(p)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                    <Text style={styles.btnText}>Confirm</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: '#34A853' }]}
                  onPress={() => markCashPaid(p)}
                >
                  <Ionicons name="cash-outline" size={16} color="#fff" />
                  <Text style={styles.btnText}>Cash received</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: c.border }]}
                  onPress={() => waivePayment(p)}
                >
                  <Text style={[styles.btnText, { color: c.textSec }]}>Waive</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === 'methods' && (
        <View>
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Add a method</Text>
            <View style={styles.typeRow}>
              {METHOD_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    { borderColor: METHOD_COLORS[t] },
                    newType === t && { backgroundColor: METHOD_COLORS[t] },
                  ]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={{ color: newType === t ? '#fff' : METHOD_COLORS[t], fontWeight: '700' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
              placeholder="11-digit number"
              placeholderTextColor={c.textMuted}
              value={newNumber}
              onChangeText={setNewNumber}
              keyboardType="number-pad"
              maxLength={11}
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
              placeholder="Label (optional) — e.g. Personal"
              placeholderTextColor={c.textMuted}
              value={newLabel}
              onChangeText={setNewLabel}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: c.primary, alignSelf: 'stretch', justifyContent: 'center' }]}
              onPress={addMethod}
              disabled={adding}
            >
              <Text style={styles.btnText}>{adding ? 'Adding…' : 'Add method'}</Text>
            </TouchableOpacity>
          </View>

          {methods.map((m) => (
            <View key={m.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={{ color: METHOD_COLORS[m.type], fontWeight: '700' }}>{m.type}</Text>
                  <Text style={[styles.patientName, { color: c.text }]}>{m.number}</Text>
                  {m.label ? <Text style={[styles.meta, { color: c.textSec }]}>{m.label}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <TouchableOpacity onPress={() => toggleMethod(m)}>
                    <Text style={{ color: m.isActive ? c.green : c.textMuted, fontWeight: '600' }}>
                      {m.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeMethod(m)} style={{ marginTop: 6 }}>
                    <Ionicons name="trash-outline" size={18} color={c.red} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          {methods.length === 0 && (
            <Text style={[styles.empty, { color: c.textSec }]}>No payment methods yet.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function makeColors(isDark: boolean) {
  return {
    bg: isDark ? '#0F172A' : '#F4F7FE',
    card: isDark ? '#1E293B' : '#FFFFFF',
    primary: '#4E8EE8',
    text: isDark ? '#F1F5F9' : '#1C2B3A',
    textSec: isDark ? '#94A3B8' : '#5A6C82',
    textMuted: isDark ? '#64748B' : '#9AAFC2',
    border: isDark ? '#334155' : '#DDE9FF',
    green: '#2ECC9B',
    amber: '#F5A435',
    amberLight: isDark ? '#3D2E0E' : '#FFF5E5',
    red: '#E85A6A',
    redLight: isDark ? '#3D1219' : '#FEECEE',
  };
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  tabBar: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontSize: 16, fontWeight: '700' },
  amount: { fontSize: 20, fontWeight: '800' },
  meta: { fontSize: 12, marginTop: 2 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  detailRow: { marginTop: 6 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 2 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, fontSize: 14 },
  empty: { textAlign: 'center', padding: 24, fontSize: 14 },
});
