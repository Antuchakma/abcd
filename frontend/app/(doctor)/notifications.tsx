import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import api from '@/services/api';
import { useSocket } from '@/context/SocketContext';
import { useAppTheme } from '@/context/ThemeContext';

const TYPE_ROUTE: Record<string, string> = {
  appointment_request:    '/(doctor)/appointments',
  appointment_approved:   '/(doctor)/appointments',
  appointment_rejected:   '/(doctor)/appointments',
  visit_started:          '/(doctor)/appointments',
  visit_completed:        '/(doctor)/appointments',
  followup_scheduled:     '/(doctor)/appointments',
  prescription_issued:    '/(doctor)/prescriptions',
  report_uploaded:        '/(doctor)/appointments',
  new_connection_request: '/(doctor)/connections',
  connection_updated:     '/(doctor)/connections',
  connection_rejected:    '/(doctor)/connections',
};

const TYPE_META: Record<string, { icon: string; color: string }> = {
  appointment_request:   { icon: '📋', color: '#1565C0' },
  appointment_approved:  { icon: '✅', color: '#00BCD4' },
  appointment_rejected:  { icon: '❌', color: '#dc2626' },
  visit_started:         { icon: '🏥', color: '#00BCD4' },
  visit_completed:       { icon: '🎉', color: '#1565C0' },
  prescription_issued:   { icon: '💊', color: '#00BCD4' },
  report_uploaded:       { icon: '📄', color: '#d97706' },
  followup_scheduled:    { icon: '📅', color: '#1565C0' },
  new_connection_request:{ icon: '👤', color: '#1565C0' },
  connection_updated:    { icon: '🔗', color: '#00BCD4' },
  connection_rejected:   { icon: '🚫', color: '#dc2626' },
};

function getMeta(type: string) {
  return TYPE_META[type] ?? { icon: '🔔', color: '#00BCD4' };
}

function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#f8fafc',
    card:         isDark ? '#1E293B' : '#fff',
    primaryLight: isDark ? '#0D3340' : '#e0f7fa',
    border:       isDark ? '#334155' : '#f1f5f9',
    text:         isDark ? '#F1F5F9' : '#1e293b',
    textSec:      isDark ? '#94A3B8' : '#475569',
    textMuted:    isDark ? '#64748B' : '#94a3b8',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
    headerCount: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
    unreadBadge: { backgroundColor: '#00BCD4', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    unreadBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    list: { padding: 14, gap: 10 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIcon: { fontSize: 56, marginBottom: 14 },
    emptyText: { fontSize: 16, fontWeight: '700', color: C.textSec, marginBottom: 6 },
    emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
    card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card, borderRadius: 14, padding: 14, gap: 12, borderLeftWidth: 3, borderLeftColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    cardUnread: { backgroundColor: C.primaryLight },
    iconBox: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    icon: { fontSize: 20 },
    body: { flex: 1 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    title: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
    dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
    bodyText: { fontSize: 13, color: C.textSec, lineHeight: 19 },
    time: { fontSize: 11, color: C.textMuted, marginTop: 5 },
  });
}

export default function DoctorNotifications() {
  const { clearUnreadNotifCount } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BCD4" />;

  return (
    <View style={styles.root}>
      {notifications.length > 0 && (
        <View style={styles.headerRow}>
          <Text style={styles.headerCount}>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread} unread</Text>
            </View>
          )}
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySub}>Patient requests and appointment updates appear here</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const meta = getMeta(item.type);
            return (
              <TouchableOpacity
                style={[styles.card, !item.isRead && styles.cardUnread, { borderLeftColor: meta.color }]}
                onPress={() => handlePress(item)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconBox, { backgroundColor: meta.color + '18' }]}>
                  <Text style={styles.icon}>{meta.icon}</Text>
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    {!item.isRead && <View style={[styles.dot, { backgroundColor: meta.color }]} />}
                  </View>
                  <Text style={styles.bodyText}>{item.body}</Text>
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
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 2) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
