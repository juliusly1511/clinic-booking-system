import React, { useCallback, useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import toast from 'react-hot-toast';
import { listNotificationLogs, runReminderJob } from '../../api/reports';
import { formatDisplayDateTime } from '../../lib/dates';
import type { NotificationChannel, NotificationLog, NotificationType } from '../../types';

export const AdminNotifications: React.FC = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningReminders, setRunningReminders] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'sent' | 'failed' | ''>('');
  const [channelFilter, setChannelFilter] = useState<NotificationChannel | ''>('');
  const [typeFilter, setTypeFilter] = useState<NotificationType | ''>('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listNotificationLogs({
        status: statusFilter,
        channel: channelFilter,
        type: typeFilter,
      });
      setLogs(list);
    } catch {
      toast.error('Failed to load notification logs.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter, typeFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRunReminders = async () => {
    setRunningReminders(true);
    try {
      const res = await runReminderJob();
      toast.success(
        `Reminder check complete: ${res.sentCount} sent, ${res.skippedCount} already notified.`
      );
      await loadLogs();
    } catch {
      toast.error('Failed to run reminder check.');
    } finally {
      setRunningReminders(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notification Log</h1>
          <p className="mt-1 text-sm text-slate-600">
            SMS and email delivery records for confirmations, reschedules, cancellations, and
            reminders.
          </p>
        </div>
        <button
          type="button"
          disabled={runningReminders}
          onClick={handleRunReminders}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <BellRing className="h-4 w-4 text-clinic-600" />
          {runningReminders ? 'Checking...' : 'Run reminder check now'}
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'sent' | 'failed' | '')}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Channel</label>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as NotificationChannel | '')}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm"
          >
            <option value="">All channels</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as NotificationType | '')}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm"
          >
            <option value="">All types</option>
            <option value="confirmation">Confirmation</option>
            <option value="reschedule">Reschedule</option>
            <option value="cancellation">Cancellation</option>
            <option value="reminder_24h">24h Reminder</option>
            <option value="reminder_2h">2h Reminder</option>
            <option value="password_reset">Password Reset</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No notification logs found matching these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date / Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-slate-600">
                      {formatDisplayDateTime(log.sentAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-800">
                      {log.type.replace('_', ' ')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 uppercase text-xs font-semibold text-slate-600">
                      {log.channel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {log.recipient}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold">
                      <span
                        className={log.status === 'sent' ? 'text-emerald-700' : 'text-rose-700'}
                      >
                        {log.status === 'sent' ? 'Sent' : 'Failed'}
                      </span>
                    </td>
                    <td className="max-w-sm truncate px-4 py-3 text-xs text-slate-500">
                      {log.errorMessage || log.messagePreview || log.provider}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
