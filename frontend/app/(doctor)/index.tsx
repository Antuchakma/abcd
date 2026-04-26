import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import api from '@/services/api';
import { useAppTheme } from '@/context/ThemeContext';

const NOTIF_ICON: Record<string, string> = {
  appointment_request: '📋', appointment_approved: '✅', appointment_rejected: '❌',
  visit_started: '🏥', visit_completed: '🎉', prescription_issued: '💊',
  report_uploaded: '📄', followup_scheduled: '📅',
  new_connection_request: '👤', connection_updated: '🔗', connection_rejected: '🚫',
};

function makeColors(isDark: boolean) {
  return {
    bg:             isDark ? '#0F172A' : '#f1f5f9',
    card:           isDark ? '#1E293B' : '#fff',
    primary:        '#00BCD4',
    primaryLight:   isDark ? '#0D3340' : '#e0f7fa',
    secondary:      '#1565C0',
    secondaryLight: isDark ? '#0D1F3D' : '#e3f2fd',
    text:           isDark ? '#F1F5F9' : '#1e293b',
    textSec:        isDark ? '#94A3B8' : '#475569',
    textMuted:      isDark ? '#64748B' : '#94a3b8',
    border:         isDark ? '#334155' : '#e2e8f0',
    amber:          '#F5A435',
    amberLight:     isDark ? '#3D2E0E' : '#fef3c7',
    red:            '#dc2626',
    redLight:       isDark ? '#3D1219' : '#fff1f2',
    green:          '#2ECC9B',
    greenLight:     isDark ? '#0D2E22' : '#d1fae5',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { paddingBottom: 36 },
    // hero
    hero: { backgroundColor: '#00BCD4', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
    heroTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    heroDate: { fontSize: 12, color: '#B2EBF2', marginBottom: 4, fontWeight: '600' },
    heroName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 3 },
    heroSub: { fontSize: 13, color: '#B2EBF2' },
    idBadge: { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
    idLabel: { fontSize: 9, color: '#B2EBF2', textTransform: 'uppercase', letterSpacing: 0.5 },
    idValue: { fontSize: 24, fontWeight: '800', color: '#fff' },
    heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    pillText: { fontSize: 12, color: '#fff', fontWeight: '600' },
    // today scroll
    todayScroll: { marginBottom: 4 },
    todayScrollContent: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
    todayCard: { backgroundColor: C.card, borderRadius: 14, padding: 14, width: 140, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    todayCardOngoing: { borderWidth: 2, borderColor: '#00BCD4' },
    todaySerial: { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
    todaySerialText: { fontSize: 12, fontWeight: '800', color: '#00BCD4' },
    todayPatient: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
    todayCause: { fontSize: 11, color: C.textMuted, marginBottom: 8 },
    todayStatus: { backgroundColor: '#1565C0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    todayStatusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    // stats
    statsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    statCard: { width: '47%', borderRadius: 14, padding: 14, alignItems: 'center', gap: 4 },
    statNum: { fontSize: 26, fontWeight: '800' },
    statLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
    // quick actions
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
    // section
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
    unreadBadge: { backgroundColor: '#00BCD4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    unreadBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    // notifications
    emptyNotif: { backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center', marginHorizontal: 16, marginBottom: 20 },
    emptyNotifText: { fontSize: 13, color: C.textMuted },
    notifCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8, gap: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    notifCardUnread: { backgroundColor: C.primaryLight, borderLeftWidth: 3, borderLeftColor: '#00BCD4' },
    notifIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
    notifIcon: { fontSize: 18 },
    notifTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 1 },
    notifBody: { fontSize: 12, color: C.textSec, lineHeight: 17 },
    unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00BCD4' },
    showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, marginBottom: 20 },
    showMoreText: { fontSize: 13, fontWeight: '700', color: '#00BCD4' },
    // profile
    profileCard: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    // logout
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, backgroundColor: C.redLight, borderRadius: 12, padding: 14 },
    logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  });
}

function makeQaStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    card: { width: '47%', backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
    iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '700', color: C.text },
  });
}

function makePrStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    label: { fontSize: 13, color: C.textMuted, flex: 1 },
    value: { fontSize: 13, fontWeight: '600', color: C.text, flex: 2, textAlign: 'right' },
  });
}

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const { unreadNotifCount, pendingRequestCount } = useSocket();
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const s = makeStyles(C);

  const [profile, setProfile]               = useState<any>(null);
  const [patientCount, setPatientCount]     = useState(0);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [notifications, setNotifications]   = useState<any[]>([]);
  const [todayAppts, setTodayAppts]         = useState<any[]>([]);
  const [pendingReqs, setPendingReqs]       = useState(0);
  const [refreshing, setRefreshing]         = useState(false);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  async function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    const [profileRes, patientsRes, prescRes, notifRes, apptRes, reqRes] = await Promise.allSettled([
      api.get('/api/doctor/profile'),
      api.get('/api/doctor/patients'),
      api.get('/api/prescriptions'),
      api.get('/api/notifications'),
      api.get('/api/appointments'),
      api.get('/api/appointment-requests'),
    ]);
    if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
    if (patientsRes.status === 'fulfilled') setPatientCount(patientsRes.value.data.length);
    if (prescRes.status === 'fulfilled') setPrescriptionCount(prescRes.value.data.length);
    if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.slice(0, 4));
    if (apptRes.status === 'fulfilled') {
      const todayStr = new Date().toDateString();
      const today = apptRes.value.data.filter(
        (a: any) => new Date(a.visitDate).toDateString() === todayStr
      );
      setTodayAppts(today);
    }
    if (reqRes.status === 'fulfilled') {
      setPendingReqs(reqRes.value.data.filter((r: any) => r.status === 'PENDING').length);
    }
    if (isRefresh) setRefreshing(false);
  }

  function handleLogout() {
    const doLogout = async () => { await logout(); router.replace('/(auth)/login'); };
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) doLogout();
      return;
    }
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: doLogout },
    ]);
  }

  const unread = notifications.filter((n) => !n.isRead).length;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const ongoingAppts = todayAppts.filter((a) => a.status === 'ONGOING');

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor="#00BCD4" />}
    >
      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroDate}>{today}</Text>
            <Text style={s.heroName}>Dr. {user?.fullName}</Text>
            {profile && (
              <Text style={s.heroSub}>{profile.specialization} · {profile.hospitalName}</Text>
            )}
          </View>
          <View style={s.idBadge}>
            <Text style={s.idLabel}>Doctor ID</Text>
            <Text style={s.idValue}>{profile?.id ?? '—'}</Text>
          </View>
        </View>

        {/* Today summary pills */}
        <View style={s.heroPills}>
          <View style={s.pill}>
            <Text style={s.pillText}>🗓 {todayAppts.length} today</Text>
          </View>
          {ongoingAppts.length > 0 && (
            <View style={[s.pill, { backgroundColor: isDark ? '#0D2E22' : '#d1fae5' }]}>
              <Text style={[s.pillText, { color: isDark ? '#2ECC9B' : '#065f46' }]}>🟢 {ongoingAppts.length} ongoing</Text>
            </View>
          )}
          {pendingReqs > 0 && (
            <View style={[s.pill, { backgroundColor: isDark ? '#3D2E0E' : '#fef3c7' }]}>
              <Text style={[s.pillText, { color: isDark ? '#F5A435' : '#92400e' }]}>⏳ {pendingReqs} pending</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Today's Appointments (quick strip) ── */}
      {todayAppts.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Today's Schedule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.todayScroll} contentContainerStyle={s.todayScrollContent}>
            {todayAppts.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={[s.todayCard, a.status === 'ONGOING' && s.todayCardOngoing]}
                onPress={() => router.push('/(doctor)/appointments')}
                activeOpacity={0.85}
              >
                <View style={s.todaySerial}>
                  <Text style={s.todaySerialText}>#{a.serialNumber}</Text>
                </View>
                <Text style={s.todayPatient} numberOfLines={1}>{a.patient?.user?.fullName}</Text>
                <Text style={s.todayCause} numberOfLines={1}>{a.cause}</Text>
                <View style={[s.todayStatus,
                  a.status === 'ONGOING' && { backgroundColor: '#00BCD4' },
                  a.status === 'COMPLETED' && { backgroundColor: isDark ? '#334155' : '#64748b' },
                ]}>
                  <Text style={s.todayStatusText}>
                    {a.status === 'SCHEDULED' ? 'Scheduled' : a.status === 'ONGOING' ? 'Ongoing' : 'Done'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* ── Stats ── */}
      <Text style={s.sectionTitle}>Practice Overview</Text>
      <View style={s.statsGrid}>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.primaryLight }]} onPress={() => router.push('/(doctor)/connections')}>
          <Ionicons name="people-outline" size={24} color="#00BCD4" />
          <Text style={[s.statNum, { color: '#00BCD4' }]}>{patientCount}</Text>
          <Text style={s.statLabel}>Patients</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.secondaryLight }]} onPress={() => router.push('/(doctor)/prescriptions')}>
          <Ionicons name="document-text-outline" size={24} color="#1565C0" />
          <Text style={[s.statNum, { color: '#1565C0' }]}>{prescriptionCount}</Text>
          <Text style={s.statLabel}>Prescriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.statCard, { backgroundColor: pendingRequestCount > 0 ? C.amberLight : C.card }]}
          onPress={() => router.push('/(doctor)/appointments')}
        >
          <Ionicons name="time-outline" size={24} color={pendingRequestCount > 0 ? '#d97706' : C.textMuted} />
          <Text style={[s.statNum, { color: pendingRequestCount > 0 ? '#d97706' : C.textMuted }]}>{pendingRequestCount}</Text>
          <Text style={s.statLabel}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.statCard, { backgroundColor: unreadNotifCount > 0 ? C.redLight : C.card }]}
          onPress={() => router.push('/(doctor)/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={unreadNotifCount > 0 ? '#dc2626' : C.textMuted} />
          <Text style={[s.statNum, { color: unreadNotifCount > 0 ? '#dc2626' : C.textMuted }]}>{unreadNotifCount}</Text>
          <Text style={s.statLabel}>Unread</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick Actions ── */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.actionsGrid}>
        <QuickAction icon="calendar-outline"      label="Appointments"   color="#00BCD4" onPress={() => router.push('/(doctor)/appointments')} C={C} />
        <QuickAction icon="people-outline"        label="My Patients"    color="#1565C0" onPress={() => router.push('/(doctor)/connections')} C={C} />
        <QuickAction icon="document-text-outline" label="Prescriptions"  color="#0891b2" onPress={() => router.push('/(doctor)/prescriptions')} C={C} />
        <QuickAction icon="notifications-outline" label="Notifications"  color="#7c3aed" onPress={() => router.push('/(doctor)/notifications')} C={C} />
      </View>

      {/* ── Recent Notifications ── */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>Recent Notifications</Text>
        {unread > 0 && (
          <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{unread} new</Text></View>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={s.emptyNotif}>
          <Text style={s.emptyNotifText}>No notifications yet</Text>
        </View>
      ) : (
        <>
          {notifications.map((n) => (
            <View key={n.id} style={[s.notifCard, !n.isRead && s.notifCardUnread]}>
              <View style={[s.notifIconBox, !n.isRead && { backgroundColor: isDark ? '#0D3340' : '#B2EBF2' }]}>
                <Text style={s.notifIcon}>{NOTIF_ICON[n.type] ?? '🔔'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
              </View>
              {!n.isRead && <View style={s.unreadDot} />}
            </View>
          ))}
          <TouchableOpacity style={s.showMoreBtn} onPress={() => router.push('/(doctor)/notifications')}>
            <Text style={s.showMoreText}>View All Notifications</Text>
            <Ionicons name="arrow-forward" size={14} color="#00BCD4" />
          </TouchableOpacity>
        </>
      )}

      {/* ── Profile Card ── */}
      {profile && (
        <>
          <Text style={s.sectionTitle}>Your Profile</Text>
          <View style={s.profileCard}>
            <ProfileRow icon="medal-outline"   label="Specialization" value={profile.specialization} C={C} />
            <ProfileRow icon="card-outline"    label="License No."    value={profile.licenseNumber} C={C} />
            <ProfileRow icon="business-outline" label="Hospital"      value={profile.hospitalName} C={C} />
          </View>
        </>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function QuickAction({ icon, label, color, onPress, C }: { icon: any; label: string; color: string; onPress: () => void; C: ReturnType<typeof makeColors> }) {
  const qa = makeQaStyles(C);
  return (
    <TouchableOpacity style={[qa.card, { borderColor: color + '30' }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[qa.iconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={qa.label}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProfileRow({ icon, label, value, C }: { icon: any; label: string; value: string; C: ReturnType<typeof makeColors> }) {
  const pr = makePrStyles(C);
  return (
    <View style={pr.row}>
      <Ionicons name={icon} size={16} color={C.textMuted} />
      <Text style={pr.label}>{label}</Text>
      <Text style={pr.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}
