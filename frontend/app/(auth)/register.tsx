import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';

type Role = 'PATIENT' | 'DOCTOR';

function makeColors(isDark: boolean) {
  return {
    bg:       isDark ? '#0F172A' : '#f0f9ff',
    card:     isDark ? '#1E293B' : '#fff',
    primary:  '#1565C0',
    text:     isDark ? '#F1F5F9' : '#1e293b',
    textSec:  isDark ? '#94A3B8' : '#475569',
    textMuted: isDark ? '#94A3B8' : '#64748b',
    border:   isDark ? '#334155' : '#e2e8f0',
    roleBorder: isDark ? '#334155' : '#cbd5e1',
    inputBg:  isDark ? '#263348' : '#f8fafc',
    link:     '#1565C0',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: C.bg },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 16 },
    logo: { width: 180, height: 130 },
    card: { backgroundColor: C.card, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    title: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: C.textSec, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, backgroundColor: C.inputBg, color: C.text },
    roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    roleBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: C.roleBorder, alignItems: 'center' },
    roleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    roleBtnText: { fontWeight: '600', color: C.textMuted },
    roleBtnTextActive: { color: '#fff' },
    button: { backgroundColor: C.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { color: C.textMuted, fontSize: 14 },
    link: { color: C.link, fontWeight: '600', fontSize: 14 },
  });
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const s = makeStyles(C);
  const [role, setRole] = useState<Role>('PATIENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Patient fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  // Doctor fields
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [hospitalName, setHospitalName] = useState('');

  async function handleRegister() {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Name, email and password are required.');
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        dateOfBirth: role === 'PATIENT' ? dateOfBirth : undefined,
        gender: role === 'PATIENT' ? gender : undefined,
        bloodGroup: role === 'PATIENT' ? bloodGroup : undefined,
        specialization: role === 'DOCTOR' ? specialization : undefined,
        licenseNumber: role === 'DOCTOR' ? licenseNumber : undefined,
        hospitalName: role === 'DOCTOR' ? hospitalName : undefined,
      });

      if (result.pendingApproval) {
        Alert.alert('Application submitted', result.message || 'Your doctor signup is waiting for admin approval.');
        router.replace('/(auth)/login');
        return;
      }

      router.replace('/');
    } catch (err: any) {
      Alert.alert('Registration Failed', err?.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Image source={require('@/assets/images/logo.png')} style={s.logo} resizeMode="contain" />
        </View>

        <View style={s.card}>
          <Text style={s.title}>Register</Text>

          {/* Role selector */}
          <Text style={s.label}>I am a</Text>
          <View style={s.roleRow}>
            <TouchableOpacity
              style={[s.roleBtn, role === 'PATIENT' && s.roleBtnActive]}
              onPress={() => setRole('PATIENT')}
            >
              <Text style={[s.roleBtnText, role === 'PATIENT' && s.roleBtnTextActive]}>Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.roleBtn, role === 'DOCTOR' && s.roleBtnActive]}
              onPress={() => setRole('DOCTOR')}
            >
              <Text style={[s.roleBtnText, role === 'DOCTOR' && s.roleBtnTextActive]}>Doctor</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Full Name</Text>
          <TextInput style={s.input} placeholder="John Doe" placeholderTextColor={C.textMuted} value={fullName} onChangeText={setFullName} />

          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={C.textMuted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

          <Text style={s.label}>Password</Text>
          <TextInput style={s.input} placeholder="Min. 6 characters" placeholderTextColor={C.textMuted} secureTextEntry value={password} onChangeText={setPassword} />

          {role === 'PATIENT' && (
            <>
              <Text style={s.label}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput style={s.input} placeholder="1990-01-15" placeholderTextColor={C.textMuted} value={dateOfBirth} onChangeText={setDateOfBirth} />
              <Text style={s.label}>Gender</Text>
              <TextInput style={s.input} placeholder="Male / Female / Other" placeholderTextColor={C.textMuted} value={gender} onChangeText={setGender} />
              <Text style={s.label}>Blood Group</Text>
              <TextInput style={s.input} placeholder="A+, B-, O+, etc." placeholderTextColor={C.textMuted} value={bloodGroup} onChangeText={setBloodGroup} />
            </>
          )}

          {role === 'DOCTOR' && (
            <>
              <Text style={s.label}>Specialization</Text>
              <TextInput style={s.input} placeholder="e.g. Cardiologist" placeholderTextColor={C.textMuted} value={specialization} onChangeText={setSpecialization} />
              <Text style={s.label}>License Number</Text>
              <TextInput style={s.input} placeholder="Medical license number" placeholderTextColor={C.textMuted} value={licenseNumber} onChangeText={setLicenseNumber} />
              <Text style={s.label}>Hospital / Clinic Name</Text>
              <TextInput style={s.input} placeholder="City Hospital" placeholderTextColor={C.textMuted} value={hospitalName} onChangeText={setHospitalName} />
            </>
          )}

          <TouchableOpacity style={s.button} onPress={handleRegister} disabled={loading}>
            <Text style={s.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text style={s.link}>Sign In</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
