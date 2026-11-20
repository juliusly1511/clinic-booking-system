import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchDoctors, fetchDoctorSlots } from '../../api/doctors';
import { fetchUsers } from '../../api/admin';
import { createAppointment } from '../../api/appointments';
import SlotPicker from '../../components/SlotPicker';

export default function WalkInBooking() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [timeSlot, setTimeSlot] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchUsers({ role: 'patient' }).then((d) => setPatients(d.users || []));
    fetchDoctors().then((d) => setDoctors(d.doctors || []));
  }, []);

  useEffect(() => {
    if (!doctorId || !date) return;
    fetchDoctorSlots(doctorId, date).then((d) => setSlots(d.slots || []));
  }, [doctorId, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAppointment({ patientId, doctorId, date, timeSlot, reason, isWalkIn: true });
      toast.success('Walk-in appointment booked.');
      navigate('/staff/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Walk-in booking failed');
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h1 className="text-2xl font-bold text-slate-900">Walk-In Intake Booking</h1>
      <p className="mt-1 text-sm text-slate-600">Assign an open slot for an on-site walk-in patient.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Select Patient</label>
          <select
            required
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choose patient...</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>{p.name} ({p.phone})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Select Doctor</label>
          <select
            required
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choose doctor...</option>
            {doctors.map((d) => (
              <option key={d._id} value={d._id}>{d.userId?.name} ({d.specialty})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {doctorId && <SlotPicker slots={slots} selectedSlot={timeSlot} onSelect={setTimeSlot} />}

        <div>
          <label className="block text-sm font-medium text-slate-700">Reason for Visit</label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Walk-in consultation reason..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={!timeSlot}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          Confirm Walk-In Slot
        </button>
      </form>
    </div>
  );
}
