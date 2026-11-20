const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const BlockedDate = require('../models/BlockedDate');
const { manilaDateTimeToUtc, isValidDateStr, isValidTimeStr } = require('../utils/dateHelpers');
const { generateAvailableSlots } = require('../utils/slotGenerator');
const { dispatchAppointmentNotice } = require('../services/reminderJob');

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

async function createAppointment(req, res) {
  try {
    const { doctorId, date, timeSlot, reason, patientId: bodyPatientId, isWalkIn } = req.body;
    const isStaffOrAdmin = ['staff', 'admin'].includes(req.user.role);
    const targetPatientId = isStaffOrAdmin && bodyPatientId ? bodyPatientId : req.user._id;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isActive) {
      return res.status(404).json({ message: 'Selected doctor is not available' });
    }

    const blocked = await BlockedDate.findOne({ doctorId: doctor._id, date });
    if (blocked) {
      return res.status(400).json({ message: `Doctor is unavailable on ${date}: ${blocked.reason}` });
    }

    const validSlots = generateAvailableSlots({ doctor, dateStr: date, isBlocked: false, bookedSlots: [] });
    if (!validSlots.includes(timeSlot)) {
      return res.status(400).json({ message: 'Selected time slot is outside working hours or already in the past' });
    }

    const startsAt = manilaDateTimeToUtc(date, timeSlot);

    const appointment = await Appointment.create({
      patientId: targetPatientId,
      doctorId: doctor._id,
      date,
      timeSlot,
      startsAt,
      reason: String(reason).trim(),
      isWalkIn: Boolean(isWalkIn && isStaffOrAdmin),
      createdBy: req.user._id
    });

    const populated = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email' } });

    dispatchAppointmentNotice(populated, 'confirmation').catch(() => {});

    const output = populated.toObject();
    if (!['doctor', 'admin'].includes(req.user.role)) {
      delete output.notes;
    }

    return res.status(201).json({ appointment: output });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: 'This time slot has already been booked. Please pick another available time.'
      });
    }
    return res.status(500).json({ message: err.message || 'Failed to create appointment' });
  }
}

async function listAppointments(req, res) {
  try {
    const { date, status, doctorId } = req.query;
    const filter = {};

    if (req.user.role === 'patient') {
      filter.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor) return res.json({ appointments: [] });
      filter.doctorId = doctor._id;
    }

    if (date) filter.date = date;
    if (status && status !== 'all') filter.status = status;
    if (doctorId && ['staff', 'admin'].includes(req.user.role)) filter.doctorId = doctorId;

    const selectNotes = ['doctor', 'admin'].includes(req.user.role) ? '' : '-notes';

    const appointments = await Appointment.find(filter)
      .select(selectNotes)
      .sort({ startsAt: 1 })
      .populate('patientId', 'name email phone')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email' } });

    return res.json({ appointments });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch appointments' });
  }
}

async function getAppointmentById(req, res) {
  try {
    const selectNotes = ['doctor', 'admin'].includes(req.user.role) ? '' : '-notes';
    const appointment = await Appointment.findById(req.params.id)
      .select(selectNotes)
      .populate('patientId', 'name email phone')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name email' } });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user.role === 'patient' && String(appointment.patientId._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.json({ appointment });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid appointment ID' });
  }
}

async function cancelAppointment(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'name email phone')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const isOwner = String(appointment.patientId._id) === String(req.user._id);
    const isStaffOrAdmin = ['staff', 'admin'].includes(req.user.role);

    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ message: 'Not authorized to cancel this appointment' });
    }
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ message: `Cannot cancel an appointment with status "${appointment.status}"` });
    }
    if (!isStaffOrAdmin && appointment.startsAt.getTime() - Date.now() < TWO_HOURS_MS) {
      return res.status(400).json({
        message: 'Online cancellation is closed within 2 hours of the appointment. Please call clinic reception.'
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    dispatchAppointmentNotice(appointment, 'cancellation').catch(() => {});
    return res.json({ appointment });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to cancel appointment' });
  }
}

async function rescheduleAppointment(req, res) {
  try {
    const { date, timeSlot } = req.body;
    if (!isValidDateStr(date) || !isValidTimeStr(timeSlot)) {
      return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) and timeSlot (HH:mm) are required' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const isOwner = String(appointment.patientId) === String(req.user._id);
    const isStaffOrAdmin = ['staff', 'admin'].includes(req.user.role);
    if (!isOwner && !isStaffOrAdmin) {
      return res.status(403).json({ message: 'Not authorized to reschedule this appointment' });
    }
    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ message: 'Only confirmed appointments can be rescheduled' });
    }
    if (!isStaffOrAdmin && appointment.startsAt.getTime() - Date.now() < TWO_HOURS_MS) {
      return res.status(400).json({
        message: 'Rescheduling is closed within 2 hours of the appointment. Please contact clinic reception.'
      });
    }

    const doctor = await Doctor.findById(appointment.doctorId);
    const blocked = await BlockedDate.findOne({ doctorId: doctor._id, date });
    if (blocked) {
      return res.status(400).json({ message: `Doctor is unavailable on ${date}` });
    }

    const validSlots = generateAvailableSlots({ doctor, dateStr: date, isBlocked: false, bookedSlots: [] });
    if (!validSlots.includes(timeSlot)) {
      return res.status(400).json({ message: 'Selected target time slot is invalid or in the past' });
    }

    appointment.date = date;
    appointment.timeSlot = timeSlot;
    appointment.startsAt = manilaDateTimeToUtc(date, timeSlot);
    appointment.reminder24hSent = false;
    appointment.reminder2hSent = false;
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate('patientId', 'name email phone')
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });

    dispatchAppointmentNotice(populated, 'reschedule').catch(() => {});
    return res.json({ appointment: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Target time slot is already taken' });
    }
    return res.status(500).json({ message: err.message || 'Failed to reschedule appointment' });
  }
}

async function updateAppointmentStatus(req, res) {
  try {
    const { status } = req.body;
    const allowed = ['checked_in', 'completed', 'no_show', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid appointment status transition' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || String(appointment.doctorId) !== String(doctor._id)) {
        return res.status(403).json({ message: 'Doctors may only update their own appointments' });
      }
    }

    appointment.status = status;
    await appointment.save();
    return res.json({ appointment });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to update status' });
  }
}

async function updateVisitNotes(req, res) {
  try {
    const { notes, markCompleted } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ userId: req.user._id });
      if (!doctor || String(appointment.doctorId) !== String(doctor._id)) {
        return res.status(403).json({ message: 'Doctors may only update notes for their own patients' });
      }
    }

    appointment.notes = String(notes || '').trim();
    if (markCompleted) {
      appointment.status = 'completed';
    }
    await appointment.save();

    return res.json({ appointment });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to save clinical notes' });
  }
}

module.exports = {
  createAppointment,
  listAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  updateVisitNotes
};
