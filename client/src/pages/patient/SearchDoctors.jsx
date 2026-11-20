import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchDoctors } from '../../api/doctors';
import DoctorCard from '../../components/DoctorCard';

const SPECIALTIES = ['All', 'General Medicine', 'Cardiology', 'Pediatrics', 'Dermatology'];

export default function SearchDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [specialty, setSpecialty] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDoctors({ specialty: specialty === 'All' ? undefined : specialty, search: search || undefined })
      .then((data) => setDoctors(data.doctors || []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [specialty, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Find a Clinic Physician</h1>
        <p className="mt-1 text-sm text-slate-600">Browse specialties and choose an available consultation slot.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor name or specialty..."
            className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>

        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
        >
          {SPECIALTIES.map((sp) => (
            <option key={sp} value={sp}>{sp}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-52 animate-pulse rounded-xl border border-slate-200 bg-white p-5" />
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No matching doctors found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doc) => (
            <DoctorCard key={doc._id} doctor={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
