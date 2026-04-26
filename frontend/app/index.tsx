import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import SplashScreen from '@/components/SplashScreen';

const SPLASH_MIN_MS = 2500;

export default function Index() {
  const { user, loading } = useAuth();
  const [splashReady, setSplashReady] = useState(false);

  // Ensure splash stays visible for at least SPLASH_MIN_MS on startup
  useEffect(() => {
    const timer = setTimeout(() => setSplashReady(true), SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !splashReady) {
    return <SplashScreen />;
  }

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === 'ADMIN') return <Redirect href={'/(admin)' as any} />;
  if (user.role === 'DOCTOR') return <Redirect href="/(doctor)" />;
  return <Redirect href="/(patient)" />;
}
