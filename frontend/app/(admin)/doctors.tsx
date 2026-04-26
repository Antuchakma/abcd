import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import api from '@/services/api';

function makeColors(isDark: boolean) {
  return {
    bg:          isDark ? '#0F172A' : '#f8fafc',
    card:        isDark ? '#1E293B' : '#fff',
    primary:     '#1565C0',
    text:        isDark ? '#F1F5F9' : '#1e293b',
    textSec:     isDark ? '#94A3B8' : '#64748b',
    textMuted:   isDark ? '#64748B' : '#94a3b8',
    badgeText:   isDark ? '#CBD5E1' : '#374151',
    greenLight:  isDark ? '#0D2E22' : '#dcfce7',
    amberLight:  isDark ? '#3D2E0E' : '#fef3c7',
    redLight:    isDark ? '#3D1219' : '#fee2e2',
    border:      isDark ? '#334155' : '#e2e8f0',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    list: { padding: 16, paddingBottom: 32, backgroundColor: C.bg, flexGrow: 1 },
    section: { marginBottom: 22 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 10 },
    empty: { textAlign: 'center', marginTop: 14, color: C.textMuted, fontSize: 15 },
    card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    name: { fontSize: 15, fontWeight: '700', color: C.text },
    email: { fontSize: 12, color: C.textSec, marginTop: 2 },
    spec: { fontSize: 12, color: C.primary, marginTop: 4 },
    license: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    idText: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeApproved: { backgroundColor: C.greenLight },
    badgePending: { backgroundColor: C.amberLight },
    badgeRejected: { backgroundColor: C.redLight },
    badgeText: { fontSize: 12, fontWeight: '600', color: C.badgeText },
    actions: { flexDirection: 'row' },
    requestMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    approveBtn: { flex: 1, backgroundColor: C.greenLight, borderRadius: 8, padding: 10, alignItems: 'center' },
    approveBtnText: { color: '#059669', fontWeight: '700' },
    revokeBtn: { flex: 1, backgroundColor: C.redLight, borderRadius: 8, padding: 10, alignItems: 'center' },
    revokeBtnText: { color: '#dc2626', fontWeight: '700' },
    rejectBtn: { flex: 1, backgroundColor: C.redLight, borderRadius: 8, padding: 10, alignItems: 'center', marginLeft: 10 },
    rejectBtnText: { color: '#dc2626', fontWeight: '700' },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 18 },
  });
}

export default function AdminDoctors() {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const s = makeStyles(C);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const [doctorsRes, requestsRes] = await Promise.all([
        api.get('/api/admin/doctors'),
        api.get('/api/admin/doctor-requests'),
      ]);
      setDoctors(doctorsRes.data);
      setRequests(requestsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  async function approveRequest(id: number) {
    try {
      await api.patch(`/api/admin/doctor-requests/${id}/approve`);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to approve.');
    }
  }

  async function revoke(id: number) {
    Alert.alert('Revoke Approval', 'Remove this doctor\'s approval?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/admin/doctors/${id}/reject`);
            fetchData();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed.');
          }
        },
      },
    ]);
  }

  async function approveDoctor(id: number) {
    try {
      await api.patch(`/api/admin/doctors/${id}/approve`);
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to approve.');
    }
  }

  async function rejectRequest(id: number) {
    Alert.alert('Reject Request', 'Reject this doctor application?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/admin/doctor-requests/${id}/reject`);
            fetchData();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed to reject.');
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#1565C0" />;

  return (
    <ScrollView contentContainerStyle={s.list}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Pending Doctor Applications</Text>
        {requests.filter((request) => request.status === 'PENDING').length === 0 ? (
          <Text style={s.empty}>No pending doctor applications</Text>
        ) : (
          requests
            .filter((request) => request.status === 'PENDING')
            .map((item) => (
              <View key={`request-${item.id}`} style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.fullName}</Text>
                    <Text style={s.email}>{item.email}</Text>
                    <Text style={s.spec}>{item.specialization} · {item.hospitalName}</Text>
                    <Text style={s.license}>License: {item.licenseNumber}</Text>
                    <Text style={s.requestMeta}>Requested on {new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={[s.badge, s.badgePending]}>
                    <Text style={s.badgeText}>Pending</Text>
                  </View>
                </View>
                <View style={s.actions}>
                  <TouchableOpacity style={s.approveBtn} onPress={() => approveRequest(item.id)}>
                    <Text style={s.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => rejectRequest(item.id)}>
                    <Text style={s.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
        )}
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>Registered Doctors</Text>
        {doctors.length === 0 ? (
          <Text style={s.empty}>No doctors registered</Text>
        ) : (
          doctors.map((item) => (
            <View key={String(item.id)} style={s.card}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.user?.fullName}</Text>
                  <Text style={s.email}>{item.user?.email}</Text>
                  <Text style={s.spec}>{item.specialization} · {item.hospitalName}</Text>
                  <Text style={s.license}>License: {item.licenseNumber}</Text>
                  <Text style={s.idText}>Doctor ID: {item.id}</Text>
                </View>
                <View style={[s.badge, item.isApproved ? s.badgeApproved : s.badgePending]}>
                  <Text style={s.badgeText}>{item.isApproved ? 'Approved' : 'Pending'}</Text>
                </View>
              </View>
              <View style={s.actions}>
                {!item.isApproved ? (
                  <TouchableOpacity style={s.approveBtn} onPress={() => approveDoctor(item.id)}>
                    <Text style={s.approveBtnText}>Approve</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.revokeBtn} onPress={() => revoke(item.id)}>
                    <Text style={s.revokeBtnText}>Revoke Approval</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
