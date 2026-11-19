import { apiRequest, setStoredToken } from '../lib/apiClient';
import type { UserProfile } from '../types';

export interface AuthResponse {
  token: string;
  user: UserProfile;
  doctorId: string | null;
}

export async function getBootstrapStatus(): Promise<{
  hasAdmin: boolean;
  hasDemoData: boolean;
}> {
  return apiRequest('/api/auth/bootstrap-status');
}

export async function setupFirstAdmin(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/api/auth/setup-admin', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setStoredToken(res.token);
  return res;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setStoredToken(res.token);
  return res;
}

export async function registerPatient(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  setStoredToken(res.token);
  return res;
}

export async function fetchCurrentUser(): Promise<{
  user: UserProfile;
  doctorId: string | null;
}> {
  return apiRequest('/api/auth/me');
}

export async function logoutUser(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    setStoredToken(null);
  }
}

export async function sendResetEmail(email: string): Promise<void> {
  await apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
