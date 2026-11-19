import React from 'react';
import { CLINIC_TIMEZONE } from '../lib/dates';
import type { AvailableDateInfo } from '../types';

interface DatePickerProps {
  dates: AvailableDateInfo[];
  selectedDate: string;
  onSelect: (date: string) => void;
  loading?: boolean;
}

function getChipParts(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00+08:00`);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'short',
  }).format(d);
  const monthDay = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(d);
  return { weekday, monthDay };
}

export const DatePicker: React.FC<DatePickerProps> = ({
  dates,
  selectedDate,
  onSelect,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
      {dates.map((item) => {
        const disabled = item.openSlots === 0;
        const selected = item.date === selectedDate;
        const { weekday, monthDay } = getChipParts(item.date);

        return (
          <button
            key={item.date}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(item.date)}
            title={item.blockedReason || (disabled ? 'No open slots' : `${item.openSlots} open`)}
            className={`flex flex-col items-center justify-center rounded-lg border px-2 py-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clinic-600 ${
              selected
                ? 'border-clinic-600 bg-clinic-600 text-white'
                : disabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through'
                : 'border-slate-200 bg-white text-slate-800 hover:border-clinic-500 hover:bg-clinic-50'
            }`}
          >
            <span className="text-[11px] font-medium opacity-80">{weekday}</span>
            <span className="text-sm font-semibold tabular-nums">{monthDay}</span>
            <span
              className={`mt-0.5 text-[11px] tabular-nums ${
                selected ? 'text-clinic-50' : disabled ? 'text-slate-400' : 'text-clinic-700'
              }`}
            >
              {item.blockedReason ? 'Closed' : disabled ? 'Full' : `${item.openSlots} open`}
            </span>
          </button>
        );
      })}
    </div>
  );
};
