const User = require('../models/User');
const Doctor = require('../models/Doctor');
const BlockedDate = require('../models/BlockedDate');
const { isValidDateStr, normalizePhPhone } = require('../utils/dateHelpers');

async function listUsers(req, res) {
  try {
    const filter = req.query.role ? { role: req.query.role } : {};
    const users = await User.find(filter).sort({ createdAt: -1 });
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to list users' });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, phone, password, role, specialty, roomNumber, slotDuration, workingDays, startTime, endTime } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = normalizePhPhone(phone);

    if (!name || !normalizedEmail || !normalizedPhone || !password) {
      return res.status(400).json({ message: 'Name, email, valid PH phone, and password are required' });
    }
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: role || 'patient',
      consentAt: new Date()
    });

    let doctor = null;
    if (user.role === 'doctor') {
      doctor = await Doctor.create({
        userId: user._id,
        specialty: specialty || 'General Medicine',
        roomNumber: roomNumber || 'Room 101',
        slotDuration: slotDuration || 30,
        workingDays: workingDays || [1, 2, 3, 4, 5],
        startTime: startTime || '09:00',
        endTime: endTime || '17:00'
      });
    }

    return res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive },
      doctor
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to create user' });
  }
}

async function toggleUserActive(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save();
    await Doctor.updateOne({ userId: user._id }, { isActive: user.isActive });

    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to toggle user status' });
  }
}

async function updateDoctorSchedule(req, res) {
  try {
    const { workingDays, startTime, endTime, slotDuration, roomNumber, specialty, isActive } = req.body;
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

    if (startTime && endTime && startTime >= endTime) {
      return res.status(400).json({ message: 'startTime must be earlier than endTime' });
    }

    if (Array.isArray(workingDays)) doctor.workingDays = workingDays;
    if (startTime) doctor.startTime = startTime;
    if (endTime) doctor.endTime = endTime;
    if (slotDuration) doctor.slotDuration = Number(slotDuration);
    if (roomNumber) doctor.roomNumber = roomNumber;
    if (specialty) doctor.specialty = specialty;
    if (typeof isActive === 'boolean') doctor.isActive = isActive;

    await doctor.save();
    return res.json({ doctor });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to update schedule' });
  }
}

async function listBlockedDates(req, res) {
  try {
    const filter = req.query.doctorId ? { doctorId: req.query.doctorId } : {};
    const blockedDates = await BlockedDate.find(filter)
      .sort({ date: 1 })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });
    return res.json({ blockedDates });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch blocked dates' });
  }
}

async function addBlockedDate(req, res) {
  try {
    const { doctorId, date, reason } = req.body;
    if (!isValidDateStr(date) || !reason) {
      return res.status(400).json({ message: 'Valid date (YYYY-MM-DD) and reason are required' });
    }

    let targetDoctorId = doctorId;
    if (req.user.role === 'doctor') {
      const ownDoc = await Doctor.findOne({ userId: req.user._id });
      if (!ownDoc) return res.status(404).json({ message: 'Doctor profile not found' });
      targetDoctorId = ownDoc._id;
    }

    const blocked = await BlockedDate.create({
      doctorId: targetDoctorId,
      date,
      reason: String(reason).trim(),
      createdBy: req.user._id
    });

    return res.status(201).json({ blockedDate: blocked });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This date is already blocked for the selected doctor' });
    }
    return res.status(500).json({ message: err.message || 'Failed to block date' });
  }
}

async function removeBlockedDate(req, res) {
  try {
    const blocked = await BlockedDate.findById(req.params.id);
    if (!blocked) return res.status(404).json({ message: 'Blocked date not found' });

    if (req.user.role === 'doctor') {
      const ownDoc = await Doctor.findOne({ userId: req.user._id });
      if (!ownDoc || String(blocked.doctorId) !== String(ownDoc._id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    await blocked.deleteOne();
    return res.json({ message: 'Blocked date removed' });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to remove blocked date' });
  }
}

module.exports = {
  listUsers,
  createUser,
  toggleUserActive,
  updateDoctorSchedule,
  listBlockedDates,
  addBlockedDate,
  removeBlockedDate
};
