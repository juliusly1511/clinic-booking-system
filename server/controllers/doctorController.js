const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const BlockedDate = require('../models/BlockedDate');
const { isValidDateStr } = require('../utils/dateHelpers');
const { generateAvailableSlots } = require('../utils/slotGenerator');

async function listDoctors(req, res) {
  try {
    const { specialty, search, includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    if (specialty && specialty !== 'All') {
      filter.specialty = new RegExp(`^${specialty}$`, 'i');
    }

    let doctors = await Doctor.find(filter).populate('userId', 'name email phone isActive');
    doctors = doctors.filter((d) => d.userId && d.userId.isActive);

    if (search) {
      const q = String(search).toLowerCase();
      doctors = doctors.filter(
        (d) =>
          d.userId.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q)
      );
    }

    return res.json({ doctors });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to load doctors' });
  }
}

async function getDoctorById(req, res) {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('userId', 'name email phone');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    return res.json({ doctor });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid doctor ID' });
  }
}

async function getAvailableSlots(req, res) {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!isValidDateStr(date)) {
      return res.status(400).json({ message: 'Query parameter date (YYYY-MM-DD) is required' });
    }

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const [blocked, activeBookings] = await Promise.all([
      BlockedDate.findOne({ doctorId: doctor._id, date }),
      Appointment.find({
        doctorId: doctor._id,
        date,
        status: { $in: ['confirmed', 'checked_in'] }
      }).select('timeSlot')
    ]);

    const bookedSlots = activeBookings.map((b) => b.timeSlot);
    const slots = generateAvailableSlots({
      doctor,
      dateStr: date,
      isBlocked: Boolean(blocked),
      bookedSlots
    });

    return res.json({
      doctorId: doctor._id,
      date,
      isBlocked: Boolean(blocked),
      blockedReason: blocked ? blocked.reason : null,
      slots
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to compute available slots' });
  }
}

module.exports = {
  listDoctors,
  getDoctorById,
  getAvailableSlots
};
