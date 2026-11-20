import { Clock } from 'lucide-react';

export default function SlotPicker({ slots, selectedSlot, onSelect, loading, blockedReason }) {
  if (loading) {
    return <p className="text-sm text-slate-500 py-3">Checking available slots...</p>;
  }

  if (blockedReason) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Doctor unavailable on this date: {blockedReason}
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        No open time slots available for this date. Please select another day.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Clock className="h-4 w-4 text-teal-600" />
        <span>Available Time Slots</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot) => {
          const active = selectedSlot === slot;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSelect(slot)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-teal-500 hover:bg-teal-50'
              }`}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
