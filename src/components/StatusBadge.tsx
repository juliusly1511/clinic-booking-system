import React from 'react';
import { AlertCircle, CheckCircle2, Clock, UserCheck, XCircle } from 'lucide-react';
import type { AppointmentStatus } from '../types';

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; colorClass: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: 'Pending',
    colorClass: 'text-amber-700',
    Icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    colorClass: 'text-sky-700',
    Icon: Clock,
  },
  checked_in: {
    label: 'Checked In',
    colorClass: 'text-clinic-700',
    Icon: UserCheck,
  },
  completed: {
    label: 'Completed',
    colorClass: 'text-emerald-700',
    Icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    colorClass: 'text-slate-500',
    Icon: XCircle,
  },
  no_show: {
    label: 'No-show',
    colorClass: 'text-rose-700',
    Icon: AlertCircle,
  },
};

export const StatusBadge: React.FC<{ status: AppointmentStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cfg.colorClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">{cfg.label}</span>
    </span>
  );
};
