import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { getHomeRouteForRole, ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { ForgotPassword } from './pages/auth/ForgotPassword';

import { SearchDoctors } from './pages/patient/SearchDoctors';
import { BookAppointment } from './pages/patient/BookAppointment';
import { MyAppointments } from './pages/patient/MyAppointments';

import { StaffAppointments } from './pages/staff/Appointments';
import { WalkInBooking } from './pages/staff/WalkInBooking';

import { DailySchedule } from './pages/doctor/DailySchedule';
import { VisitNotes } from './pages/doctor/VisitNotes';

import { AdminUsers } from './pages/admin/Users';
import { AdminSchedules } from './pages/admin/Schedules';
import { AdminReports } from './pages/admin/Reports';
import { AdminNotifications } from './pages/admin/Notifications';

const RootRedirect: React.FC = () => {
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
  return <Navigate to={getHomeRouteForRole(role)} replace />;
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-50">
    <Navbar />
    <main>{children}</main>
  </div>
);

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Patient */}
          <Route
            path="/patient/doctors"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <AppShell>
                  <SearchDoctors />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/book/:doctorId"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <AppShell>
                  <BookAppointment />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <AppShell>
                  <MyAppointments />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Staff */}
          <Route
            path="/staff/appointments"
            element={
              <ProtectedRoute allowedRoles={['staff', 'admin']}>
                <AppShell>
                  <StaffAppointments />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/walk-in"
            element={
              <ProtectedRoute allowedRoles={['staff', 'admin']}>
                <AppShell>
                  <WalkInBooking />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Doctor */}
          <Route
            path="/doctor/schedule"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <AppShell>
                  <DailySchedule />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/appointments/:id"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <AppShell>
                  <VisitNotes />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Admin & Shared Schedule Management */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <AdminUsers />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schedules"
            element={
              <ProtectedRoute allowedRoles={['staff', 'admin']}>
                <AppShell>
                  <AdminSchedules />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <AdminReports />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AppShell>
                  <AdminNotifications />
                </AppShell>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
