import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

type MenuItem = {
  label: string;
  path: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function TopRightMenu({
  items,
  tintColor = '#1F2937',
}: {
  items: MenuItem[];
  tintColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const activePath = useMemo(() => pathname ?? '', [pathname]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Open navigation menu"
      >
        <Ionicons name="menu" size={24} color={tintColor} />
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu}>
            {items.map((item) => {
              const isActive = activePath === item.path;
              return (
                <TouchableOpacity
                  key={item.path}
                  style={[styles.item, isActive && styles.itemActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setOpen(false);
                    if (!isActive) router.push(item.path as any);
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={isActive ? '#2563EB' : '#475569'}
                    style={styles.itemIcon}
                  />
                  <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 90,
    paddingRight: 14,
  },
  menu: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    marginHorizontal: 6,
    marginVertical: 1,
  },
  itemActive: {
    backgroundColor: '#EFF6FF',
  },
  itemIcon: {
    marginRight: 10,
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