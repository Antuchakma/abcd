import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Switch, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import api from '@/services/api';

const APP_VERSION = '1.0.0';

function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#f1f5f9',
    card:         isDark ? '#1E293B' : '#FFFFFF',
    cardAlt:      isDark ? '#263348' : '#F8FAFF',
    primary:      '#00BCD4',
    primaryLight: isDark ? '#0D3340' : '#E0F7FA',
    text:         isDark ? '#F1F5F9' : '#1C2B3A',
    textSec:      isDark ? '#94A3B8' : '#5A6C82',
    textMuted:    isDark ? '#64748B' : '#94a3b8',
    border:       isDark ? '#334155' : '#e2e8f0',
    amber:        '#F5A435',
    amberLight:   isDark ? '#3D2E0E' : '#FFF5E5',
    red:          '#E85A6A',
    redLight:     isDark ? '#3D1219' : '#FEECEE',
    green:        '#2ECC9B',
    greenLight:   isDark ? '#0D2E22' : '#E8FAF3',
  };
}

type ModalType = 'password' | 'email' | null;

export default function DoctorSettings() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const { isDark, toggleTheme } = useAppTheme();
  const C = makeColors(isDark);

  const [specialization, setSpecialization] = useState('');
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [bio, setBio] = useState('');
  const [hospitalHistory, setHospitalHistory] = useState<any[]>([]);
  const [degrees, setDegrees] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [degreeTitle, setDegreeTitle] = useState('');
  const [degreeInstitution, setDegreeInstitution] = useState('');
  const [degreeYear, setDegreeYear] = useState('');
  const [achievementTitle, setAchievementTitle] = useState('');
  const [achievementDescription, setAchievementDescription] = useState('');
  const [achievementYear, setAchievementYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addingSpecialty, setAddingSpecialty] = useState(false);
  const [addingDegree, setAddingDegree] = useState(false);
  const [addingAchievement, setAddingAchievement] = useState(false);

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Change password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Change email state
  const [newEmail, setNewEmail] = useState('');
  const [emailPw, setEmailPw] = useState('');
  const [showEmailPw, setShowEmailPw] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/api/doctor/profile');
      setSpecialization(res.data.specialization || '');
      setLicenseNumber(res.data.licenseNumber || '');
      setHospitalName(res.data.hospitalName || '');
      setBio(res.data.bio || '');
      setSpecialties(res.data.specialties || []);
      setHospitalHistory(res.data.hospitalHistory || []);
      setDegrees(res.data.degrees || []);
      setAchievements(res.data.achievements || []);
    } catch {
      Alert.alert('Error', 'Failed to load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/api/doctor/profile', { hospitalName, bio });
      await refreshUser();
      Alert.alert('Saved', 'Profile updated successfully.');
      await fetchProfile();
    } catch {
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = async () => {
    if (!newSpecialty.trim()) return;
    setAddingSpecialty(true);
    try {
      await api.post('/api/doctor/profile/specialties', { name: newSpecialty.trim() });
      setNewSpecialty('');
      await fetchProfile();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add specialty.');
    } finally {
      setAddingSpecialty(false);
    }
  };

  const addDegree = async () => {
    if (!degreeTitle.trim()) return;
    setAddingDegree(true);
    try {
      await api.post('/api/doctor/profile/degrees', {
        title: degreeTitle.trim(),
        institution: degreeInstitution.trim() || undefined,
        year: degreeYear.trim() ? Number(degreeYear.trim()) : undefined,
      });
      setDegreeTitle('');
      setDegreeInstitution('');
      setDegreeYear('');
      await fetchProfile();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add degree.');
    } finally {
      setAddingDegree(false);
    }
  };

  const addAchievement = async () => {
    if (!achievementTitle.trim()) return;
    setAddingAchievement(true);
    try {
      await api.post('/api/doctor/profile/achievements', {
        title: achievementTitle.trim(),
        description: achievementDescription.trim() || undefined,
        year: achievementYear.trim() ? Number(achievementYear.trim()) : undefined,
      });
      setAchievementTitle('');
      setAchievementDescription('');
      setAchievementYear('');
      await fetchProfile();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add achievement.');
    } finally {
      setAddingAchievement(false);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setNewEmail(''); setEmailPw('');
    setShowCurrent(false); setShowNew(false); setShowConfirm(false); setShowEmailPw(false);
  };

  const changePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Error', 'Please fill in all fields.'); return; }
    if (newPw.length < 6) { Alert.alert('Error', 'New password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { Alert.alert('Error', 'New passwords do not match.'); return; }
    setChangingPw(true);
    try {
      await api.put('/api/auth/change-password', { currentPassword: currentPw, newPassword: newPw });
      Alert.alert('Success', 'Password changed successfully.');
      closeModal();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to change password.');
    } finally {
      setChangingPw(false);
    }
  };

  const changeEmail = async () => {
    if (!newEmail || !emailPw) { Alert.alert('Error', 'Please fill in all fields.'); return; }
    if (!newEmail.includes('@')) { Alert.alert('Error', 'Please enter a valid email address.'); return; }
    setChangingEmail(true);
    try {
      await api.put('/api/auth/change-email', { newEmail, currentPassword: emailPw });
      await refreshUser();
      Alert.alert('Success', 'Email updated successfully.');
      closeModal();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to update email.');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace('/(auth)/login');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) doLogout();
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: doLogout },
    ]);
  };

  const s = makeStyles(C);

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Account */}
        <Text style={s.sectionTitle}>Account</Text>
        <View style={s.card}>
          <View style={s.infoRow}>
            <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="person-outline" size={18} color={C.primary} />
            </View>
            <View style={s.infoText}>
              <Text style={s.infoLabel}>Full Name</Text>
              <Text style={s.infoValue}>{user?.fullName ? `Dr. ${user.fullName}` : '—'}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <TouchableOpacity style={s.infoRow} onPress={() => setActiveModal('email')}>
            <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="mail-outline" size={18} color={C.primary} />
            </View>
            <View style={s.infoText}>
              <Text style={s.infoLabel}>Email</Text>
              <Text style={s.infoValue}>{user?.email || '—'}</Text>
            </View>
            <Ionicons name="pencil-outline" size={16} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Practice Info */}
        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Practice Info</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>Medical License Number (read only)</Text>
          <View style={s.readOnlyField}>
            <Text style={s.readOnlyText}>{licenseNumber || '—'}</Text>
          </View>

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>Specialties (add-only)</Text>
          <View style={s.chipWrap}>
            {(specialties.length ? specialties : specialization ? [{ id: 'legacy', name: specialization }] : []).map((sp: any) => (
              <View key={sp.id} style={s.chip}>
                <Text style={s.chipText}>{sp.name}</Text>
              </View>
            ))}
          </View>
          <View style={s.inlineRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              value={newSpecialty}
              onChangeText={setNewSpecialty}
              placeholder="Add new specialty"
              placeholderTextColor={C.textMuted}
            />
            <TouchableOpacity style={s.addBtn} onPress={addSpecialty} disabled={addingSpecialty}>
              {addingSpecialty ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>Current Hospital / Clinic</Text>
          <TextInput style={s.input} value={hospitalName} onChangeText={setHospitalName}
            placeholder="e.g. City General Hospital" placeholderTextColor={C.textMuted} />

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>About You</Text>
          <TextInput
            style={[s.input, { minHeight: 90, textAlignVertical: 'top' }]}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder="Share your profile, treatment interests, communication style..."
            placeholderTextColor={C.textMuted}
          />

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>Hospital History</Text>
          {(hospitalHistory || []).map((h: any) => (
            <View key={h.id} style={s.timelineRow}>
              <Ionicons name="git-branch-outline" size={15} color={C.primary} />
              <Text style={s.timelineText}>
                {h.hospitalName} · {new Date(h.startedAt).toLocaleDateString()} - {h.endedAt ? new Date(h.endedAt).toLocaleDateString() : 'Present'}
              </Text>
            </View>
          ))}

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.7 }]} onPress={saveProfile} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Qualifications</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>Add Degree</Text>
          <TextInput style={s.input} value={degreeTitle} onChangeText={setDegreeTitle}
            placeholder="Degree title (e.g. MBBS)" placeholderTextColor={C.textMuted} />
          <TextInput style={s.input} value={degreeInstitution} onChangeText={setDegreeInstitution}
            placeholder="Institution" placeholderTextColor={C.textMuted} />
          <TextInput style={s.input} value={degreeYear} onChangeText={setDegreeYear}
            keyboardType="number-pad" placeholder="Year" placeholderTextColor={C.textMuted} />
          <TouchableOpacity style={s.saveBtn} onPress={addDegree} disabled={addingDegree}>
            {addingDegree ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Add Degree</Text>}
          </TouchableOpacity>

          {(degrees || []).map((d: any) => (
            <Text key={d.id} style={s.listText}>• {d.title}{d.institution ? `, ${d.institution}` : ''}{d.year ? ` (${d.year})` : ''}</Text>
          ))}
        </View>

        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Achievements</Text>
        <View style={s.card}>
          <Text style={s.fieldLabel}>Add Achievement</Text>
          <TextInput style={s.input} value={achievementTitle} onChangeText={setAchievementTitle}
            placeholder="Achievement title" placeholderTextColor={C.textMuted} />
          <TextInput style={s.input} value={achievementDescription} onChangeText={setAchievementDescription}
            placeholder="Description (optional)" placeholderTextColor={C.textMuted} />
          <TextInput style={s.input} value={achievementYear} onChangeText={setAchievementYear}
            keyboardType="number-pad" placeholder="Year" placeholderTextColor={C.textMuted} />
          <TouchableOpacity style={s.saveBtn} onPress={addAchievement} disabled={addingAchievement}>
            {addingAchievement ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Add Achievement</Text>}
          </TouchableOpacity>

          {(achievements || []).map((a: any) => (
            <Text key={a.id} style={s.listText}>• {a.title}{a.year ? ` (${a.year})` : ''}{a.description ? ` - ${a.description}` : ''}</Text>
          ))}
        </View>

        {/* Appearance */}
        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Appearance</Text>
        <View style={s.card}>
          <View style={s.settingRow}>
            <View style={[s.iconBox, { backgroundColor: isDark ? '#2D2B45' : '#F0EDFF' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={18} color={isDark ? '#8B75E8' : '#F5A435'} />
            </View>
            <View style={s.infoText}>
              <Text style={s.infoValue}>Dark Mode</Text>
              <Text style={s.infoLabel}>{isDark ? 'On' : 'Off'}</Text>
            </View>
            <Switch value={isDark} onValueChange={toggleTheme}
              trackColor={{ false: C.border, true: C.primary }} thumbColor="#fff" />
          </View>
        </View>

        {/* Security */}
        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Security</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.actionRow} onPress={() => setActiveModal('password')}>
            <View style={[s.iconBox, { backgroundColor: C.amberLight }]}>
              <Ionicons name="lock-closed-outline" size={18} color={C.amber} />
            </View>
            <Text style={s.actionLabel}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={[s.sectionTitle, { marginTop: 20 }]}>About</Text>
        <View style={s.card}>
          <View style={s.infoRow}>
            <View style={[s.iconBox, { backgroundColor: C.greenLight }]}>
              <Ionicons name="information-circle-outline" size={18} color={C.green} />
            </View>
            <View style={s.infoText}>
              <Text style={s.infoLabel}>App Version</Text>
              <Text style={s.infoValue}>Aroggo v{APP_VERSION}</Text>
            </View>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <View style={[s.iconBox, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="medkit-outline" size={18} color={C.primary} />
            </View>
            <View style={s.infoText}>
              <Text style={s.infoLabel}>Account Type</Text>
              <Text style={s.infoValue}>Doctor</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={{ marginTop: 28, marginBottom: 8 }}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={C.red} />
            <Text style={s.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={activeModal === 'password'} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeModal} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Change Password</Text>

            <Text style={s.fieldLabel}>Current Password</Text>
            <View style={s.pwRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={currentPw} onChangeText={setCurrentPw}
                secureTextEntry={!showCurrent} placeholder="Current password" placeholderTextColor={C.textMuted} />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={s.eyeBtn}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>New Password</Text>
            <View style={s.pwRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={newPw} onChangeText={setNewPw}
                secureTextEntry={!showNew} placeholder="New password (min 6 chars)" placeholderTextColor={C.textMuted} />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={s.eyeBtn}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Confirm New Password</Text>
            <View style={s.pwRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={confirmPw} onChangeText={setConfirmPw}
                secureTextEntry={!showConfirm} placeholder="Confirm new password" placeholderTextColor={C.textMuted} />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={s.eyeBtn}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, changingPw && { opacity: 0.7 }]} onPress={changePassword} disabled={changingPw}>
                {changingPw ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Email Modal */}
      <Modal visible={activeModal === 'email'} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeModal} />
          <View style={s.sheet}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Change Email</Text>
            <Text style={s.sheetSubtitle}>Current: {user?.email}</Text>

            <Text style={s.fieldLabel}>New Email Address</Text>
            <TextInput style={s.input} value={newEmail} onChangeText={setNewEmail}
              keyboardType="email-address" autoCapitalize="none"
              placeholder="Enter new email" placeholderTextColor={C.textMuted} />

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Confirm with Password</Text>
            <View style={s.pwRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={emailPw} onChangeText={setEmailPw}
                secureTextEntry={!showEmailPw} placeholder="Your current password" placeholderTextColor={C.textMuted} />
              <TouchableOpacity onPress={() => setShowEmailPw(!showEmailPw)} style={s.eyeBtn}>
                <Ionicons name={showEmailPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={s.sheetActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, changingEmail && { opacity: 0.7 }]} onPress={changeEmail} disabled={changingEmail}>
                {changingEmail ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.confirmText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },
    content:      { padding: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    card:         { backgroundColor: C.card, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox:      { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    infoText:     { flex: 1 },
    infoLabel:    { fontSize: 11, color: C.textMuted, fontWeight: '600', marginBottom: 2 },
    infoValue:    { fontSize: 15, color: C.text, fontWeight: '600' },
    divider:      { height: 1, backgroundColor: C.border, marginVertical: 12 },
    fieldLabel:   { fontSize: 12, fontWeight: '600', color: C.textSec, marginBottom: 8 },
    input:        { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 15, color: C.text, backgroundColor: C.cardAlt, marginBottom: 4 },
    inlineRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    addBtn:       { width: 44, height: 44, borderRadius: 10, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
    chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:         { backgroundColor: C.primaryLight, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10 },
    chipText:     { color: C.primary, fontWeight: '700', fontSize: 12 },
    readOnlyField:{ borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, backgroundColor: C.cardAlt },
    readOnlyText: { color: C.textSec, fontSize: 15, fontWeight: '700' },
    timelineRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
    timelineText: { color: C.textSec, fontSize: 13, flex: 1 },
    listText:     { color: C.textSec, fontSize: 13, marginTop: 8, lineHeight: 19 },
    saveBtn:      { backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
    saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
    actionRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionLabel:  { flex: 1, fontSize: 15, color: C.text, fontWeight: '600' },
    logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.redLight, borderRadius: 14, padding: 16 },
    logoutText:   { fontSize: 15, fontWeight: '700', color: C.red },
    overlay:      { flex: 1, backgroundColor: 'rgba(15,25,45,0.45)' },
    sheet:        { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    handle:       { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    sheetTitle:   { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
    sheetSubtitle:{ fontSize: 13, color: C.textMuted, marginBottom: 20 },
    pwRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn:       { padding: 4 },
    sheetActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn:    { flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, alignItems: 'center' },
    cancelText:   { fontSize: 15, fontWeight: '600', color: C.textSec },
    confirmBtn:   { flex: 1, backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
    confirmText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
