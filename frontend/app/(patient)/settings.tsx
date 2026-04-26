import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Switch,
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
    bg:           isDark ? '#0F172A' : '#F4F7FE',
    card:         isDark ? '#1E293B' : '#FFFFFF',
    cardAlt:      isDark ? '#263348' : '#F8FAFF',
    primary:      '#4E8EE8',
    primaryLight: isDark ? '#1E3A5F' : '#EBF3FF',
    text:         isDark ? '#F1F5F9' : '#1C2B3A',
    textSec:      isDark ? '#94A3B8' : '#5A6C82',
    textMuted:    isDark ? '#64748B' : '#9AAFC2',
    border:       isDark ? '#334155' : '#DDE9FF',
    amber:        '#F5A435',
    amberLight:   isDark ? '#3D2E0E' : '#FFF5E5',
    red:          '#E85A6A',
    redLight:     isDark ? '#3D1219' : '#FEECEE',
    green:        '#2ECC9B',
    greenLight:   isDark ? '#0D2E22' : '#E8FAF3',
  };
}

type ModalType = 'password' | 'email' | null;

export default function PatientSettings() {
  const { user, logout, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useAppTheme();
  const router = useRouter();
  const C = makeColors(isDark);

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

  const closeModal = () => {
    setActiveModal(null);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setNewEmail(''); setEmailPw('');
    setShowCurrent(false); setShowNew(false); setShowConfirm(false); setShowEmailPw(false);
  };

  const changePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPw.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
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
    if (!newEmail || !emailPw) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (!newEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
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
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  const s = makeStyles(C);

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
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
              <Text style={s.infoValue}>{user?.fullName || '—'}</Text>
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
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: C.border, true: C.primary }}
              thumbColor="#fff"
            />
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
              <Text style={s.infoValue}>Patient</Text>
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
            <Text style={s.sheetSubtitle}>Your current email: {user?.email}</Text>

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
    actionRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionLabel:  { flex: 1, fontSize: 15, color: C.text, fontWeight: '600' },
    logoutBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.redLight, borderRadius: 14, padding: 16 },
    logoutText:   { fontSize: 15, fontWeight: '700', color: C.red },
    overlay:      { flex: 1, backgroundColor: 'rgba(15,25,45,0.45)' },
    sheet:        { backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    handle:       { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    sheetTitle:   { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
    sheetSubtitle:{ fontSize: 13, color: C.textMuted, marginBottom: 20 },
    fieldLabel:   { fontSize: 12, fontWeight: '600', color: C.textSec, marginBottom: 8 },
    input:        { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 15, color: C.text, backgroundColor: C.cardAlt, marginBottom: 4 },
    pwRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn:       { padding: 4 },
    sheetActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    cancelBtn:    { flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, alignItems: 'center' },
    cancelText:   { fontSize: 15, fontWeight: '600', color: C.textSec },
    confirmBtn:   { flex: 1, backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
    confirmText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
