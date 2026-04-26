import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useAppTheme } from '@/context/ThemeContext';
import api, { paymentsApi } from '@/services/api';

/* ── design tokens ──────────────────────────────────────────── */
function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#F4F7FE',
    card:         isDark ? '#1E293B' : '#FFFFFF',
    primary:      '#4E8EE8',
    primaryLight: isDark ? '#1E3A5F' : '#EBF3FF',
    primaryPale:  isDark ? '#1A2F50' : '#F5F8FF',
    text:         isDark ? '#F1F5F9' : '#1C2B3A',
    textSec:      isDark ? '#94A3B8' : '#5A6C82',
    textMuted:    isDark ? '#64748B' : '#9AAFC2',
    border:       isDark ? '#334155' : '#DDE9FF',
    green:        '#2ECC9B',
    greenLight:   isDark ? '#0D2E22' : '#E8FAF3',
    amber:        '#F5A435',
    amberLight:   isDark ? '#3D2E0E' : '#FFF5E5',
    red:          '#E85A6A',
    redLight:     isDark ? '#3D1219' : '#FEECEE',
    purple:       '#8B75E8',
    purpleLight:  isDark ? '#2D2B45' : '#F0EDFF',
  };
}

const NOTIF_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  appointment_request: 'calendar-outline',
  appointment_approved: 'checkmark-circle-outline',
  appointment_rejected: 'close-circle-outline',
  visit_started: 'medkit-outline',
  visit_completed: 'checkmark-done-outline',
  prescription_issued: 'document-text-outline',
  report_uploaded: 'document-attach-outline',
  followup_scheduled: 'time-outline',
  new_connection_request: 'person-add-outline',
  connection_updated: 'link-outline',
  connection_rejected: 'close-outline',
};

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const { unreadNotifCount } = useSocket();
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const { s, sh, qa } = makeStyles(C);

  const [profile, setProfile]                   = useState<any>(null);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [reportCount, setReportCount]           = useState(0);
  const [notifications, setNotifications]       = useState<any[]>([]);
  const [upcomingAppts, setUpcomingAppts]       = useState<any[]>([]);
  const [nextAppt, setNextAppt]                 = useState<any>(null);
  const [latestMedicines, setLatestMedicines]   = useState<any[]>([]);
  const [refreshing, setRefreshing]             = useState(false);
  const [unpaidCount, setUnpaidCount]           = useState(0);
  const [unpaidTotal, setUnpaidTotal]           = useState(0);
  const [awaitingCount, setAwaitingCount]       = useState(0);

  /* entrance animation */
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  async function fetchData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    try {
      const [profileRes, prescRes, reportRes, notifRes, apptRes, paymentsRes] = await Promise.allSettled([
        api.get('/api/patient/profile'),
        api.get('/api/prescriptions'),
        api.get('/api/reports'),
        api.get('/api/notifications'),
        api.get('/api/appointments'),
        paymentsApi.mine(),
      ]);
      if (paymentsRes.status === 'fulfilled') {
        const pending = paymentsRes.value.filter((p) => p.status === 'PENDING');
        const awaiting = paymentsRes.value.filter((p) => p.status === 'AWAITING_CONFIRMATION');
        setUnpaidCount(pending.length);
        setUnpaidTotal(pending.reduce((s, p) => s + p.amount, 0));
        setAwaitingCount(awaiting.length);
      }
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      if (prescRes.status === 'fulfilled') {
        const prescriptions = prescRes.value.data;
        setPrescriptionCount(prescriptions.length);
        const meds = prescriptions[0]?.medicines ?? [];
        setLatestMedicines(meds.slice(0, 3));
      }
      if (reportRes.status === 'fulfilled') setReportCount(reportRes.value.data.length);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.slice(0, 4));
      if (apptRes.status === 'fulfilled') {
        const upcoming = apptRes.value.data.filter(
          (a: any) => a.status === 'SCHEDULED' || a.status === 'ONGOING'
        );
        setUpcomingAppts(upcoming);
        setNextAppt(upcoming[0] ?? null);
      }
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  }

  const dob   = profile?.dateOfBirth ? new Date(profile.dateOfBirth) : null;
  const age   = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;
  const unread = notifications.filter((n) => !n.isRead).length;
  const today  = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Animated.ScrollView
      style={[s.container, { opacity: fadeAnim }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />}
    >
      <Animated.View style={[s.hero, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroDate}>{today}</Text>
            <Text style={s.heroGreeting}>{user?.fullName?.split(' ')[0] ?? 'Patient'}</Text>
          </View>
          <TouchableOpacity style={s.avatarCircle} onPress={handleLogout}>
            <Text style={s.avatarLetter}>
              {user?.fullName?.charAt(0)?.toUpperCase() ?? 'P'}
            </Text>
          </TouchableOpacity>
        </View>

        {profile && (profile.bloodGroup || age !== null || profile.gender) && (
          <View style={s.pillsRow}>
            {profile.bloodGroup ? (
              <View style={s.pill}>
                <Text style={s.pillLabel}>Blood</Text>
                <Text style={s.pillValue}>{profile.bloodGroup}</Text>
              </View>
            ) : null}
            {age !== null ? (
              <View style={s.pill}>
                <Text style={s.pillLabel}>Age</Text>
                <Text style={s.pillValue}>{age}</Text>
              </View>
            ) : null}
            {profile.gender ? (
              <View style={s.pill}>
                <Text style={s.pillLabel}>Sex</Text>
                <Text style={s.pillValue}>{profile.gender}</Text>
              </View>
            ) : null}
          </View>
        )}
      </Animated.View>

      {(unpaidCount > 0 || awaitingCount > 0) && (
        <TouchableOpacity
          onPress={() => router.push('/(patient)/payments')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: unpaidCount > 0 ? C.redLight : C.amberLight,
            borderWidth: 1,
            borderColor: unpaidCount > 0 ? C.red : C.amber,
            borderRadius: 14,
            padding: 14,
            marginHorizontal: 16,
            marginTop: 14,
          }}
        >
          <Ionicons
            name={unpaidCount > 0 ? 'alert-circle' : 'hourglass-outline'}
            size={22}
            color={unpaidCount > 0 ? C.red : C.amber}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: unpaidCount > 0 ? C.red : C.amber, fontWeight: '700' }}>
              {unpaidCount > 0
                ? `Uncleared payment${unpaidCount === 1 ? '' : 's'} — ৳${unpaidTotal}`
                : `Awaiting doctor confirmation (${awaitingCount})`}
            </Text>
            <Text style={{ color: C.textSec, fontSize: 12, marginTop: 2 }}>
              {unpaidCount > 0
                ? 'Tap to pay and clear the reminder.'
                : 'Your doctor will mark it done soon.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={unpaidCount > 0 ? C.red : C.amber} />
        </TouchableOpacity>
      )}

      {/* ── Upcoming Appointment Card ────────────────────────────── */}
      {nextAppt ? (
        <TouchableOpacity
          style={s.apptCard}
          onPress={() => router.push('/(patient)/appointments')}
          activeOpacity={0.88}
        >
          <View style={s.apptCardAccent} />
          <View style={s.apptCardBody}>
            <View style={s.apptCardTop}>
              <View style={[s.apptStatusPill,
                nextAppt.status === 'ONGOING'
                  ? { backgroundColor: C.greenLight }
                  : { backgroundColor: C.primaryLight }
              ]}>
                <View style={[s.apptStatusDot,
                  { backgroundColor: nextAppt.status === 'ONGOING' ? C.green : C.primary }
                ]} />
                <Text style={[s.apptStatusText,
                  { color: nextAppt.status === 'ONGOING' ? C.green : C.primary }
                ]}>
                  {nextAppt.status === 'ONGOING' ? 'In Progress' : 'Upcoming'}
                </Text>
              </View>
              <View style={s.serialChip}>
                <Text style={s.serialText}>#{nextAppt.serialNumber}</Text>
              </View>
            </View>
            <Text style={s.apptDoctorName}>Dr. {nextAppt.doctor?.user?.fullName}</Text>
            <View style={s.apptMetaRow}>
              <Ionicons name="medical-outline" size={12} color={C.textMuted} />
              <Text style={s.apptMeta}>{nextAppt.doctor?.specialization}</Text>
              <Text style={s.apptMetaDot}>·</Text>
              <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
              <Text style={s.apptMeta}>
                {new Date(nextAppt.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.primary} style={{ alignSelf: 'center', marginRight: 4 }} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={s.noApptCard}
          onPress={() => router.push('/(patient)/appointments')}
          activeOpacity={0.88}
        >
          <View style={s.noApptIconBox}>
            <Ionicons name="calendar-outline" size={22} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.noApptText}>No upcoming appointments</Text>
            <Text style={s.noApptSub}>Tap to request one from your doctor</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </TouchableOpacity>
      )}

      {/* ── Stats Row ───────────────────────────────────────────── */}
      <View style={s.statsRow}>
        <TouchableOpacity style={[s.statCard, { backgroundColor: C.primaryLight }]} onPress={() => router.push('/(patient)/prescriptions')}>
          <View style={[s.statIcon, { backgroundColor: C.primary + '18' }]}>
            <Ionicons name="document-text-outline" size={18} color={C.primary} />
          </View>
          <Text style={[s.statNum, { color: C.primary }]}>{prescriptionCount}</Text>
          <Text style={s.statLabel}>Prescriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.statCard, { backgroundColor: C.greenLight }]} onPress={() => router.push('/(patient)/health')}>
          <View style={[s.statIcon, { backgroundColor: C.green + '18' }]}>
            <Ionicons name="pulse-outline" size={18} color={C.green} />
          </View>
          <Text style={[s.statNum, { color: C.green }]}>{reportCount}</Text>
          <Text style={s.statLabel}>Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.statCard, { backgroundColor: unreadNotifCount > 0 ? C.amberLight : C.primaryLight }]}
          onPress={() => router.push('/(patient)/notifications')}
        >
          <View style={[s.statIcon, { backgroundColor: (unreadNotifCount > 0 ? C.amber : C.primary) + '18' }]}>
            <Ionicons name="notifications-outline" size={18} color={unreadNotifCount > 0 ? C.amber : C.primary} />
          </View>
          <Text style={[s.statNum, { color: unreadNotifCount > 0 ? C.amber : C.primary }]}>{unreadNotifCount}</Text>
          <Text style={s.statLabel}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.statCard, { backgroundColor: C.purpleLight }]} onPress={() => router.push('/(patient)/appointments')}>
          <View style={[s.statIcon, { backgroundColor: C.purple + '18' }]}>
            <Ionicons name="calendar-outline" size={18} color={C.purple} />
          </View>
          <Text style={[s.statNum, { color: C.purple }]}>{upcomingAppts.length}</Text>
          <Text style={s.statLabel}>Upcoming</Text>
        </TouchableOpacity>
      </View>

      {latestMedicines.length > 0 && (
        <>
          <SectionHeader title="Current medicines" icon="medkit-outline" onPress={() => router.push('/(patient)/prescriptions')} C={C} sh={sh} />
          <View style={s.medCard}>
            {latestMedicines.map((m: any, i: number) => (
              <View key={m.id} style={[s.medRow, i < latestMedicines.length - 1 && s.medRowBorder]}>
                <View style={s.medDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.medName}>{m.medicine?.name}</Text>
                  <Text style={s.medDetail}>{m.dosage}  ·  {m.frequency}  ·  {m.duration}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={s.medSeeAll} onPress={() => router.push('/(patient)/prescriptions')}>
              <Text style={s.medSeeAllText}>See full prescription</Text>
              <Ionicons name="arrow-forward" size={13} color={C.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Quick Actions ────────────────────────────────────────── */}
      <SectionHeader title="Quick Actions" icon="grid-outline" C={C} sh={sh} />
      <View style={s.actionsGrid}>
        <QuickAction icon="calendar-outline"     label="Book Visit"      color={C.primary}  bg={C.primaryLight} onPress={() => router.push('/(patient)/appointments')} C={C} qa={qa} />
        <QuickAction icon="people-outline"       label="My Doctors"     color={C.green}    bg={C.greenLight}   onPress={() => router.push('/(patient)/connections')} C={C} qa={qa} />
        <QuickAction icon="document-text-outline" label="Prescriptions" color={C.purple}   bg={C.purpleLight}  onPress={() => router.push('/(patient)/prescriptions')} C={C} qa={qa} />
        <QuickAction icon="pulse-outline"        label="Health Data"    color={C.amber}    bg={C.amberLight}   onPress={() => router.push('/(patient)/health')} C={C} qa={qa} />
      </View>

      {/* ── Recent Notifications ─────────────────────────────────── */}
      <View style={s.sectionRow}>
        <SectionHeader title="Notifications" icon="notifications-outline" onPress={() => router.push('/(patient)/notifications')} C={C} sh={sh} />
        {unread > 0 && <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{unread} new</Text></View>}
      </View>

      {notifications.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="notifications-outline" size={24} color={C.textMuted} />
          <Text style={s.emptyCardText}>No notifications yet</Text>
        </View>
      ) : (
        <>
          {notifications.map((n) => (
            <View key={n.id} style={[s.notifCard, !n.isRead && s.notifCardUnread]}>
              <View style={[s.notifIconBox, !n.isRead && { backgroundColor: C.primaryLight }]}>
                <Ionicons
                  name={NOTIF_ICON[n.type] ?? 'notifications-outline'}
                  size={16}
                  color={!n.isRead ? C.primary : C.textSec}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.notifTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={s.notifBody} numberOfLines={2}>{n.body}</Text>
              </View>
              {!n.isRead && <View style={s.unreadDot} />}
            </View>
          ))}
          <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push('/(patient)/notifications')}>
            <Text style={s.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={13} color={C.primary} />
          </TouchableOpacity>
        </>
      )}

      {/* ── Logout ───────────────────────────────────────────────── */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={16} color={C.red} />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </Animated.ScrollView>
  );
}

/* ── sub-components ──────────────────────────────────────────── */
function SectionHeader({ title, icon, onPress, C, sh }: { title: string; icon: any; onPress?: () => void; C: ReturnType<typeof makeColors>; sh: any }) {
  return (
    <View style={sh.row}>
      <Ionicons name={icon} size={15} color={C.textSec} style={{ marginRight: 6 }} />
      <Text style={sh.title}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress} style={sh.seeAll}>
          <Text style={sh.seeAllText}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function QuickAction({ icon, label, color, bg, onPress, C, qa }: {
  icon: any; label: string; color: string; bg: string; onPress: () => void;
  C: ReturnType<typeof makeColors>; qa: any;
}) {
  return (
    <TouchableOpacity style={[qa.card, { backgroundColor: C.card }]} onPress={onPress} activeOpacity={0.82}>
      <View style={[qa.iconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={qa.label}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ── styles ──────────────────────────────────────────────────── */
function makeStyles(C: ReturnType<typeof makeColors>) {
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content:   { paddingBottom: 40 },

    /* hero */
    hero: {
      backgroundColor: C.card,
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 24,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      shadowColor: C.primary,
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
      marginBottom: 16,
    },
    heroTop:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    heroDate:    { fontSize: 12, color: C.textSec, fontWeight: '500', marginBottom: 4, letterSpacing: 0.3 },
    heroGreeting:{ fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    avatarCircle:{
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: C.primaryLight,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarLetter:{ fontSize: 18, fontWeight: '800', color: C.primary },
    pillsRow:    { flexDirection: 'row', gap: 18, marginTop: 4 },
    pill:        { flexDirection: 'column' },
    pillLabel:   { fontSize: 10, color: C.textMuted, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
    pillValue:   { fontSize: 14, color: C.text, fontWeight: '700', marginTop: 2 },

    /* appointment card */
    apptCard: {
      marginHorizontal: 16,
      marginBottom: 14,
      backgroundColor: C.primaryLight,
      borderRadius: 18,
      flexDirection: 'row',
      overflow: 'hidden',
      shadowColor: C.primary,
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 4,
      borderWidth: 1.5,
      borderColor: C.border,
    },
    apptCardAccent: { width: 6, backgroundColor: C.primary },
    apptCardBody:   { flex: 1, padding: 16 },
    apptCardTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    apptStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    apptStatusDot:  { width: 6, height: 6, borderRadius: 3 },
    apptStatusText: { fontSize: 11, fontWeight: '700' },
    serialChip:     { backgroundColor: C.primary + '22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
    serialText:     { fontSize: 12, fontWeight: '800', color: C.primary },
    apptDoctorName: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6, letterSpacing: -0.2 },
    apptMetaRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
    apptMeta:       { fontSize: 12, color: C.textSec },
    apptMetaDot:    { fontSize: 12, color: C.textMuted, marginHorizontal: 2 },

    noApptCard: {
      marginHorizontal: 16,
      marginBottom: 14,
      backgroundColor: C.primaryLight,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
      shadowColor: C.primary,
      shadowOpacity: 0.10,
      shadowRadius: 10,
      elevation: 3,
      borderWidth: 1.5,
      borderColor: C.border,
    },
    noApptIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary + '20', justifyContent: 'center', alignItems: 'center' },
    noApptText:    { fontSize: 14, fontWeight: '700', color: C.text },
    noApptSub:     { fontSize: 12, color: C.textSec, marginTop: 2 },

    /* stats */
    statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', gap: 6 },
    statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    statNum:  { fontSize: 20, fontWeight: '800' },
    statLabel:{ fontSize: 10, color: C.textSec, fontWeight: '600', textAlign: 'center' },

    /* medicine card */
    medCard: {
      marginHorizontal: 16,
      marginBottom: 20,
      backgroundColor: C.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 6,
      shadowColor: C.primary,
      shadowOpacity: 0.07,
      shadowRadius: 12,
      elevation: 3,
    },
    medRow:           { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    medRowBorder:     { borderBottomWidth: 1, borderBottomColor: C.bg },
    medDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: C.amber },
    medName:          { fontSize: 14, fontWeight: '700', color: C.text },
    medDetail:        { fontSize: 12, color: C.textSec, marginTop: 2 },
    medSeeAll:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: C.bg },
    medSeeAllText:    { fontSize: 13, fontWeight: '700', color: C.primary },

    /* quick actions */
    actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, marginBottom: 20 },

    /* section headers */
    sectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
    unreadBadge: { marginLeft: 8, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    unreadBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },

    /* notifications */
    emptyCard: {
      marginHorizontal: 16, marginBottom: 20,
      backgroundColor: C.card, borderRadius: 14, padding: 20,
      alignItems: 'center', gap: 8,
    },
    emptyCardText: { fontSize: 13, color: C.textSec },
    notifCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.card, borderRadius: 14,
      padding: 14, marginHorizontal: 16, marginBottom: 8, gap: 12,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    notifCardUnread: { backgroundColor: C.primaryPale, borderLeftWidth: 3, borderLeftColor: C.primary },
    notifIconBox:    { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
    notifTitle:      { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
    notifBody:       { fontSize: 12, color: C.textSec, lineHeight: 17 },
    unreadDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
    viewAllBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, marginBottom: 20 },
    viewAllText:     { fontSize: 13, fontWeight: '700', color: C.primary },

    /* logout */
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginHorizontal: 16, marginTop: 6, marginBottom: 8,
      backgroundColor: C.redLight, borderRadius: 14, padding: 14,
    },
    logoutText: { color: C.red, fontWeight: '700', fontSize: 14 },
  });

  const sh = StyleSheet.create({
    row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
    title:    { fontSize: 15, fontWeight: '800', color: C.text, flex: 1 },
    seeAll:   { paddingVertical: 2, paddingHorizontal: 4 },
    seeAllText:{ fontSize: 12, fontWeight: '700', color: C.primary },
  });

  const qa = StyleSheet.create({
    card: {
      width: '47%',
      borderRadius: 18, padding: 16,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
      borderWidth: 1, borderColor: C.border,
    },
    iconBox: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    label:   { fontSize: 13, fontWeight: '700', color: C.text },
  });

  return { s, sh, qa };
}
