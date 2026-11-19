import React from 'react';
import { formatDisplayTime } from '../lib/dates';
import type { SlotInfo } from '../types';

interface SlotPickerProps {
  slots: SlotInfo[];
  selectedTime: string;
  onSelect: (time: string) => void;
  blockedReason?: string;
  loading?: boolean;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  selectedTime,
  onSelect,
  blockedReason,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    );
  }

  if (blockedReason) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Unavailable: {blockedReason}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        No time slots available for this date.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {slots.map((slot) => {
        const selected = slot.time === selectedTime;
        const disabled = !slot.available;
        return (
          <button
            key={slot.time}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot.time)}
            title={
              slot.reason === 'taken'
                ? 'Already taken'
                : slot.reason === 'past'
                ? 'Time has passed'
                : 'Available'
            }
            className={`rounded-lg border px-3 py-2.5 font-mono text-xs font-medium tabular-nums transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clinic-600 ${
              selected
                ? 'border-clinic-600 bg-clinic-600 text-white'
                : disabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                : 'border-slate-200 bg-white text-slate-800 hover:border-clinic-500 hover:bg-clinic-50'
            }`}
          >
            {formatDisplayTime(slot.time)}
          </button>
        );
      })}
    </div>
  );
};
