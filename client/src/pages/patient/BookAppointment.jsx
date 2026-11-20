import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchDoctorById, fetchDoctorSlots } from '../../api/doctors';
import { createAppointment } from '../../api/appointments';
import Calendar from '../../components/Calendar';
import SlotPicker from '../../components/SlotPicker';

export default function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [blockedReason, setBlockedReason] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDoctorById(doctorId)
      .then((data) => setDoctor(data.doctor))
      .catch(() => toast.error('Unable to load doctor profile'));
  }, [doctorId]);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setSelectedSlot('');
    fetchDoctorSlots(doctorId, date)
      .then((data) => {
        setSlots(data.slots || []);
        setBlockedReason(data.blockedReason || null);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [doctorId, date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error('Please pick an open time slot.');
      return;
    }
    setSubmitting(true);
    try {
      await createAppointment({ doctorId, date, timeSlot: selectedSlot, reason });
      toast.success('Appointment confirmed! SMS & email reminder scheduled.');
      navigate('/patient/appointments');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
      fetchDoctorSlots(doctorId, date).then((d) => setSlots(d.slots || []));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
      <h1 className="text-2xl font-bold text-slate-900">Book Appointment</h1>
      {doctor && (
        <p className="mt-1 text-sm text-teal-700 font-medium">
          {doctor.userId?.name} — {doctor.specialty} ({doctor.roomNumber})
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Calendar value={date} onChange={setDate} />

        <SlotPicker
          slots={slots}
          selectedSlot={selectedSlot}
          onSelect={setSelectedSlot}
          loading={loadingSlots}
          blockedReason={blockedReason}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700">Reason for Visit</label>
          <textarea
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe your symptoms or consultation request..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !selectedSlot}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? 'Confirming...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  );
}
