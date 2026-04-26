import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, TextInput, Alert, Modal, ScrollView,
  Animated, Keyboard,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';
import { useSocket } from '@/context/SocketContext';
import { useAppTheme } from '@/context/ThemeContext';

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
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    list:         { padding: 16, paddingBottom: 104, flexGrow: 1 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.6 },

    /* empty */
    empty:        { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    emptyTitle:   { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 7 },
    emptySub:     { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    /* connection card */
    card:        { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: C.primary, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
    avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    avatarText:  { fontSize: 20, fontWeight: '800', color: C.primary },
    info:        { flex: 1, gap: 3 },
    name:        { fontSize: 15, fontWeight: '800', color: C.text },
    specRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    spec:        { fontSize: 12, color: C.primary, fontWeight: '600' },
    hospRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    hospital:    { fontSize: 12, color: C.textMuted },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    accepted:    { backgroundColor: C.greenLight },
    pending:     { backgroundColor: C.amberLight },
    statusText:  { fontSize: 11, fontWeight: '700' },

    /* FAB */
    fab:         { position: 'absolute', bottom: 26, right: 20, backgroundColor: C.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
    fabText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

    /* modal */
    overlay:     { flex: 1, justifyContent: 'flex-end' },
    overlayBg:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,25,45,0.38)' },
    modal:       { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8, maxHeight: '93%' },
    dragHandle:  { width: 38, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle:  { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
    modalSub:    { fontSize: 12, color: C.textMuted, marginTop: 2 },
    closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: C.primaryPale, justifyContent: 'center', alignItems: 'center' },

    searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryPale, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 20, borderWidth: 1.5, borderColor: C.border },
    searchInput: { flex: 1, fontSize: 15, color: C.text },

    section:      { marginBottom: 18 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

    chipsRow:     { flexDirection: 'row', gap: 8, paddingRight: 8 },
    chip:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.primaryPale },
    chipActive:   { borderColor: C.primary, backgroundColor: C.primaryLight },
    chipIcon:     { fontSize: 13 },
    chipText:     { fontSize: 13, fontWeight: '600', color: C.textSec },
    chipTextActive:{ color: C.primary },

    hospToggle:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primaryPale, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.border },
    hospToggleLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
    hospToggleLabel: { fontSize: 14, fontWeight: '600', color: C.textSec },
    hospActivePill:  { backgroundColor: C.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, maxWidth: 130 },
    hospActivePillText: { fontSize: 11, fontWeight: '600', color: C.primary },
    hospInputWrap:   { marginTop: 8, backgroundColor: C.primaryPale, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5, borderColor: C.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
    hospInput:       { flex: 1, fontSize: 14, color: C.text, padding: 0 },
    hospDropdown:    { position: 'absolute', top: 46, left: 0, right: 0, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 8, zIndex: 99 },
    hospDropItem:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
    hospDropText:    { fontSize: 13, color: C.text },

    activeFilters:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
    activeFiltersLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted },
    filterTag:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primaryLight, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 9 },
    filterTagText:      { fontSize: 12, fontWeight: '600', color: C.primary },

    resultsLabel:  { fontSize: 11, fontWeight: '700', color: C.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    noResults:     { alignItems: 'center', paddingVertical: 36 },
    noResultsText: { fontSize: 15, fontWeight: '700', color: C.textMuted, marginTop: 10 },
    noResultsSub:  { fontSize: 12, color: C.border, marginTop: 4, textAlign: 'center' },
    browseHint:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.primaryPale, borderRadius: 12, padding: 14, marginTop: 4 },
    browseHintText:{ fontSize: 13, color: C.textMuted, flex: 1, lineHeight: 19 },

    resultCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primaryPale, borderRadius: 16, padding: 14, marginBottom: 9, borderWidth: 1.5, borderColor: C.border },
    resultAvatar:     { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    resultAvatarText: { fontSize: 18, fontWeight: '800', color: C.primary },
    resultInfo:       { flex: 1 },
    resultName:       { fontSize: 14, fontWeight: '800', color: C.text },
    resultSpec:       { fontSize: 12, color: C.primary, fontWeight: '600' },
    resultHosp:       { fontSize: 11, color: C.textMuted },
    connectBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, minWidth: 90, justifyContent: 'center' },
    connectBtnText:   { color: '#fff', fontSize: 12, fontWeight: '700' },
    connectedBtn:     { backgroundColor: C.greenLight, borderWidth: 1.5, borderColor: '#A7F3D0' },
    connectedBtnText: { color: C.green, fontSize: 12, fontWeight: '700' },
    profileBio:       { fontSize: 13, color: C.textSec, marginTop: 10, marginBottom: 14, lineHeight: 20 },
    profileHeader:    { fontSize: 12, fontWeight: '800', color: C.textSec, marginTop: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    profileChipWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    profileChip:      { backgroundColor: C.primaryLight, borderRadius: 12, paddingVertical: 5, paddingHorizontal: 10 },
    profileChipText:  { fontSize: 12, color: C.primary, fontWeight: '700' },
    profileLine:      { fontSize: 13, color: C.textSec, marginBottom: 6, lineHeight: 19 },
  });
}

