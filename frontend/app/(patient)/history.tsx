import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import api from '@/services/api';

export default function MedicalHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [conditionName, setConditionName] = useState('');
  const [details, setDetails] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isChronic, setIsChronic] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await api.get('/api/patient/history');
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!conditionName || !startDate) {
      Alert.alert('Error', 'Condition name and start date are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/patient/history', { conditionName, details, startDate, endDate: endDate || null, isChronic });
      setModalVisible(false);
      resetForm();
      fetchHistory();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    Alert.alert('Delete', 'Remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/patient/history/${id}`);
            fetchHistory();
          } catch {
            Alert.alert('Error', 'Failed to delete.');
          }
        },
      },
    ]);
  }

  function resetForm() {
    setConditionName('');
    setDetails('');
    setStartDate('');
    setEndDate('');
    setIsChronic(false);
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color="#1565C0" />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={styles.emptyText}>No medical history added yet</Text>
          </View>
        ) : (
          history.map((h) => (
            <View key={h.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.condition}>{h.conditionName}</Text>
                <View style={styles.cardActions}>
                  {h.isChronic && <View style={styles.badge}><Text style={styles.badgeText}>Chronic</Text></View>}
                  <TouchableOpacity onPress={() => handleDelete(h.id)}>
                    <Text style={styles.deleteBtn}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.details}>{h.details}</Text>
              <Text style={styles.dates}>
                {new Date(h.startDate).toLocaleDateString()} {h.endDate ? `→ ${new Date(h.endDate).toLocaleDateString()}` : '→ Ongoing'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ Add Condition</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Medical Condition</Text>
            <Text style={styles.label}>Condition Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Hypertension" value={conditionName} onChangeText={setConditionName} />
            <Text style={styles.label}>Details</Text>
            <TextInput style={[styles.input, styles.multiline]} placeholder="Brief description..." value={details} onChangeText={setDetails} multiline numberOfLines={3} />
            <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2020-01-01" value={startDate} onChangeText={setStartDate} />
            <Text style={styles.label}>End Date (optional)</Text>
            <TextInput style={styles.input} placeholder="Leave blank if ongoing" value={endDate} onChangeText={setEndDate} />
            <View style={styles.switchRow}>
              <Text style={styles.label}>Chronic Condition</Text>
              <Switch value={isChronic} onValueChange={setIsChronic} trackColor={{ true: '#1565C0' }} />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); resetForm(); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAdd} disabled={submitting}>
                <Text style={styles.submitBtnText}>{submitting ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 100 },
  loader: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  condition: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  badge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, color: '#d97706', fontWeight: '600' },
  deleteBtn: { fontSize: 16 },
  details: { fontSize: 13, color: '#475569', marginBottom: 6 },
  dates: { fontSize: 12, color: '#94a3b8' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: '#1565C0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#1565C0', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, backgroundColor: '#f8fafc' },
  multiline: { height: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#1565C0', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
