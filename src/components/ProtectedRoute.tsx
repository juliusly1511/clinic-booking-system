import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export function getHomeRouteForRole(role: UserRole | null): string {
  switch (role) {
    case 'patient':
      return '/patient/doctors';
    case 'staff':
      return '/staff/appointments';
    case 'doctor':
      return '/doctor/schedule';
    case 'admin':
      return '/admin/reports';
    default:
      return '/login';
  }
}

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { profile, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-clinic-100 border-t-clinic-600" />
      </div>
    );
  }

  if (!profile || !role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">You do not have access</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your current role ({role}) does not have permission to open this page.
          </p>
          <Link
            to={getHomeRouteForRole(role)}
            className="mt-6 inline-block rounded-lg bg-clinic-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-clinic-700"
          >
            Go to my dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
