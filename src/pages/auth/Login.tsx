import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBootstrapStatus } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { getHomeRouteForRole } from '../../components/ProtectedRoute';
import { isValidPhPhone } from '../../lib/dates';

export const Login: React.FC = () => {
  const { profile, role, login, setupAdmin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    getBootstrapStatus()
      .then((s) => {
        setNeedsAdminSetup(!s.hasAdmin);
        if (!s.hasAdmin) setSetupMode(true);
      })
      .catch(() => {});
  }, []);

  if (profile && role) {
    return <Navigate to={getHomeRouteForRole(role)} replace />;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(getHomeRouteForRole(user.role), { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminForm.name.trim().length < 2) {
      toast.error('Please enter the administrator name.');
      return;
    }
    if (!isValidPhPhone(adminForm.phone)) {
      toast.error('Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.');
      return;
    }
    if (adminForm.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const user = await setupAdmin(adminForm);
      toast.success('Clinic administrator account created!');
      navigate(getHomeRouteForRole(user.role), { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create admin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-clinic-50 text-clinic-700">
            <HeartPulse className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">City Health Clinic</h1>
          <p className="mt-1 text-sm text-slate-500">
            {setupMode && needsAdminSetup
              ? 'Create the first clinic administrator account'
              : 'Sign in to manage your appointments'}
          </p>
        </div>

        {needsAdminSetup && (
          <div className="mt-5 flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setSetupMode(true)}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                setupMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              First-time Admin Setup
            </button>
            <button
              type="button"
              onClick={() => setSetupMode(false)}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                !setupMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Sign in
            </button>
          </div>
        )}

        {setupMode && needsAdminSetup ? (
          <form onSubmit={handleSetupAdminSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-name" className="block text-sm font-medium text-slate-700">
                Administrator name
              </label>
              <input
                id="admin-name"
                type="text"
                required
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                placeholder="Dr. Elena Navarro"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
              />
            </div>
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                placeholder="admin@cityhealth.ph"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
              />
            </div>
            <div>
              <label htmlFor="admin-phone" className="block text-sm font-medium text-slate-700">
                Philippine mobile number
              </label>
              <input
                id="admin-phone"
                type="tel"
                required
                value={adminForm.phone}
                onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                placeholder="09171234567"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
              />
            </div>
            <div>
              <label htmlFor="admin-pw" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="admin-pw"
                type="password"
                required
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                placeholder="Min 8 characters"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-clinic-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-700 disabled:opacity-60"
            >
              {submitting ? 'Creating admin...' : 'Create admin & enter dashboard'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-clinic-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-clinic-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-700 disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          New patient?{' '}
          <Link to="/register" className="font-semibold text-clinic-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
