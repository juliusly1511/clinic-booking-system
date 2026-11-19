import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { HeartPulse, X } from 'lucide-react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { getHomeRouteForRole } from '../../components/ProtectedRoute';
import { isValidPhPhone } from '../../lib/dates';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name.'),
    email: z.string().trim().email('Please enter a valid email address.'),
    phone: z
      .string()
      .trim()
      .refine((v) => isValidPhPhone(v), {
        message: 'Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.',
      }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
      .regex(/[0-9]/, 'Password must contain at least one number.'),
    confirmPassword: z.string(),
    consent: z.literal(true, {
      message: 'You must agree to the privacy notice.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const Register: React.FC = () => {
  const { profile, role, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  if (profile && role) {
    return <Navigate to={getHomeRouteForRole(role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0] || 'form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      toast.success('Account created! Welcome to City Health Clinic.');
      navigate('/patient/doctors', { replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-clinic-50 text-clinic-700">
            <HeartPulse className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Patient Registration</h1>
          <p className="mt-1 text-sm text-slate-500">Create your patient account to book online</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Juan Dela Cruz"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="juan@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
            />
            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
              Philippine mobile number
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="09171234567"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
            />
            {errors.phone && <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 chars, 1 letter & 1 number"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
            />
            {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Repeat password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="flex items-start gap-2.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-clinic-600 focus:ring-clinic-500"
              />
              <span>
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="font-semibold text-clinic-700 underline"
                >
                  privacy notice
                </button>{' '}
                (Data Privacy Act of 2012).
              </span>
            </label>
            {errors.consent && <p className="mt-1.5 text-xs text-rose-600">{errors.consent}</p>}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-clinic-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-700 disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-clinic-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      {privacyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 id="privacy-title" className="text-lg font-semibold text-slate-900">
                Clinic Privacy Notice
              </h2>
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close privacy notice"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              In compliance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173),
              City Health Clinic collects your full name, mobile number, email address, and
              appointment details solely to schedule, confirm, remind, and manage your clinic
              visits. Your information is accessed only by authorized clinic personnel and is never
              sold or shared with third parties outside of delivering appointment notifications.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPrivacyOpen(false)}
                className="rounded-lg bg-clinic-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinic-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
