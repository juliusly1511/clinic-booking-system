import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { listDoctors } from '../../api/doctors';
import { DoctorCard } from '../../components/DoctorCard';
import type { Doctor } from '../../types';

export const SearchDoctors: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    listDoctors()
      .then(setDoctors)
      .catch(() => toast.error('Failed to load doctors.'))
      .finally(() => setLoading(false));
  }, []);

  const specialties = useMemo(() => {
    return Array.from(new Set(doctors.map((d) => d.specialty))).sort();
  }, [doctors]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return doctors.filter((d) => {
      if (specialty && d.specialty !== specialty) return false;
      if (
        term &&
        !d.name.toLowerCase().includes(term) &&
        !d.specialty.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [doctors, specialty, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Find a Doctor</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose a specialist and book an available appointment slot.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor name or specialty..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100"
          />
        </div>
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          aria-label="Filter by specialty"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-clinic-600 focus:outline-none focus:ring-2 focus:ring-clinic-100 sm:w-64"
        >
          <option value="">All specialties</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-52 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Stethoscope className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-900">No doctors available yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            {search || specialty
              ? 'Try clearing your search or specialty filter.'
              : 'Ask your clinic administrator to add doctors or load demo data.'}
          </p>
          {(search || specialty) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSpecialty('');
              }}
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((docItem) => (
            <DoctorCard
              key={docItem.id}
              doctor={docItem}
              onBook={(id) => navigate(`/patient/book/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
