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

function makeColors(isDark: boolean) {
  return {
    bg:       isDark ? '#0F172A' : '#f0f9ff',
    card:     isDark ? '#1E293B' : '#fff',
    primary:  '#1565C0',
    text:     isDark ? '#F1F5F9' : '#1e293b',
    textSec:  isDark ? '#94A3B8' : '#475569',
    textMuted: isDark ? '#94A3B8' : '#64748b',
    border:   isDark ? '#334155' : '#e2e8f0',
    inputBg:  isDark ? '#263348' : '#f8fafc',
    link:     '#1565C0',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: C.bg },
    container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 24 },
    logo: { width: 280, height: 200 },
    card: { backgroundColor: C.card, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    title: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', color: C.textSec, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, backgroundColor: C.inputBg, color: C.text },
    button: { backgroundColor: C.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { color: C.textMuted, fontSize: 14 },
    link: { color: C.link, fontWeight: '600', fontSize: 14 },
  });
}

export default function LoginScreen() {
  const { login } = useAuth();
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const s = makeStyles(C);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Redirect handled by app/index.tsx via AuthContext
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Login Failed', err?.response?.data?.error || 'Invalid credentials.');
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
          <Text style={s.title}>Welcome Back</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor={C.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="Enter password"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading}>
            <Text style={s.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/register">
              <Text style={s.link}>Register</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
