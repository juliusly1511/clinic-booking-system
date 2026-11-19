import React from 'react';
import { formatDisplayTime, formatWorkingDays } from '../lib/dates';
import type { Doctor } from '../types';

interface DoctorCardProps {
  doctor: Doctor;
  onBook: (doctorId: string) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBook }) => {
  const initials = doctor.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div>
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clinic-50 text-sm font-bold text-clinic-700">
            {initials || 'DR'}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-slate-900">
              Dr. {doctor.name}
            </h3>
            <p className="mt-0.5 text-sm font-medium text-clinic-700">{doctor.specialty}</p>
          </div>
        </div>

        {doctor.bio && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{doctor.bio}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>{formatWorkingDays(doctor.workingDays)}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            {formatDisplayTime(doctor.startTime)} – {formatDisplayTime(doctor.endTime)}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{doctor.slotDuration} min visits</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onBook(doctor.id)}
        className="mt-5 w-full rounded-lg bg-clinic-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-clinic-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clinic-600"
      >
        Book appointment
      </button>
    </div>
  );
};
