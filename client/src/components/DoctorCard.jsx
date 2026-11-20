import { Link } from 'react-router-dom';
import { MapPin, Stethoscope, Clock } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorCard({ doctor }) {
  const days = (doctor.workingDays || []).map((d) => DAY_NAMES[d]).join(', ');

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs hover:border-teal-300 transition-colors">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{doctor.userId?.name}</h3>
            <p className="inline-flex items-center gap-1 text-sm font-medium text-teal-700">
              <Stethoscope className="h-4 w-4" />
              {doctor.specialty}
            </p>
          </div>
          <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
            {doctor.slotDuration}m slots
          </span>
        </div>

        <p className="mt-3 text-sm text-slate-600 line-clamp-2">
          {doctor.bio || 'Board-certified clinic specialist.'}
        </p>

        <div className="mt-4 space-y-1 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{days} ({doctor.startTime} - {doctor.endTime})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{doctor.roomNumber}</span>
          </div>
        </div>
      </div>

      <Link
        to={`/patient/book/${doctor._id}`}
        className="mt-5 block w-full rounded-lg bg-teal-600 py-2 text-center text-sm font-semibold text-white hover:bg-teal-700"
      >
        Book Appointment
      </Link>
    </div>
  );
}
