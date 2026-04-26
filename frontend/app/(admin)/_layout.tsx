import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { HeaderMenuButton, HeaderProfileButton } from '@/components/RoleHeaderButtons';

export default function AdminLayout() {
  const { isDark } = useAppTheme();
  const headerBg = isDark ? '#0F172A' : '#F8FAFC';
  const headerTint = isDark ? '#F8FAFC' : '#0F172A';
  const menuItems = [
    { label: 'Dashboard', path: '/(admin)', icon: 'home-outline' as const },
    { label: 'Doctors', path: '/(admin)/doctors', icon: 'medical-outline' as const },
    { label: 'Settings', path: '/(admin)/settings', icon: 'settings-outline' as const },
  ];

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#1565C0',
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
            <HeaderProfileButton tintColor={headerTint} profilePath="/(admin)/profile" />
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
        name="doctors"
        options={{
          title: 'Doctors',
          tabBarIcon: ({ color, size }) => <Ionicons name="medical-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
