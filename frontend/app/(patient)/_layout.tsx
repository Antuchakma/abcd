import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useSocket } from '@/context/SocketContext';
import { useAppTheme } from '@/context/ThemeContext';
import { HeaderMenuButton, HeaderProfileButton } from '@/components/RoleHeaderButtons';

export default function PatientLayout() {
  const { connectionUpdateCount, unreadNotifCount } = useSocket();
  const { isDark } = useAppTheme();
  const headerBg = isDark ? '#0F172A' : '#F4F7FE';
  const headerTint = isDark ? '#F8FAFC' : '#1C2B3A';
  const menuItems = [
    { label: 'Home', path: '/(patient)', icon: 'home-outline' as const },
    { label: 'Doctors', path: '/(patient)/connections', icon: 'people-outline' as const, badge: connectionUpdateCount },
    { label: 'Visits', path: '/(patient)/appointments', icon: 'calendar-outline' as const },
    { label: 'Alerts', path: '/(patient)/notifications', icon: 'notifications-outline' as const, badge: unreadNotifCount },
    { label: 'Prescriptions', path: '/(patient)/prescriptions', icon: 'document-text-outline' as const },
    { label: 'Health', path: '/(patient)/health', icon: 'pulse-outline' as const },
    { label: 'Payments', path: '/(patient)/payments', icon: 'cash-outline' as const },
    { label: 'Settings', path: '/(patient)/settings', icon: 'settings-outline' as const },
  ];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4E8EE8',
        tabBarInactiveTintColor: '#B0C4D8',
        tabBarStyle: {
          display: 'none',
        },
        headerStyle: { backgroundColor: headerBg },
        headerTintColor: headerTint,
        headerShadowVisible: false,
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
            <HeaderProfileButton tintColor={headerTint} profilePath="/(patient)/profile" />
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="connections"
        options={{
          title: 'Doctors',
          tabBarBadge: connectionUpdateCount > 0 ? connectionUpdateCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#4E8EE8', fontSize: 9 },
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Visits',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarBadge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#E85A6A', fontSize: 9 },
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'Rx',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: 'Health',
          tabBarIcon: ({ color, size }) => <Ionicons name="pulse-outline" size={size} color={color} />,
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
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="doctor-profile" options={{ href: null }} />
    </Tabs>
  );
}
