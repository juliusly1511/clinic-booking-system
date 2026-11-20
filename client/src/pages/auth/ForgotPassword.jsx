import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestPasswordReset } from '../../api/auth';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await requestPasswordReset(email);
      toast.success(res.message);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to process request');
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enter your registered email to receive clinic account recovery instructions.
      </p>

      {sent ? (
        <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800">
          Recovery instructions have been queued for <strong>{email}</strong>.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Send Reset Link
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-xs">
        <Link to="/login" className="text-teal-700 hover:underline">Back to Sign In</Link>
      </p>
    </div>
  );
}
