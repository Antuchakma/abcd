import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import api from '@/services/api';

function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#f8fafc',
    card:         isDark ? '#1E293B' : '#fff',
    primary:      '#1565C0',
    primaryLight: isDark ? '#0D1F3D' : '#E3F2FD',
    text:         isDark ? '#F1F5F9' : '#1e293b',
    textSec:      isDark ? '#94A3B8' : '#64748b',
    amberLight:   isDark ? '#3D2E0E' : '#fef3c7',
    redLight:     isDark ? '#3D1219' : '#fee2e2',
    greenLight:   isDark ? '#0D2E22' : '#ecfdf5',
    blueLight:    isDark ? '#0D1F3D' : '#eff6ff',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: 16, paddingBottom: 32 },
    header: { backgroundColor: C.primary, borderRadius: 16, padding: 20, marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '800', color: '#fff' },
    sub: { fontSize: 13, color: '#BBDEFB', marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 10 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    stat: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center' },
    statNum: { fontSize: 28, fontWeight: '800', color: C.primary },
    statLabel: { fontSize: 13, color: C.textSec, marginTop: 4 },
    logoutBtn: { marginTop: 24, backgroundColor: C.redLight, borderRadius: 10, padding: 14, alignItems: 'center' },
    logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  });
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const s = makeStyles(C);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/api/admin/stats').then((r) => setStats(r.data)).catch(console.error);
  }, []);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login'); },
      },
    ]);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.title}>Admin Panel</Text>
        <Text style={s.sub}>{user?.fullName}</Text>
      </View>

      {stats && (
        <>
          <Text style={s.sectionTitle}>System Overview</Text>
          <View style={s.statsRow}>
            <View style={[s.stat, { backgroundColor: C.primaryLight }]}>
              <Text style={s.statNum}>{stats.userCount}</Text>
              <Text style={s.statLabel}>Total Users</Text>
            </View>
            <View style={[s.stat, { backgroundColor: C.greenLight }]}>
              <Text style={s.statNum}>{stats.patientCount}</Text>
              <Text style={s.statLabel}>Patients</Text>
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={[s.stat, { backgroundColor: C.blueLight }]}>
              <Text style={s.statNum}>{stats.doctorCount}</Text>
              <Text style={s.statLabel}>Doctors</Text>
            </View>
            <View style={[s.stat, { backgroundColor: C.amberLight }]}>
              <Text style={[s.statNum, { color: stats.pendingDoctors > 0 ? '#d97706' : '#059669' }]}>
                {stats.pendingDoctors}
              </Text>
              <Text style={s.statLabel}>Pending Approval</Text>
            </View>
          </View>
        </>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
