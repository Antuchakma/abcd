import ProfileScreen from '@/components/ProfileScreen';

export default function DoctorProfile() {
  return (
    <ProfileScreen
      role="DOCTOR"
      title="Doctor"
      settingsPath="/(doctor)/settings"
      accent="#00BCD4"
      bgLight="#F1F5F9"
      heroTitle="Doctor Profile"
    />
  );
}