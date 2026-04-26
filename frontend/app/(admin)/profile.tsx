import ProfileScreen from '@/components/ProfileScreen';

export default function AdminProfile() {
  return (
    <ProfileScreen
      role="ADMIN"
      title="Administrator"
      settingsPath="/(admin)/settings"
      accent="#1565C0"
      bgLight="#F8FAFC"
      heroTitle="Admin Profile"
    />
  );
}