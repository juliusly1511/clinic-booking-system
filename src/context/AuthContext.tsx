import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerPatient,
  setupFirstAdmin,
} from '../api/auth';
import { getStoredToken, setStoredToken } from '../lib/apiClient';
import type { UserProfile, UserRole } from '../types';

interface AuthContextValue {
  profile: UserProfile | null;
  role: UserRole | null;
  doctorId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<UserProfile>;
  setupAdmin: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const token = getStoredToken();
    if (!token) {
      setProfile(null);
      setDoctorId(null);
      return;
    }
    try {
      const res = await fetchCurrentUser();
      setProfile(res.user);
      setDoctorId(res.doctorId);
    } catch {
      setStoredToken(null);
      setProfile(null);
      setDoctorId(null);
    }
  };

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await loginUser(email, password);
    setProfile(res.user);
    setDoctorId(res.doctorId);
    return res.user;
  };

  const register = async (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const res = await registerPatient(input);
    setProfile(res.user);
    setDoctorId(res.doctorId);
    return res.user;
  };

  const setupAdmin = async (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => {
    const res = await setupFirstAdmin(input);
    setProfile(res.user);
    setDoctorId(res.doctorId);
    return res.user;
  };

  const logout = async () => {
    await logoutUser();
    setProfile(null);
    setDoctorId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        role: profile?.role ?? null,
        doctorId,
        loading,
        login,
        register,
        setupAdmin,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
