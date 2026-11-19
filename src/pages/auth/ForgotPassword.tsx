import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendResetEmail } from '../../api/auth';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      await sendResetEmail(email);
      setSent(true);
      toast.success('Password reset request recorded.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to send reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        {sent ? (
          <div className="mt-6 text-center">
            <MailCheck className="mx-auto h-11 w-11 text-clinic-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Request submitted</h1>
            <p className="mt-2 text-sm text-slate-600">
              If an account exists for <span className="font-medium">{email}</span>, password reset
              instructions have been dispatched.
            </p>
          </div>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Reset password</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your registered email to receive password reset instructions.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-clinic-600 py-2.5 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-60"
              >
                {submitting ? 'Sending...' : 'Send reset instructions'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
