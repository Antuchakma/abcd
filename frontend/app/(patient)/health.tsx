import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Dimensions, RefreshControl, TouchableOpacity, Animated,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api from '@/services/api';
import { useAppTheme } from '@/context/ThemeContext';

const SCREEN_W = Dimensions.get('window').width;

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
    trackBg:      isDark ? '#334155' : '#EDF2FF',
    statsRowBg:   isDark ? '#0F172A' : '#F4F7FE',
    trendPillBg:  isDark ? '#334155' : '#F4F7FE',
    timelineBorder: isDark ? '#334155' : '#F0F5FF',
  };
}

/* ── metric metadata ──────────────────────────────────────────── */
interface MetricMeta {
  label: string;
  icon: string;
  color: string;
  unit: string;
  category: string;
  normalMin?: number;
  normalMax?: number;
  lowerBetter?: boolean;
  rangeLabel?: string;
}

const META: Record<string, MetricMeta> = {
  blood_glucose:     { label: 'Blood Glucose',     icon: '🩸', color: '#E85A6A', unit: 'mg/dL', category: 'Blood Sugar',    normalMin: 70,   normalMax: 140,  rangeLabel: '70–140'    },
  fasting_glucose:   { label: 'Fasting Glucose',   icon: '🩸', color: '#F5A435', unit: 'mg/dL', category: 'Blood Sugar',    normalMin: 70,   normalMax: 100,  rangeLabel: '70–100'    },
  hba1c:             { label: 'HbA1c',             icon: '💉', color: '#F59E0B', unit: '%',     category: 'Blood Sugar',    normalMax: 5.7,  lowerBetter: true, rangeLabel: '<5.7%'   },
  cholesterol_total: { label: 'Total Cholesterol',  icon: '🫀', color: '#8B75E8', unit: 'mg/dL', category: 'Cardiovascular', normalMax: 200,  lowerBetter: true, rangeLabel: '<200'    },
  cholesterol_ldl:   { label: 'LDL Cholesterol',   icon: '🫀', color: '#A78BFA', unit: 'mg/dL', category: 'Cardiovascular', normalMax: 100,  lowerBetter: true, rangeLabel: '<100'    },
  cholesterol_hdl:   { label: 'HDL Cholesterol',   icon: '🫀', color: '#2ECC9B', unit: 'mg/dL', category: 'Cardiovascular', normalMin: 40,   lowerBetter: false, rangeLabel: '>40'    },
  triglycerides:     { label: 'Triglycerides',     icon: '🧪', color: '#F5A435', unit: 'mg/dL', category: 'Cardiovascular', normalMax: 150,  lowerBetter: true, rangeLabel: '<150'    },
  systolic_bp:       { label: 'Systolic BP',       icon: '💗', color: '#EC4899', unit: 'mmHg',  category: 'Cardiovascular', normalMax: 120,  lowerBetter: true, rangeLabel: '<120'    },
  diastolic_bp:      { label: 'Diastolic BP',      icon: '💗', color: '#DB2777', unit: 'mmHg',  category: 'Cardiovascular', normalMax: 80,   lowerBetter: true, rangeLabel: '<80'     },
  hemoglobin:        { label: 'Hemoglobin',        icon: '🩺', color: '#06B6D4', unit: 'g/dL',  category: 'Blood',          normalMin: 12,   normalMax: 17.5,  rangeLabel: '12–17.5' },
  weight:            { label: 'Weight',            icon: '⚖️', color: '#4E8EE8', unit: 'kg',    category: 'Body'            },
  bmi:               { label: 'BMI',               icon: '📊', color: '#2ECC9B', unit: '',      category: 'Body',           normalMin: 18.5, normalMax: 24.9,  rangeLabel: '18.5–24.9' },
  sugar:             { label: 'Blood Sugar',       icon: '🩸', color: '#E85A6A', unit: 'mg/dL', category: 'Blood Sugar'     },
  cholesterol:       { label: 'Cholesterol',       icon: '🫀', color: '#8B75E8', unit: 'mg/dL', category: 'Cardiovascular', normalMax: 200,  lowerBetter: true },
  blood_pressure:    { label: 'Blood Pressure',    icon: '💗', color: '#EC4899', unit: 'mmHg',  category: 'Cardiovascular', normalMax: 120,  lowerBetter: true },
};

