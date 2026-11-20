import { Link, useNavigate } from 'react-router-dom';
import { CalendarHeart, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_LINKS = {
  patient: [
    { to: '/patient/doctors', label: 'Find Doctors' },
    { to: '/patient/appointments', label: 'My Appointments' }
  ],
  staff: [
    { to: '/staff/appointments', label: 'Daily Queue' },
    { to: '/staff/walk-in', label: 'Walk-In Booking' }
  ],
  doctor: [
    { to: '/doctor/schedule', label: 'My Schedule' }
  ],
  admin: [
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/schedules', label: 'Schedules' },
    { to: '/admin/users', label: 'Users' }
  ]
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user ? ROLE_LINKS[user.role] || [] : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold text-teal-700">
          <CalendarHeart className="h-6 w-6" />
          <span>City Health Clinic</span>
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
          {links.map((item) => (
            <Link key={item.to} to={item.to} className="hover:text-teal-700 transition-colors">
              {item.label}
            </Link>
          ))}

          {user ? (
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <span className="hidden sm:inline text-xs text-slate-500">
                {user.name} <span className="uppercase font-semibold text-teal-700">({user.role})</span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="hover:text-teal-700">Login</Link>
              <Link
                to="/register"
                className="rounded-md bg-teal-600 px-3 py-1.5 text-white hover:bg-teal-700"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
