import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { useSocket } from '@/context/SocketContext';
import { useAppTheme } from '@/context/ThemeContext';

const TYPE_ROUTE: Record<string, string> = {
  appointment_request:    '/(patient)/appointments',
  appointment_approved:   '/(patient)/appointments',
  appointment_rejected:   '/(patient)/appointments',
  visit_started:          '/(patient)/appointments',
  visit_completed:        '/(patient)/appointments',
  followup_scheduled:     '/(patient)/appointments',
  prescription_issued:    '/(patient)/prescriptions',
  report_uploaded:        '/(patient)/health',
  new_connection_request: '/(patient)/connections',
  connection_updated:     '/(patient)/connections',
  connection_rejected:    '/(patient)/connections',
};

function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#F4F7FE',
    card:         isDark ? '#1E293B' : '#FFFFFF',
    primary:      '#4E8EE8',
    primaryLight: isDark ? '#1E3A5F' : '#EBF3FF',
    primaryPale:  isDark ? '#1A2E4A' : '#F5F8FF',
    text:         isDark ? '#F1F5F9' : '#1C2B3A',
    textSec:      isDark ? '#94A3B8' : '#5A6C82',
    textMuted:    isDark ? '#64748B' : '#9AAFC2',
    border:       isDark ? '#334155' : '#DDE9FF',
    green:        '#2ECC9B',
    greenLight:   isDark ? '#0D2E22' : '#E8FAF3',
    amber:        '#F5A435',
    amberLight:   isDark ? '#2E1F07' : '#FFF5E5',
    red:          '#E85A6A',
    redLight:     isDark ? '#3D1219' : '#FEECEE',
  };
}

function makeGetMeta(C: ReturnType<typeof makeColors>) {
  const TYPE_META: Record<string, { icon: string; color: string; bg: string }> = {
    appointment_request:   { icon: '📋', color: C.primary,  bg: C.primaryLight  },
    appointment_approved:  { icon: '✅', color: C.green,    bg: C.greenLight    },
    appointment_rejected:  { icon: '❌', color: C.red,      bg: C.redLight      },
    visit_started:         { icon: '🏥', color: C.green,    bg: C.greenLight    },
    visit_completed:       { icon: '🎉', color: C.primary,  bg: C.primaryLight  },
    prescription_issued:   { icon: '💊', color: C.primary,  bg: C.primaryLight  },
    report_uploaded:       { icon: '📄', color: C.amber,    bg: C.amberLight    },
    followup_scheduled:    { icon: '📅', color: C.primary,  bg: C.primaryLight  },
    new_connection_request:{ icon: '👤', color: C.primary,  bg: C.primaryLight  },
    connection_updated:    { icon: '🔗', color: C.green,    bg: C.greenLight    },
    connection_rejected:   { icon: '🚫', color: C.red,      bg: C.redLight      },
  };
  return (type: string) => TYPE_META[type] ?? { icon: '🔔', color: C.primary, bg: C.primaryLight };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    summaryBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    summaryCount:    { fontSize: 13, color: C.textSec, fontWeight: '600' },
    unreadPill:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    unreadDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary },
    unreadPillText:  { fontSize: 11, fontWeight: '700', color: C.primary },
    list: { padding: 14, gap: 10 },
    empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIconBox:{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    emptyTitle:  { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 7 },
    emptySub:    { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: C.card,
      borderRadius: 18,
      padding: 14,
      gap: 12,
      borderLeftWidth: 3.5,
      borderLeftColor: 'transparent',
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    cardUnread:  { backgroundColor: C.primaryPale },
    iconBox:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    body:        { flex: 1 },
    titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    title:       { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
    dot:         { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
    bodyText:    { fontSize: 13, color: C.textSec, lineHeight: 19 },
    time:        { fontSize: 11, color: C.textMuted, marginTop: 6, fontWeight: '500' },
  });
}

export default function PatientNotifications() {
  const { clearUnreadNotifCount } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);
  const getMeta = makeGetMeta(C);

  useFocusEffect(
    useCallback(() => { load(); }, [])
  );

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/api/notifications');
      setNotifications(r.data);
      clearUnreadNotifCount();
      api.patch('/api/notifications/mark-all-read').catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handlePress(item: any) {
    if (!item.isRead) {
      api.patch(`/api/notifications/${item.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, isRead: true } : n));
    }
    const route = TYPE_ROUTE[item.type];
    if (route) router.push(route as any);
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );

  return (
    <View style={styles.root}>
      {notifications.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryCount}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </Text>
          {unread > 0 && (
            <View style={styles.unreadPill}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadPillText}>{unread} unread</Text>
            </View>
          )}
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="notifications-outline" size={38} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications Yet</Text>
          <Text style={styles.emptySub}>Appointment updates and alerts will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const meta = getMeta(item.type);
            return (
              <TouchableOpacity
                style={[styles.card, !item.isRead && styles.cardUnread, { borderLeftColor: meta.color }]}
                onPress={() => handlePress(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
                  <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    {!item.isRead && <View style={[styles.dot, { backgroundColor: meta.color }]} />}
                  </View>
                  <Text style={styles.bodyText} numberOfLines={2}>{item.body}</Text>
                  <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function formatTime(iso: string) {
  const d    = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