function getMetaForType(type: string, primary: string): MetricMeta {
  return META[type.toLowerCase()] ?? {
    label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: '📈', color: primary, unit: '', category: 'Other',
  };
}

type Status = 'normal' | 'high' | 'low' | 'borderline' | 'unknown';

function getStatus(value: number, meta: MetricMeta): Status {
  const { normalMin, normalMax } = meta;
  if (!normalMin && !normalMax) return 'unknown';
  if (normalMin !== undefined && normalMax !== undefined) {
    if (value < normalMin) return 'low';
    if (value > normalMax) return 'high';
    return 'normal';
  }
  if (normalMax !== undefined) {
    if (value <= normalMax) return 'normal';
    if (value <= normalMax * 1.2) return 'borderline';
    return 'high';
  }
  if (normalMin !== undefined) {
    if (value >= normalMin) return 'normal';
    return 'low';
  }
  return 'unknown';
}

function makeStatusConfig(C: ReturnType<typeof makeColors>) {
  return {
    normal:     { label: 'Normal',     bg: C.greenLight,   text: C.green,    dot: C.green    },
    borderline: { label: 'Borderline', bg: C.amberLight,   text: C.amber,    dot: C.amber    },
    high:       { label: 'High',       bg: C.redLight,     text: C.red,      dot: C.red      },
    low:        { label: 'Low',        bg: C.primaryLight, text: C.primary,  dot: C.primary  },
    unknown:    { label: '',           bg: 'transparent',  text: C.textMuted, dot: C.textMuted },
  } as Record<Status, { label: string; bg: string; text: string; dot: string }>;
}

