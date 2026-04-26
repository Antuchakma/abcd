import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Modal, ScrollView } from 'react-native';
import api from '@/services/api';

export default function DoctorPatients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    api.get('/api/doctor/patients')
      .then((res) => setPatients(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function openPatient(patient: any) {
    setSelected(patient);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/doctor/patients/${patient.id}`);
      setDetail(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color="#00BCD4" />;

  return (
    <View style={styles.container}>
      {patients.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No patients yet</Text>
          <Text style={styles.emptySubtext}>Create a prescription to add patients</Text>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openPatient(item)} activeOpacity={0.8}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.user?.fullName?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.user?.fullName}</Text>
                <Text style={styles.email}>{item.user?.email}</Text>
                <Text style={styles.meta}>{item.gender} · {item.bloodGroup}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{detail?.user?.fullName || selected?.user?.fullName}</Text>
              <TouchableOpacity onPress={() => { setSelected(null); setDetail(null); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingDetail ? (
              <ActivityIndicator color="#00BCD4" style={{ padding: 24 }} />
            ) : detail ? (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.section}>Blood Group: {detail.bloodGroup} · Gender: {detail.gender}</Text>
                <Text style={styles.sectionTitle}>Prescriptions ({detail.prescriptions?.length})</Text>
                {detail.prescriptions?.map((p: any) => (
                  <View key={p.id} style={styles.item}>
                    <Text style={styles.itemTitle}>{p.diagnosis}</Text>
                    <Text style={styles.itemSub}>{new Date(p.createdAt).toLocaleDateString()} · {p.medicines?.length} medicine(s)</Text>
                  </View>
                ))}
                <Text style={styles.sectionTitle}>Medical History ({detail.medicalHistory?.length})</Text>
                {detail.medicalHistory?.map((h: any) => (
                  <View key={h.id} style={styles.item}>
                    <Text style={styles.itemTitle}>{h.conditionName} {h.isChronic ? '(Chronic)' : ''}</Text>
                    <Text style={styles.itemSub}>{h.details}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loader: { flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#475569', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#00BCD4' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  arrow: { fontSize: 22, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  closeBtn: { fontSize: 18, color: '#94a3b8', padding: 4 },
  modalBody: { padding: 20 },
  section: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 10, marginTop: 8 },
  item: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 8 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  itemSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
});
