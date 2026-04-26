import ProfileScreen from '@/components/ProfileScreen';

export default function PatientProfile() {
  return (
    <ProfileScreen
      role="PATIENT"
      title="Patient"
      settingsPath="/(patient)/settings"
      accent="#4E8EE8"
      bgLight="#F4F7FE"
      heroTitle="Patient Profile"
    />
  );
}