/* ── range bar ────────────────────────────────────────────────── */
function RangeBar({ value, meta }: { value: number; meta: MetricMeta }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const { normalMin, normalMax } = meta;
  if (!normalMin && !normalMax) return null;

  let pct = 0;
  const lo      = normalMin ?? 0;
  const hi      = normalMax ?? lo * 3;
  const span    = hi - lo;
  const dispMax = hi + span * 0.5;

  if (normalMin !== undefined && normalMax !== undefined) {
    pct = Math.min(100, Math.max(0, (value / dispMax) * 100));
  } else if (normalMax !== undefined) {
    pct = Math.min(100, (value / (normalMax * 1.5)) * 100);
  } else if (normalMin !== undefined) {
    pct = Math.min(100, (value / (normalMin * 2)) * 100);
  }

  const markerLeft = `${Math.min(96, Math.max(2, pct))}%`;
  const status     = getStatus(value, meta);
  const barColor   = status === 'normal' ? C.green : status === 'high' ? C.red : status === 'low' ? C.primary : C.amber;

  const rb = StyleSheet.create({
    wrap:       { marginTop: 10, marginBottom: 6 },
    track:      { height: 8, backgroundColor: C.trackBg, borderRadius: 4, position: 'relative', overflow: 'visible' },
    fill:       { height: '100%', borderRadius: 4 },
    normalZone: { position: 'absolute', top: 0, height: '100%', backgroundColor: C.green + '22', borderRadius: 4 },
    marker:     { position: 'absolute', top: -5, width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: isDark ? '#1E293B' : '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, elevation: 4, marginLeft: -9 },
    label:      { fontSize: 10, color: C.textMuted, marginTop: 6, fontWeight: '600' },
  });

  return (
    <View style={rb.wrap}>
      <View style={rb.track}>
        <View style={[rb.fill, { width: `${pct}%` as any, backgroundColor: barColor + '30' }]} />
        {normalMin !== undefined && normalMax !== undefined && (
          <View style={[rb.normalZone, {
            left: `${Math.min(96, (normalMin / dispMax) * 100)}%` as any,
            width: `${Math.min(96, ((normalMax - normalMin) / dispMax) * 100)}%` as any,
          }]} />
        )}
        <View style={[rb.marker, { left: markerLeft as any, backgroundColor: barColor }]} />
      </View>
      {meta.rangeLabel && (
        <Text style={rb.label}>Normal: {meta.rangeLabel} {meta.unit}</Text>
      )}
    </View>
  );
}

/* ── metric card ──────────────────────────────────────────────── */
function MetricCard({ type, data, index }: { type: string; data: any[]; index: number }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const STATUS_CONFIG = makeStatusConfig(C);
  const meta    = getMetaForType(type, C.primary);
  const latest  = data[data.length - 1];
  const prev    = data.length >= 2 ? data[data.length - 2] : null;
  const trend   = prev ? latest.value - prev.value : null;
  const recent7 = data.slice(-7);
  const values  = recent7.map((m: any) => Number(m.value));
  const labels  = recent7.map((m: any) =>
    new Date(m.recordedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })
  );
  const status  = getStatus(Number(latest.value), meta);
  const sc      = STATUS_CONFIG[status];
  const chartW  = SCREEN_W - 68;

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const mc = StyleSheet.create({
    card:         { backgroundColor: C.card, borderRadius: 20, marginBottom: 16, flexDirection: 'row', shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
    accent:       { width: 5 },
    inner:        { flex: 1, padding: 18 },
    headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    titleGroup:   { flexDirection: 'row', alignItems: 'center', gap: 7 },
    icon:         { fontSize: 18 },
    metricName:   { fontSize: 13, fontWeight: '700', color: C.textSec },
    statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    statusDot:    { width: 6, height: 6, borderRadius: 3 },
    statusText:   { fontSize: 11, fontWeight: '700' },
    valueRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    value:        { fontSize: 34, fontWeight: '800', lineHeight: 40 },
    unit:         { fontSize: 14, fontWeight: '500', color: C.textMuted },
    trendPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.trendPillBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 4 },
    trendText:    { fontSize: 11, fontWeight: '700' },
    chartWrap:    { marginTop: 4, marginHorizontal: -4 },
    singleWrap:   { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: C.primaryPale, borderRadius: 12 },
    singleHint:   { fontSize: 11, color: C.textMuted, flex: 1 },
    timelineWrap: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.timelineBorder },
    timelineTitle:{ fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    timeline:     { flexDirection: 'row', gap: 8, paddingRight: 4 },
    pill:         { alignItems: 'center', backgroundColor: C.primaryPale, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 13, minWidth: 64, borderWidth: 1, borderColor: C.border, gap: 3 },
    pillDate:     { fontSize: 10, color: C.textMuted, fontWeight: '600' },
    pillValue:    { fontSize: 14, fontWeight: '800' },
    pillDot:      { width: 5, height: 5, borderRadius: 3 },
  });

  return (
    <Animated.View style={[mc.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[mc.accent, { backgroundColor: meta.color }]} />
      <View style={mc.inner}>
        <View style={mc.headerRow}>
          <View style={mc.titleGroup}>
            <Text style={mc.icon}>{meta.icon}</Text>
            <Text style={mc.metricName}>{meta.label}</Text>
          </View>
          {status !== 'unknown' && (
            <View style={[mc.statusBadge, { backgroundColor: sc.bg }]}>
              <View style={[mc.statusDot, { backgroundColor: sc.dot }]} />
              <Text style={[mc.statusText, { color: sc.text }]}>{sc.label}</Text>
            </View>
          )}
        </View>

        <View style={mc.valueRow}>
          <Text style={[mc.value, { color: meta.color }]}>
            {latest.value}
            <Text style={mc.unit}> {latest.unit || meta.unit}</Text>
          </Text>
          {trend !== null && (
            <View style={mc.trendPill}>
              <Ionicons
                name={trend > 0 ? 'trending-up' : trend < 0 ? 'trending-down' : 'remove'}
                size={13}
                color={trend > 0 ? C.red : trend < 0 ? C.green : C.textMuted}
              />
              <Text style={[mc.trendText, { color: trend > 0 ? C.red : trend < 0 ? C.green : C.textMuted }]}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)} from last
              </Text>
            </View>
          )}
        </View>

        <RangeBar value={Number(latest.value)} meta={meta} />

        {values.length > 1 ? (
          <View style={mc.chartWrap}>
            <LineChart
              data={{ labels, datasets: [{ data: values, color: () => meta.color + 'cc', strokeWidth: 2.5 }] }}
              width={chartW}
              height={130}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: C.primaryPale,
                backgroundGradientTo: C.primaryPale,
                decimalPlaces: 1,
                color: () => meta.color,
                labelColor: () => C.textMuted,
                propsForDots: { r: '5', strokeWidth: '2.5', stroke: isDark ? '#1E293B' : '#fff', fill: meta.color },
                propsForBackgroundLines: { stroke: isDark ? '#334155' : '#EBF0FF', strokeDasharray: '4 4' },
                propsForLabels: { fontSize: 9 },
              }}
              bezier
              style={{ borderRadius: 12, marginLeft: -10, marginTop: 10 }}
              withShadow={false}
              withInnerLines
              withOuterLines={false}
            />
          </View>
        ) : (
          <View style={mc.singleWrap}>
            <Ionicons name="information-circle-outline" size={14} color={C.textMuted} />
            <Text style={mc.singleHint}>Add more readings to see your trend chart</Text>
          </View>
        )}

        <View style={mc.timelineWrap}>
          <Text style={mc.timelineTitle}>Recent readings</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mc.timeline}>
            {data.slice(-5).reverse().map((m: any, i: number) => {
              const s2     = getStatus(Number(m.value), meta);
              const sc2    = STATUS_CONFIG[s2];
              const isLatest = i === 0;
              return (
                <View key={m.id} style={[mc.pill, isLatest && { borderColor: meta.color, borderWidth: 2 }]}>
                  <Text style={mc.pillDate}>
                    {new Date(m.recordedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={[mc.pillValue, { color: meta.color }]}>{m.value}</Text>
                  {s2 !== 'unknown' && <View style={[mc.pillDot, { backgroundColor: sc2.dot }]} />}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Animated.View>
  );
}

/* ── category tabs ────────────────────────────────────────────── */
const CATEGORIES = ['All', 'Blood Sugar', 'Cardiovascular', 'Blood', 'Body'];

function CategoryTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const ct = StyleSheet.create({
    tab:         { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
    tabActive:   { backgroundColor: C.primary, borderColor: C.primary },
    label:       { fontSize: 13, fontWeight: '600', color: C.textSec },
    labelActive: { color: '#fff' },
  });
  return (
    <TouchableOpacity style={[ct.tab, active && ct.tabActive]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[ct.label, active && ct.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ── health overview header ───────────────────────────────────── */
function HealthHeader({ grouped, lastDate }: { grouped: Record<string, any[]>; lastDate: string }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const hh = StyleSheet.create({
    card:     { backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: C.primary, shadowOpacity: 0.10, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: C.border },
    top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
    title:    { fontSize: 20, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
    sub:      { fontSize: 12, color: C.textMuted, marginTop: 4, fontWeight: '500' },
    iconBox:  { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center' },
    statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.statsRowBg, borderRadius: 14, padding: 14 },
    stat:     { flex: 1, alignItems: 'center' },
    statNum:  { fontSize: 22, fontWeight: '800', color: C.text },
    statLabel:{ fontSize: 10, color: C.textMuted, fontWeight: '600', marginTop: 2, textAlign: 'center' },
    divider:  { width: 1, height: 30, backgroundColor: C.border },
  });

  const types        = Object.keys(grouped);
  const statusCounts = { normal: 0, high: 0, low: 0, borderline: 0 };

  types.forEach((type) => {
    const data   = grouped[type];
    const latest = data[data.length - 1];
    const meta   = getMetaForType(type, C.primary);
    const st     = getStatus(Number(latest.value), meta);
    if (st === 'normal')          statusCounts.normal++;
    else if (st === 'high')       statusCounts.high++;
    else if (st === 'low')        statusCounts.low++;
    else if (st === 'borderline') statusCounts.borderline++;
  });

  return (
    <View style={hh.card}>
      <View style={hh.top}>
        <View>
          <Text style={hh.title}>Health Overview</Text>
          <Text style={hh.sub}>Last updated {lastDate}</Text>
        </View>
        <View style={hh.iconBox}>
          <Ionicons name="pulse-outline" size={24} color={C.primary} />
        </View>
      </View>
      <View style={hh.statsRow}>
        <View style={hh.stat}>
          <Text style={hh.statNum}>{types.length}</Text>
          <Text style={hh.statLabel}>Metrics</Text>
        </View>
        <View style={hh.divider} />
        <View style={hh.stat}>
          <Text style={[hh.statNum, { color: C.green }]}>{statusCounts.normal}</Text>
          <Text style={hh.statLabel}>Normal</Text>
        </View>
        <View style={hh.divider} />
        <View style={hh.stat}>
          <Text style={[hh.statNum, { color: C.amber }]}>{statusCounts.borderline + statusCounts.high}</Text>
          <Text style={hh.statLabel}>Attention</Text>
        </View>
        <View style={hh.divider} />
        <View style={hh.stat}>
          <Text style={[hh.statNum, { color: C.primary }]}>{statusCounts.low}</Text>
          <Text style={hh.statLabel}>Low</Text>
        </View>
      </View>
    </View>
  );
}

/* ── main screen ──────────────────────────────────────────────── */
export default function PatientHealth() {
  const [metrics, setMetrics]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);

  const s = StyleSheet.create({
    container:      { flex: 1, backgroundColor: C.bg },
    content:        { padding: 16, paddingBottom: 44 },
    tabsScroll:     { marginBottom: 18, marginHorizontal: -16 },
    tabsRow:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingRight: 24 },
    noCategory:     { alignItems: 'center', paddingVertical: 44, gap: 8 },
    noCategoryText: { fontSize: 14, color: C.textMuted, fontWeight: '600' },
    emptyWrap:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: C.bg },
    emptyIconBox:   { width: 90, height: 90, borderRadius: 45, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 22 },
    emptyTitle:     { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 10 },
    emptySub:       { fontSize: 14, color: C.textSec, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
    emptyHints:     { gap: 10, width: '100%' },
    emptyHint:      { backgroundColor: C.card, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    emptyHintText:  { fontSize: 14, fontWeight: '600', color: C.textSec },
  });

  async function load() {
    try {
      const r = await api.get('/api/health-metrics');
      setMetrics(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    load();
  }, []);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.primary} />
      <Text style={{ marginTop: 12, fontSize: 13, color: C.textMuted, fontWeight: '600' }}>Loading health data...</Text>
    </View>
  );

  if (metrics.length === 0) {
    return (
      <View style={s.emptyWrap}>
        <View style={s.emptyIconBox}>
          <Ionicons name="pulse-outline" size={40} color={C.primary} />
        </View>
        <Text style={s.emptyTitle}>No Health Data Yet</Text>
        <Text style={s.emptySub}>
          Your doctor records health metrics during your appointments. They'll appear here as charts and trends once added.
        </Text>
        <View style={s.emptyHints}>
          {['📋 Book an appointment', '🩺 Complete a visit', '📈 View your trends'].map((h, i) => (
            <View key={i} style={s.emptyHint}>
              <Text style={s.emptyHintText}>{h}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  const grouped: Record<string, any[]> = {};
  metrics.forEach((m) => {
    const key = m.metricType.toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  const allDates = metrics.map((m) => new Date(m.recordedAt).getTime());
  const lastDate = new Date(Math.max(...allDates)).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });

  const filtered = Object.entries(grouped).filter(([type]) => {
    if (activeCategory === 'All') return true;
    return getMetaForType(type, C.primary).category === activeCategory;
  });

  const presentCategories = ['All', ...new Set(Object.keys(grouped).map((t) => getMetaForType(t, C.primary).category))];
  const visibleCategories = CATEGORIES.filter((c) => presentCategories.includes(c));

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <HealthHeader grouped={grouped} lastDate={lastDate} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsRow}
        style={s.tabsScroll}
      >
        {visibleCategories.map((cat) => (
          <CategoryTab
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveCategory(cat);
            }}
          />
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={s.noCategory}>
          <Ionicons name="search-outline" size={28} color={C.border} />
          <Text style={s.noCategoryText}>No metrics in this category</Text>
        </View>
      ) : (
        filtered.map(([type, data], index) => (
          <MetricCard key={type} type={type} data={data} index={index} />
        ))
      )}
    </ScrollView>
  );
}
