import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { API_BASE_URL } from '@/services/api';
import { useAppTheme } from '@/context/ThemeContext';

type Doctor = {
  id: number;
  fullName: string;
  avatarUrl?: string | null;
  specialization?: string;
  hospitalName?: string;
  maxDailyVisits?: number;
  bio?: string;
  specialties: { id: number; name: string }[];
  hospitalHistory: { id: number; hospitalName: string; startedAt: string; endedAt: string | null }[];
  degrees: { id: number; title: string; institution?: string | null; year?: number | null }[];
  achievements: { id: number; title: string; description?: string | null; year?: number | null }[];
};

function makeColors(isDark: boolean) {
  return {
    bg:       isDark ? '#0F172A' : '#F4F7FE',
    card:     isDark ? '#1E293B' : '#FFFFFF',
    accent:   '#4E8EE8',
    text:     isDark ? '#F8FAFC' : '#1C2B3A',
    textSec:  isDark ? '#94A3B8' : '#5A6C82',
    textMuted:isDark ? '#64748B' : '#94A3B8',
    border:   isDark ? '#334155' : '#DCE7F6',
    chipBg:   isDark ? '#0D3340' : '#EBF3FF',
  };
}

export default function DoctorProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const s = makeStyles(C);

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/api/doctor/public/${id}`)
      .then((r) => setDoctor(r.data))
      .catch((err) => Alert.alert('Error', err?.response?.data?.error || 'Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  const avatarUri = doctor?.avatarUrl
    ? doctor.avatarUrl.startsWith('http') ? doctor.avatarUrl : `${API_BASE_URL}${doctor.avatarUrl}`
    : null;

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }
  if (!doctor) {
    return (
      <View style={[s.center, { backgroundColor: C.bg }]}>
        <Text style={{ color: C.textSec }}>Doctor not found.</Text>
      </View>
    );
  }

  const initials = doctor.fullName.charAt(0).toUpperCase();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.hero}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarFallback]}>
              <Text style={s.avatarLetter}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={s.name}>Dr. {doctor.fullName}</Text>
        {!!doctor.specialization && <Text style={s.specLine}>{doctor.specialization}</Text>}
        {!!doctor.hospitalName && (
          <View style={s.hospitalRow}>
            <Ionicons name="business-outline" size={14} color="#E2EEFF" />
            <Text style={s.hospitalText}>{doctor.hospitalName}</Text>
          </View>
        )}
      </View>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{doctor.specialties?.length ?? 0}</Text>
          <Text style={s.statLabel}>Specialties</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{doctor.degrees?.length ?? 0}</Text>
          <Text style={s.statLabel}>Degrees</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{doctor.achievements?.length ?? 0}</Text>
          <Text style={s.statLabel}>Awards</Text>
        </View>
      </View>

      {!!doctor.bio && (
        <Section C={C} title="About">
          <Text style={s.bodyText}>{doctor.bio}</Text>
        </Section>
      )}

      {doctor.specialties?.length > 0 && (
        <Section C={C} title="Specialties">
          <View style={s.chipWrap}>
            {doctor.specialties.map((sp) => (
              <View key={sp.id} style={s.chip}>
                <Text style={s.chipText}>{sp.name}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}

      {doctor.hospitalHistory?.length > 0 && (
        <Section C={C} title="Hospital History">
          {doctor.hospitalHistory.map((h) => {
            const start = new Date(h.startedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            const end = h.endedAt ? new Date(h.endedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Present';
            const current = !h.endedAt;
            return (
              <View key={h.id} style={s.timelineItem}>
                <View style={[s.timelineDot, current && { backgroundColor: C.accent }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{h.hospitalName}</Text>
                  <Text style={s.itemSub}>{start} — {end}</Text>
                </View>
              </View>
            );
          })}
        </Section>
      )}

      {doctor.degrees?.length > 0 && (
        <Section C={C} title="Education">
          {doctor.degrees.map((d) => (
            <View key={d.id} style={s.row}>
              <Ionicons name="school-outline" size={18} color={C.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.itemTitle}>{d.title}</Text>
                {(d.institution || d.year) && (
                  <Text style={s.itemSub}>
                    {d.institution || ''}{d.institution && d.year ? ' · ' : ''}{d.year || ''}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </Section>
      )}

      {doctor.achievements?.length > 0 && (
        <Section C={C} title="Achievements">
          {doctor.achievements.map((a) => (
            <View key={a.id} style={s.row}>
              <Ionicons name="trophy-outline" size={18} color="#F59E0B" style={{ marginTop: 2 }} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.itemTitle}>{a.title}{a.year ? ` (${a.year})` : ''}</Text>
                {!!a.description && <Text style={s.itemSub}>{a.description}</Text>}
              </View>
            </View>
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

function Section({ C, title, children }: { C: any; title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border }}>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
    hero:          { backgroundColor: C.accent, paddingTop: 56, paddingBottom: 28, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    backBtn:       { position: 'absolute', top: 48, left: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    avatarWrap:    { width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: 'rgba(255,255,255,0.35)', padding: 2, backgroundColor: 'rgba(255,255,255,0.16)', marginBottom: 12 },
    avatar:        { width: '100%', height: '100%', borderRadius: 52 },
    avatarFallback:{ justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
    avatarLetter:  { color: '#fff', fontSize: 40, fontWeight: '800' },
    name:          { color: '#fff', fontSize: 22, fontWeight: '800' },
    specLine:      { color: '#DCEBFF', fontSize: 14, fontWeight: '600', marginTop: 2 },
    hospitalRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
    hospitalText:  { color: '#E2EEFF', fontSize: 13 },
    statsRow:      { flexDirection: 'row', marginHorizontal: 16, marginTop: -18, gap: 10 },
    statCard:      { flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    statValue:     { color: C.text, fontSize: 20, fontWeight: '800' },
    statLabel:     { color: C.textSec, fontSize: 12, marginTop: 2 },
    bodyText:      { color: C.text, fontSize: 14, lineHeight: 21 },
    chipWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:          { backgroundColor: C.chipBg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    chipText:      { color: C.accent, fontSize: 12, fontWeight: '700' },
    row:           { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    timelineItem:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    timelineDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: C.border, marginTop: 6, marginRight: 12 },
    itemTitle:     { color: C.text, fontSize: 14, fontWeight: '700' },
    itemSub:       { color: C.textSec, fontSize: 12, marginTop: 2 },
  });
}
