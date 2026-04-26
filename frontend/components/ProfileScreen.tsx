import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import api, { API_BASE_URL } from '@/services/api';

type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

type ProfileScreenProps = {
  role: Role;
  title: string;
  settingsPath: string;
  accent: string;
  bgLight: string;
  heroTitle: string;
};

function makeColors(isDark: boolean, accent: string, bgLight: string) {
  return {
    bg: isDark ? '#0F172A' : bgLight,
    card: isDark ? '#1E293B' : '#FFFFFF',
    cardSoft: isDark ? '#162133' : '#F8FAFF',
    accent,
    text: isDark ? '#F8FAFC' : '#1C2B3A',
    textSec: isDark ? '#94A3B8' : '#5A6C82',
    textMuted: isDark ? '#64748B' : '#94A3B8',
    border: isDark ? '#334155' : '#DCE7F6',
    accentSoft: isDark ? '#0D3340' : '#EBF3FF',
  };
}

export default function ProfileScreen({ role, title, settingsPath, accent, bgLight, heroTitle }: ProfileScreenProps) {
  const { user, refreshUser } = useAuth();
  const { isDark } = useAppTheme();
  const router = useRouter();
  const C = makeColors(isDark, accent, bgLight);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarUri = user?.avatarUrl
    ? user.avatarUrl.startsWith('http')
      ? user.avatarUrl
      : `${API_BASE_URL}${user.avatarUrl}`
    : null;

  const pickAvatar = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Please allow photo library access to upload a profile picture.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const form = new FormData();
      const fileName = asset.fileName || `avatar-${Date.now()}.jpg`;
      const mime = asset.mimeType || 'image/jpeg';

      if (Platform.OS === 'web') {
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: blob.type || mime });
        form.append('avatar', file);
      } else {
        form.append('avatar', {
          uri: asset.uri,
          name: fileName,
          type: mime,
        } as any);
      }

      setUploadingAvatar(true);
      await api.post('/api/auth/avatar', form, {
        headers: Platform.OS === 'web' ? undefined : { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  }, [refreshUser]);

  const loadProfile = useCallback(async () => {
    try {
      if (role === 'PATIENT') {
        const res = await api.get('/api/patient/profile');
        setProfile(res.data);
      } else if (role === 'DOCTOR') {
        const res = await api.get('/api/doctor/profile');
        setProfile(res.data);
      } else {
        setProfile(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to load profile information.');
    } finally {
      setLoading(false);
    }
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  useEffect(() => {
    if (role === 'ADMIN') {
      setLoading(false);
    }
  }, [role]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: C.bg }]}> 
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  const name = user?.fullName || '—';
  const email = user?.email || '—';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero, { backgroundColor: C.accent }]}>
        <View style={styles.heroTop}>
          <TouchableOpacity
            style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.16)' }]}
            onPress={pickAvatar}
            activeOpacity={0.85}
            disabled={uploadingAvatar}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={13} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroName}>{name}</Text>
            <Text style={styles.heroSub}>{email}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: C.text }]}>Profile Details</Text>
      <View style={[styles.card, { backgroundColor: C.card }]}> 
        <InfoRow label="Full Name" value={name} accent={C.accent} bg={C.accentSoft} text={C.text} />
        <Divider color={C.border} />
        <InfoRow label="Email" value={email} accent={C.accent} bg={C.accentSoft} text={C.text} />
        <Divider color={C.border} />
        <InfoRow label="Role" value={title} accent={C.accent} bg={C.accentSoft} text={C.text} />
      </View>

      {role === 'PATIENT' && profile && (
        <View style={[styles.card, { backgroundColor: C.card, marginTop: 14 }]}> 
          <InfoRow label="Blood Group" value={profile.bloodGroup || '—'} accent={C.accent} bg={C.accentSoft} text={C.text} />
          <Divider color={C.border} />
          <InfoRow label="Gender" value={profile.gender || '—'} accent={C.accent} bg={C.accentSoft} text={C.text} />
          <Divider color={C.border} />
          <InfoRow label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-GB') : '—'} accent={C.accent} bg={C.accentSoft} text={C.text} />
        </View>
      )}

      {role === 'DOCTOR' && profile && (
        <View style={[styles.card, { backgroundColor: C.card, marginTop: 14 }]}> 
          <InfoRow label="Specialization" value={profile.specialization || '—'} accent={C.accent} bg={C.accentSoft} text={C.text} />
          <Divider color={C.border} />
          <InfoRow label="License Number" value={profile.licenseNumber || '—'} accent={C.accent} bg={C.accentSoft} text={C.text} />
          <Divider color={C.border} />
          <InfoRow label="Hospital" value={profile.hospitalName || '—'} accent={C.accent} bg={C.accentSoft} text={C.text} />
        </View>
      )}

      {role === 'ADMIN' && (
        <View style={[styles.card, { backgroundColor: C.card, marginTop: 14 }]}> 
          <InfoRow label="Account Type" value="Administrator" accent={C.accent} bg={C.accentSoft} text={C.text} />
          <Divider color={C.border} />
          <InfoRow label="Status" value="Active" accent={C.accent} bg={C.accentSoft} text={C.text} />
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.card }]} onPress={() => router.push(settingsPath as any)}>
          <Ionicons name="settings-outline" size={18} color={C.accent} />
          <Text style={[styles.actionText, { color: C.text }]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  accent,
  bg,
  text,
}: {
  label: string;
  value: string;
  accent: string;
  bg: string;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: bg }]}> 
        <Ionicons name="ellipse" size={8} color={accent} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.label, { color: '#64748B' }]}>{label}</Text>
        <Text style={[styles.value, { color: text }]}>{value}</Text>
      </View>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroTitle: {
    fontSize: 12,
    color: '#DBEAFE',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroName: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    color: '#E0F2FE',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    height: 1,
    opacity: 0.8,
    marginVertical: 8,
  },
  actionsRow: {
    marginTop: 14,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
});