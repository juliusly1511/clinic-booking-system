import { useEffect, useState } from 'react';
import { fetchSummaryReport } from '../../api/reports';

export default function Reports() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchSummaryReport().then(setReport).catch(() => {});
  }, []);

  if (!report) return <p className="text-sm text-slate-500">Loading clinic analytics...</p>;

  const { summary, byDoctor } = report;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clinic Operations & KPI Report</h1>
        <p className="text-sm text-slate-600">Real-time completion, walk-in, and no-show performance metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Total Bookings</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Completion Rate</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{summary.completionRate}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">No-Show Rate</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">{summary.noShowRate}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500 uppercase">Walk-In Visits</p>
          <p className="mt-1 text-3xl font-bold text-teal-700">{summary.walkIns}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">No-Shows</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byDoctor.map((row) => (
              <tr key={row.doctorId}>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">{row.specialty}</td>
                <td className="px-4 py-3">{row.total}</td>
                <td className="px-4 py-3 text-emerald-700 font-medium">{row.completed}</td>
                <td className="px-4 py-3 text-amber-700">{row.noShow}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
