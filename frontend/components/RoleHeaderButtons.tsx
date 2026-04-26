import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL } from '@/services/api';

type MenuItem = {
  label: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

const DRAWER_WIDTH = Math.min(300, Math.round(Dimensions.get('window').width * 0.82));

function resolveAvatar(url?: string | null) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}

export function HeaderMenuButton({ items, tintColor }: { items: MenuItem[]; tintColor: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const currentPath = useMemo(() => pathname ?? '', [pathname]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, mounted, slide, fade]);

  const close = () => setOpen(false);
  const avatarUri = resolveAvatar(user?.avatarUrl);
  const initial = (user?.fullName || '?').charAt(0).toUpperCase();
  const roleLabel = user?.role === 'DOCTOR' ? 'Doctor' : user?.role === 'PATIENT' ? 'Patient' : 'Admin';
  const totalBadge = items.reduce((sum, it) => sum + (it.badge ?? 0), 0);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Open navigation drawer"
        style={styles.button}
      >
        <Ionicons name="menu" size={24} color={tintColor} />
        {totalBadge > 0 && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{totalBadge > 99 ? '99+' : totalBadge}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal transparent visible={mounted} animationType="none" onRequestClose={close}>
        <View style={styles.root}>
          <Animated.View style={[styles.overlay, { opacity: fade }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          </Animated.View>

          <Animated.View style={[styles.drawer, { transform: [{ translateX: slide }] }]}>
            <View style={styles.drawerHeader}>
              <View style={styles.avatarWrap}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>{initial}</Text>
                )}
              </View>
              <Text style={styles.headerName} numberOfLines={1}>
                {user?.fullName || 'Guest'}
              </Text>
              <Text style={styles.headerRole} numberOfLines={1}>
                {roleLabel}
              </Text>
            </View>

            <View style={styles.itemsWrap}>
              {items.map((item) => {
                const isActive = currentPath === item.path;
                return (
                  <TouchableOpacity
                    key={item.path}
                    style={[styles.item, isActive && styles.itemActive]}
                    activeOpacity={0.85}
                    onPress={() => {
                      close();
                      if (!isActive) router.push(item.path as any);
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={19}
                      color={isActive ? '#2563EB' : '#475569'}
                      style={styles.itemIcon}
                    />
                    <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{item.label}</Text>
                    {item.badge && item.badge > 0 ? (
                      <View style={styles.itemBadge}>
                        <Text style={styles.itemBadgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

export function HeaderProfileButton({
  tintColor,
  profilePath,
}: {
  tintColor: string;
  profilePath: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const avatarUri = resolveAvatar(user?.avatarUrl);

  return (
    <TouchableOpacity
      onPress={() => router.push(profilePath as any)}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      style={styles.button}
    >
      {avatarUri ? (
        <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
      ) : (
        <Ionicons name="person-circle-outline" size={26} color={tintColor} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 2,
  },
  menuBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E85A6A',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  menuBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  itemBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E85A6A',
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  itemBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingTop: 54,
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 2, height: 0 },
    elevation: 16,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  avatarWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0369A1',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  itemsWrap: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  itemActive: {
    backgroundColor: '#EFF6FF',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  itemTextActive: {
    color: '#1D4ED8',
  },
});
