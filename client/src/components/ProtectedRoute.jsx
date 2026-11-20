import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEFAULT_HOME = {
  patient: '/patient/doctors',
  staff: '/staff/appointments',
  doctor: '/doctor/schedule',
  admin: '/admin/reports'
};

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Verifying session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={DEFAULT_HOME[user.role] || '/login'} replace />;
  }

  return children;
}
