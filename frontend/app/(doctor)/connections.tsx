import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import api from '@/services/api';
import { useSocket } from '@/context/SocketContext';
import { useAppTheme } from '@/context/ThemeContext';

function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#f8fafc',
    card:         isDark ? '#1E293B' : '#fff',
    primary:      '#00BCD4',
    primaryLight: isDark ? '#0D3340' : '#B2EBF2',
    text:         isDark ? '#F1F5F9' : '#1e293b',
    textSec:      isDark ? '#94A3B8' : '#475569',
    textMuted:    isDark ? '#64748B' : '#94a3b8',
    green:        '#2ECC9B',
    greenLight:   isDark ? '#0D2E22' : '#d1fae5',
    red:          '#dc2626',
    redLight:     isDark ? '#3D1219' : '#fee2e2',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    idBanner: { backgroundColor: '#00BCD4', padding: 14, marginHorizontal: 16, marginTop: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    idLabel: { fontSize: 12, color: '#B2EBF2', flex: 1 },
    idValue: { fontSize: 24, fontWeight: '800', color: '#fff', marginLeft: 8 },
    list: { padding: 16, paddingBottom: 32 },
    sectionHeader: { fontSize: 13, fontWeight: '700', color: C.textSec, marginBottom: 8, marginTop: 4 },
    empty: { alignItems: 'center', marginTop: 40 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.textSec },
    emptySub: { fontSize: 13, color: C.textMuted, marginTop: 4 },
    card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.greenLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 18, fontWeight: '700', color: '#00BCD4' },
    info: { flex: 1 },
    name: { fontSize: 15, fontWeight: '700', color: C.text },
    meta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    idText: { fontSize: 11, color: C.textMuted, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 6 },
    acceptBtn: { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    acceptText: { color: '#00BCD4', fontWeight: '700', fontSize: 13 },
    rejectBtn: { backgroundColor: C.redLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
    rejectText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
    connectedBadge: { backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    connectedText: { fontSize: 12, fontWeight: '600', color: '#00BCD4' },
  });
}

export default function DoctorConnections() {
  const [connections, setConnections] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { socket, clearPendingRequestCount } = useSocket();
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);

  async function fetchData() {
    try {
      const [connRes, profRes] = await Promise.all([
        api.get('/api/connections'),
        api.get('/api/doctor/profile'),
      ]);
      setConnections(connRes.data);
      setProfile(profRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // Clear badge and refresh when this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      clearPendingRequestCount();
      fetchData();
    }, [])
  );

  // Real-time: refresh list when a new patient request arrives
  useEffect(() => {
    if (!socket) return;
    socket.on('new_connection_request', fetchData);
    return () => { socket.off('new_connection_request', fetchData); };
  }, [socket]);

  async function accept(id: number) {
    try {
      await api.patch(`/api/connections/${id}`, { status: 'ACCEPTED' });
      fetchData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to accept.');
    }
  }

  async function reject(id: number) {
    Alert.alert('Reject Request', 'Reject this connection request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/connections/${id}`);
            fetchData();
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || 'Failed.');
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BCD4" />;

  const pending = connections.filter((c) => c.status === 'PENDING');
  const accepted = connections.filter((c) => c.status === 'ACCEPTED');

  return (
    <View style={styles.container}>
      {profile && (
        <View style={styles.idBanner}>
          <Text style={styles.idLabel}>Your Doctor ID (share with patients)</Text>
          <Text style={styles.idValue}>{profile.id}</Text>
        </View>
      )}
      <FlatList
        data={[...pending, ...accepted]}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔗</Text>
            <Text style={styles.emptyText}>No connection requests yet</Text>
            <Text style={styles.emptySub}>Share your Doctor ID with patients</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const showAcceptedHeader =
            item.status === 'ACCEPTED' &&
            (index === 0 || connections.filter((c) => c.status === 'PENDING').length === index);
          return (
            <>
              {item.status === 'PENDING' && index === 0 && pending.length > 0 && (
                <Text style={styles.sectionHeader}>Pending Requests ({pending.length})</Text>
              )}
              {showAcceptedHeader && accepted.length > 0 && (
                <Text style={styles.sectionHeader}>Connected Patients ({accepted.length})</Text>
              )}
              <View style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.patient?.user?.fullName?.charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.patient?.user?.fullName}</Text>
                  <Text style={styles.meta}>{item.patient?.gender} · {item.patient?.bloodGroup}</Text>
                  <Text style={styles.idText}>Patient ID: {item.patientId}</Text>
                </View>
                {item.status === 'PENDING' ? (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(item.id)}>
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => reject(item.id)}>
                      <Text style={styles.rejectText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.connectedBadge}>
                    <Text style={styles.connectedText}>Connected</Text>
                  </View>
                )}
              </View>
            </>
          );
        }}
      />
    </View>
  );
}
