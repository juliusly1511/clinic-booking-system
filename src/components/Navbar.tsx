import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const NAV_LINKS: Record<UserRole, Array<{ to: string; label: string }>> = {
  patient: [
    { to: '/patient/doctors', label: 'Doctors' },
    { to: '/patient/appointments', label: 'Appointments' },
  ],
  staff: [
    { to: '/staff/appointments', label: 'Queue' },
    { to: '/staff/walk-in', label: 'Walk-in' },
    { to: '/admin/schedules', label: 'Schedules' },
  ],
  doctor: [{ to: '/doctor/schedule', label: 'My Schedule' }],
  admin: [
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/schedules', label: 'Schedules' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/notifications', label: 'Notifications' },
  ],
};

export const Navbar: React.FC = () => {
  const { profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!profile || !role) return null;

  const links = NAV_LINKS[role] ?? [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <Link
          to={links[0]?.to || '/'}
          className="whitespace-nowrap shrink-0 font-display text-base font-bold tracking-tight text-slate-900"
        >
          City Health Clinic
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 border-b-2 py-4 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-clinic-600 text-slate-900'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-4 md:flex">
          <span className="max-w-[200px] truncate text-xs text-slate-500">
            {profile.name} · <span className="capitalize">{role}</span>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="whitespace-nowrap shrink-0 rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Log out
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <p className="mb-2 border-b border-slate-100 pb-2 text-xs text-slate-500">
            {profile.name} · <span className="capitalize">{role}</span>
          </p>
          <nav className="flex flex-col gap-1">
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-clinic-50 text-clinic-700' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
};
