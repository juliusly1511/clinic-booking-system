import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

import SearchDoctors from './pages/patient/SearchDoctors';
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';

import StaffAppointments from './pages/staff/Appointments';
import WalkInBooking from './pages/staff/WalkInBooking';

import DailySchedule from './pages/doctor/DailySchedule';
import VisitNotes from './pages/doctor/VisitNotes';

import ManageUsers from './pages/admin/ManageUsers';
import ManageSchedules from './pages/admin/ManageSchedules';
import Reports from './pages/admin/Reports';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/patient/doctors" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Patient Portal */}
          <Route path="/patient/doctors" element={<SearchDoctors />} />
          <Route
            path="/patient/book/:doctorId"
            element={
              <ProtectedRoute roles={['patient', 'staff', 'admin']}>
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute roles={['patient']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />

          {/* Staff Portal */}
          <Route
            path="/staff/appointments"
            element={
              <ProtectedRoute roles={['staff', 'admin']}>
                <StaffAppointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/walk-in"
            element={
              <ProtectedRoute roles={['staff', 'admin']}>
                <WalkInBooking />
              </ProtectedRoute>
            }
          />

          {/* Doctor Portal */}
          <Route
            path="/doctor/schedule"
            element={
              <ProtectedRoute roles={['doctor']}>
                <DailySchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/notes/:id"
            element={
              <ProtectedRoute roles={['doctor', 'admin']}>
                <VisitNotes />
              </ProtectedRoute>
            }
          />

          {/* Admin Portal */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <ManageUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/schedules"
            element={
              <ProtectedRoute roles={['admin']}>
                <ManageSchedules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute roles={['admin']}>
                <Reports />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
