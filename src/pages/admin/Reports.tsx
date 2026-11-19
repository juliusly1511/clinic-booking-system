import React, { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { getReportsData } from '../../api/reports';
import type { ReportsResult } from '../../api/reports';
import { formatDisplayDate, getManilaMonthRange } from '../../lib/dates';

export const AdminReports: React.FC = () => {
  const month = getManilaMonthRange();
  const [startDate, setStartDate] = useState(month.start);
  const [endDate, setEndDate] = useState(month.end);
  const [data, setData] = useState<ReportsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getReportsData(startDate, endDate)
      .then(setData)
      .catch(() => toast.error('Failed to load reports.'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const maxDayCount = useMemo(() => {
    if (!data || data.perDay.length === 0) return 1;
    return Math.max(1, ...data.perDay.map((d) => d.count));
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 print:px-0 print:py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinic Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Appointment totals, daily volume, and doctor no-show performance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 print:hidden"
        >
          <Printer className="h-4 w-4" />
          Print report
        </button>
      </div>

      {loading || !data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Today</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-900">
                {data.today.total}
              </p>
              <p className="mt-2 font-mono text-xs tabular-nums text-slate-500">
                {data.today.completed} completed · {data.today.cancelled} cancelled
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">This Week</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-900">
                {data.week.total}
              </p>
              <p className="mt-2 font-mono text-xs tabular-nums text-slate-500">
                {data.week.completed} completed · {data.week.no_show} no-show
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">This Month</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-900">
                {data.month.total}
              </p>
              <p className="mt-2 font-mono text-xs tabular-nums text-slate-500">
                {data.month.completed} completed · {data.month.cancelled} cancelled
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Overall No-Show Rate</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-clinic-700">
                {data.overallNoShowRate}%
              </p>
              <p className="mt-2 text-xs text-slate-500">
                In selected range (excludes cancelled &amp; future)
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 print:hidden">
            <div>
              <label className="block text-xs font-medium text-slate-600">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900">Appointments per Day</h2>
            {data.perDay.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No appointments recorded in this date range.
              </p>
            ) : (
              <div className="mt-6">
                <div className="flex h-52 items-end gap-2 overflow-x-auto border-b border-slate-200 pb-2">
                  {data.perDay.map((entry) => {
                    const heightPct = Math.max(8, Math.round((entry.count / maxDayCount) * 100));
                    return (
                      <div
                        key={entry.date}
                        className="flex min-w-[44px] flex-1 flex-col items-center justify-end gap-1.5 h-full"
                      >
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
                          {entry.count}
                        </span>
                        <div
                          className="w-full max-w-[36px] rounded-t-md bg-clinic-600 transition-all"
                          style={{ height: `${heightPct}%` }}
                          title={`${formatDisplayDate(entry.date)}: ${entry.count}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {data.perDay.map((entry) => (
                    <div
                      key={entry.date}
                      className="min-w-[44px] flex-1 text-center font-mono text-[11px] tabular-nums text-slate-500"
                    >
                      {entry.date.slice(5)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Doctor Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-6 py-3">Doctor</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-right">Completed</th>
                    <th className="px-6 py-3 text-right">Cancelled</th>
                    <th className="px-6 py-3 text-right">No-show</th>
                    <th className="px-6 py-3 text-right">No-show Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs tabular-nums">
                  {data.perDoctor.map((row) => (
                    <tr key={row.doctorId}>
                      <td className="px-6 py-3.5 font-sans text-sm font-medium text-slate-900">
                        {row.doctorName}
                      </td>
                      <td className="px-6 py-3.5 text-right text-slate-700">{row.total}</td>
                      <td className="px-6 py-3.5 text-right text-emerald-700">{row.completed}</td>
                      <td className="px-6 py-3.5 text-right text-slate-500">{row.cancelled}</td>
                      <td className="px-6 py-3.5 text-right text-rose-700">{row.noShow}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                        {row.noShowRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
