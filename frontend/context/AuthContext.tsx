import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/services/api';

type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  doctor?: { id: number; specialization: string; licenseNumber: string; hospitalName: string } | null;
  patient?: { id: number; dateOfBirth: string; gender: string; bloodGroup: string } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ pendingApproval: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  // Doctor fields
  specialization?: string;
  licenseNumber?: string;
  hospitalName?: string;
  // Patient fields
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('aroggo_token');
        if (storedToken) {
          setToken(storedToken);
          const res = await api.get('/api/auth/me');
          setUser(res.data);
        }
      } catch {
        await AsyncStorage.removeItem('aroggo_token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post('/api/auth/login', { email, password });
    await AsyncStorage.setItem('aroggo_token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }

  async function register(data: RegisterData) {
    const res = await api.post('/api/auth/register', data);
    if (res.data.token) {
      await AsyncStorage.setItem('aroggo_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return { pendingApproval: false, message: res.data.message };
    }

    return {
      pendingApproval: Boolean(res.data.pendingApproval),
      message: res.data.message,
    };
  }

  async function refreshUser() {
    const res = await api.get('/api/auth/me');
    setUser(res.data);
  }

  async function logout() {
    await AsyncStorage.removeItem('aroggo_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
