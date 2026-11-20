export default function Calendar({ value, onChange, minDate }) {
  const today = minDate || new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">Appointment Date (Asia/Manila)</label>
      <input
        type="date"
        min={today}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
      />
    </div>
  );
}
