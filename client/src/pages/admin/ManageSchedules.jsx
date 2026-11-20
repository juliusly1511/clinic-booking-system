import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fetchDoctors } from '../../api/doctors';
import { addBlockedDate, fetchBlockedDates, removeBlockedDate } from '../../api/admin';

export default function ManageSchedules() {
  const [doctors, setDoctors] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');

  const load = () => {
    fetchDoctors({ includeInactive: true }).then((d) => setDoctors(d.doctors || []));
    fetchBlockedDates().then((d) => setBlockedDates(d.blockedDates || []));
  };

  useEffect(load, []);

  const handleBlock = async (e) => {
    e.preventDefault();
    try {
      await addBlockedDate({ doctorId, date, reason });
      toast.success('Date blocked.');
      setDate('');
      setReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to block date');
    }
  };

  const handleRemove = async (id) => {
    await removeBlockedDate(id);
    toast.success('Blocked date removed.');
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage Doctor Schedules & Leave Blocks</h1>
        <p className="text-sm text-slate-600">Block clinic holidays or physician leave days.</p>
      </div>

      <form onSubmit={handleBlock} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <select
          required
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select Doctor...</option>
          {doctors.map((d) => (
            <option key={d._id} value={d._id}>{d.userId?.name}</option>
          ))}
        </select>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Leave / Holiday reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Block Date
        </button>
      </form>

      <div className="space-y-2">
        {blockedDates.map((b) => (
          <div key={b._id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <div>
              <strong>{b.date}</strong> — {b.doctorId?.userId?.name} ({b.reason})
            </div>
            <button
              type="button"
              onClick={() => handleRemove(b._id)}
              className="rounded border border-rose-200 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
