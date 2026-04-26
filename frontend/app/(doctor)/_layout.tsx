import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSocket } from '@/context/SocketContext';
import { useAppTheme } from '@/context/ThemeContext';
import { HeaderMenuButton, HeaderProfileButton } from '@/components/RoleHeaderButtons';

export default function DoctorLayout() {
  const { pendingRequestCount, unreadNotifCount } = useSocket();
  const { isDark } = useAppTheme();
  const headerBg = isDark ? '#0F172A' : '#F1F5F9';
  const headerTint = isDark ? '#F8FAFC' : '#1E293B';
  const menuItems = [
    { label: 'Dashboard', path: '/(doctor)', icon: 'home-outline' as const },
    { label: 'Patients', path: '/(doctor)/connections', icon: 'people-outline' as const, badge: pendingRequestCount },
    { label: 'Appointments', path: '/(doctor)/appointments', icon: 'calendar-outline' as const },
    { label: 'Notifications', path: '/(doctor)/notifications', icon: 'notifications-outline' as const, badge: unreadNotifCount },
    { label: 'Prescriptions', path: '/(doctor)/prescriptions', icon: 'document-text-outline' as const },
    { label: 'Payments', path: '/(doctor)/payments', icon: 'cash-outline' as const },
    { label: 'Settings', path: '/(doctor)/settings', icon: 'settings-outline' as const },
  ];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00BCD4',
        tabBarInactiveTintColor: isDark ? '#475569' : '#94a3b8',
        tabBarStyle: {
          display: 'none',
        },
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerTint,
        headerTitle: () => null,
        headerLeftContainerStyle: { paddingLeft: 6 },
        headerRightContainerStyle: { paddingRight: 6 },
        headerLeft: () => (
          <View style={{ marginLeft: 4 }}>
            <HeaderMenuButton items={menuItems} tintColor={headerTint} />
          </View>
        ),
        headerRight: () => (
          <View style={{ marginRight: 4 }}>
            <HeaderProfileButton tintColor={headerTint} profilePath="/(doctor)/profile" />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Patients',
          tabBarBadge: pendingRequestCount > 0 ? pendingRequestCount : undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarBadge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#dc2626', color: '#fff', fontSize: 10 },
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'Prescriptions',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="patients" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}