interface DoctorResult {
  id: number;
  specialization: string;
  hospitalName: string;
  specialties?: Array<{ id: number; name: string }>;
  user: { fullName: string };
}

const SPECIALTIES = [
  { label: 'All',            icon: '🩺' },
  { label: 'Cardiology',     icon: '❤️' },
  { label: 'Neurology',      icon: '🧠' },
  { label: 'Orthopedics',    icon: '🦴' },
  { label: 'Dermatology',    icon: '🧴' },
  { label: 'Pediatrics',     icon: '👶' },
  { label: 'Gynecology',     icon: '🌸' },
  { label: 'Psychiatry',     icon: '💬' },
  { label: 'ENT',            icon: '👂' },
  { label: 'Ophthalmology',  icon: '👁️' },
  { label: 'General Medicine', icon: '💊' },
  { label: 'Surgery',        icon: '🔬' },
];

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function PatientConnections() {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const s = makeStyles(C);
  const router = useRouter();

  const [connections, setConnections]     = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [modalVisible, setModalVisible]   = useState(false);
  const [connecting, setConnecting]       = useState<number | null>(null);
  const { socket, clearConnectionUpdateCount } = useSocket();

  const [query, setQuery]                 = useState('');
  const [selectedSpec, setSelectedSpec]   = useState('All');
  const [hospQuery, setHospQuery]         = useState('');
  const [hospSugg, setHospSugg]           = useState<string[]>([]);
  const [hospFocused, setHospFocused]     = useState(false);
  const [showHospFilter, setShowHospFilter] = useState(false);

  const dQuery = useDebounce(query);
  const dHosp  = useDebounce(hospQuery);

  const [results, setResults]             = useState<DoctorResult[]>([]);
  const [searching, setSearching]         = useState(false);
  const [hasSearched, setHasSearched]     = useState(false);

  const searchInputRef = useRef<TextInput>(null);

  async function fetchConnections() {
    try {
      const res = await api.get('/api/connections');
      setConnections(res.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }

  useEffect(() => { fetchConnections(); }, []);
  useFocusEffect(useCallback(() => { clearConnectionUpdateCount(); fetchConnections(); }, []));
  useEffect(() => {
    if (!socket) return;
    socket.on('connection_updated', fetchConnections);
    return () => { socket.off('connection_updated', fetchConnections); };
  }, [socket]);

  useEffect(() => {
    if (!dHosp.trim()) { setHospSugg([]); return; }
    api.get('/api/doctor/suggestions', { params: { type: 'hospital', q: dHosp } })
      .then((r) => setHospSugg(r.data)).catch(() => {});
  }, [dHosp]);

  useEffect(() => {
    const specParam = selectedSpec === 'All' ? '' : selectedSpec;
    const any = dQuery.trim() || specParam || dHosp.trim();
    if (!any) { setResults([]); setHasSearched(false); return; }
    setSearching(true);
    api.get('/api/doctor/search', { params: { q: dQuery, specialization: specParam, hospital: dHosp } })
      .then((r) => { setResults(r.data); setHasSearched(true); })
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [dQuery, selectedSpec, dHosp]);

  async function handleConnect(doctor: DoctorResult) {
    setConnecting(doctor.id);
    try {
      await api.post('/api/connections', { doctorId: doctor.id });
      fetchConnections();
      Alert.alert('Request Sent', `Your connection request has been sent to Dr. ${doctor.user.fullName}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to connect.');
    } finally {
      setConnecting(null);
    }
  }

  function openDoctorProfile(doctorId: number) {
    setModalVisible(false);
    router.push({ pathname: '/(patient)/doctor-profile' as any, params: { id: String(doctorId) } });
  }

  function resetModal() {
    setQuery(''); setSelectedSpec('All'); setHospQuery('');
    setHospSugg([]); setResults([]); setHasSearched(false);
    setShowHospFilter(false);
  }

  function openModal() {
    setModalVisible(true);
    setTimeout(() => searchInputRef.current?.focus(), 300);
  }

  const connectedDoctorIds = new Set(connections.map((c) => c.doctorId));

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );

  return (
    <View style={s.container}>
      <FlatList
        data={connections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          connections.length > 0 ? (
            <Text style={s.sectionLabel}>My Doctors ({connections.length})</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconBox}>
              <Ionicons name="people-outline" size={38} color={C.primary} />
            </View>
            <Text style={s.emptyTitle}>No connected doctors yet</Text>
            <Text style={s.emptySub}>Find a doctor by specialty or hospital and send a connection request.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openModal}>
              <Ionicons name="search-outline" size={15} color="#fff" />
              <Text style={s.emptyBtnText}>Find a Doctor</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => openDoctorProfile(item.doctorId)} activeOpacity={0.88}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.doctor?.user?.fullName?.charAt(0) ?? '?'}</Text>
            </View>
            <View style={s.info}>
              <Text style={s.name}>Dr. {item.doctor?.user?.fullName}</Text>
              <View style={s.specRow}>
                <Ionicons name="medkit-outline" size={11} color={C.primary} />
                <Text style={s.spec}>{item.doctor?.specialization}</Text>
              </View>
              <View style={s.hospRow}>
                <Ionicons name="business-outline" size={11} color={C.textMuted} />
                <Text style={s.hospital}>{item.doctor?.hospitalName}</Text>
              </View>
            </View>
            <View style={[s.statusBadge, item.status === 'ACCEPTED' ? s.accepted : s.pending]}>
              <Text style={[s.statusText, item.status === 'ACCEPTED' ? { color: C.green } : { color: C.amber }]}>
                {item.status === 'ACCEPTED' ? 'Active' : 'Pending'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={openModal}>
        <Ionicons name="search-outline" size={17} color="#fff" style={{ marginRight: 6 }} />
        <Text style={s.fabText}>Find a Doctor</Text>
      </TouchableOpacity>

      {/* ── Search Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); resetModal(); }}
      >
        <View style={s.overlay}>
          <TouchableOpacity style={s.overlayBg} activeOpacity={1} onPress={() => { setModalVisible(false); resetModal(); }} />
          <View style={s.modal}>
            <View style={s.dragHandle} />

            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Find a Doctor</Text>
                <Text style={s.modalSub}>Search by name, specialty, or hospital</Text>
              </View>
              <TouchableOpacity style={s.closeBtn} onPress={() => { setModalVisible(false); resetModal(); }}>
                <Ionicons name="close" size={18} color={C.textSec} />
              </TouchableOpacity>
            </View>

            {/* search bar */}
            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={17} color={C.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                ref={searchInputRef}
                style={s.searchInput}
                placeholder="Doctor name or ID..."
                placeholderTextColor={C.textMuted}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={Keyboard.dismiss}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={17} color={C.border} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>

              {/* specialty chips */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Specialization</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
                  {SPECIALTIES.map((sp) => {
                    const active = selectedSpec === sp.label;
                    return (
                      <TouchableOpacity
                        key={sp.label}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setSelectedSpec(sp.label)}
                      >
                        <Text style={s.chipIcon}>{sp.icon}</Text>
                        <Text style={[s.chipText, active && s.chipTextActive]}>{sp.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* hospital filter */}
              <View style={s.section}>
                <TouchableOpacity
                  style={s.hospToggle}
                  onPress={() => { setShowHospFilter(!showHospFilter); if (!showHospFilter) setHospQuery(''); }}
                >
                  <View style={s.hospToggleLeft}>
                    <Ionicons name="business-outline" size={15} color={C.textSec} />
                    <Text style={s.hospToggleLabel}>Filter by Hospital</Text>
                    {hospQuery.length > 0 && (
                      <View style={s.hospActivePill}>
                        <Text style={s.hospActivePillText} numberOfLines={1}>{hospQuery}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name={showHospFilter ? 'chevron-up' : 'chevron-down'} size={15} color={C.textMuted} />
                </TouchableOpacity>

                {showHospFilter && (
                  <View style={s.hospInputWrap}>
                    <TextInput
                      style={s.hospInput}
                      placeholder="e.g. City Hospital, BSMMU..."
                      placeholderTextColor={C.textMuted}
                      value={hospQuery}
                      onChangeText={(v) => { setHospQuery(v); setHospFocused(true); }}
                      onFocus={() => setHospFocused(true)}
                      onBlur={() => setTimeout(() => setHospFocused(false), 150)}
                      autoFocus
                    />
                    {hospQuery.length > 0 && (
                      <TouchableOpacity onPress={() => { setHospQuery(''); setHospSugg([]); }}>
                        <Ionicons name="close-circle" size={17} color={C.border} />
                      </TouchableOpacity>
                    )}
                    {hospFocused && hospSugg.length > 0 && (
                      <View style={s.hospDropdown}>
                        {hospSugg.map((h, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[s.hospDropItem, i < hospSugg.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                            onPress={() => { setHospQuery(h); setHospSugg([]); setHospFocused(false); }}
                          >
                            <Ionicons name="location-outline" size={12} color={C.textMuted} style={{ marginRight: 6 }} />
                            <Text style={s.hospDropText}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* active filters */}
              {(selectedSpec !== 'All' || hospQuery.trim()) && (
                <View style={s.activeFilters}>
                  <Text style={s.activeFiltersLabel}>Active filters:</Text>
                  {selectedSpec !== 'All' && (
                    <TouchableOpacity style={s.filterTag} onPress={() => setSelectedSpec('All')}>
                      <Text style={s.filterTagText}>{selectedSpec}</Text>
                      <Ionicons name="close" size={11} color={C.primary} />
                    </TouchableOpacity>
                  )}
                  {hospQuery.trim() && (
                    <TouchableOpacity style={s.filterTag} onPress={() => setHospQuery('')}>
                      <Text style={s.filterTagText}>{hospQuery}</Text>
                      <Ionicons name="close" size={11} color={C.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* results */}
              <View>
                {searching ? (
                  <ActivityIndicator color={C.primary} style={{ marginTop: 28 }} />
                ) : hasSearched && results.length === 0 ? (
                  <View style={s.noResults}>
                    <Ionicons name="search-outline" size={36} color={C.border} />
                    <Text style={s.noResultsText}>No doctors found</Text>
                    <Text style={s.noResultsSub}>Try a different name, specialty, or hospital</Text>
                  </View>
                ) : results.length > 0 ? (
                  <>
                    <Text style={s.resultsLabel}>{results.length} doctor{results.length !== 1 ? 's' : ''} found</Text>
                    {results.map((doc) => {
                      const alreadyConnected = connectedDoctorIds.has(doc.id);
                      const isConnecting     = connecting === doc.id;
                      const displaySpec = doc.specialties?.length
                        ? doc.specialties.map((sp) => sp.name).join(', ')
                        : doc.specialization;
                      return (
                        <TouchableOpacity key={doc.id} style={s.resultCard} activeOpacity={0.9} onPress={() => openDoctorProfile(doc.id)}>
                          <View style={s.resultAvatar}>
                            <Text style={s.resultAvatarText}>{doc.user.fullName.charAt(0)}</Text>
                          </View>
                          <View style={s.resultInfo}>
                            <Text style={s.resultName}>Dr. {doc.user.fullName}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Ionicons name="medkit-outline" size={10} color={C.primary} />
                              <Text style={s.resultSpec}>{displaySpec}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Ionicons name="business-outline" size={10} color={C.textMuted} />
                              <Text style={s.resultHosp}>{doc.hospitalName}</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[
                              s.connectBtn,
                              alreadyConnected && s.connectedBtn,
                              isConnecting && { opacity: 0.6 },
                            ]}
                            onPress={() => !alreadyConnected && !isConnecting && handleConnect(doc)}
                            disabled={alreadyConnected || isConnecting}
                          >
                            {isConnecting ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : alreadyConnected ? (
                              <>
                                <Ionicons name="checkmark-circle" size={13} color={C.green} />
                                <Text style={s.connectedBtnText}>Connected</Text>
                              </>
                            ) : (
                              <>
                                <Ionicons name="person-add-outline" size={13} color="#fff" />
                                <Text style={s.connectBtnText}>Connect</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  <View style={s.browseHint}>
                    <Ionicons name="information-circle-outline" size={15} color={C.textMuted} />
                    <Text style={s.browseHintText}>
                      Select a specialty above or type a doctor's name to start searching
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
