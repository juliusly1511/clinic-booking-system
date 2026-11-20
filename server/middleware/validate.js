const { isValidDateStr, isValidTimeStr, normalizePhPhone } = require('../utils/dateHelpers');

function validateRegister(req, res, next) {
  const { name, email, phone, password, consentAccepted } = req.body;
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ message: 'Full name must be at least 2 characters' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
    return res.status(400).json({ message: 'A valid email address is required' });
  }
  if (!normalizePhPhone(phone)) {
    return res.status(400).json({ message: 'Valid PH mobile number required (09XXXXXXXXX or +639XXXXXXXXX)' });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  if (!consentAccepted) {
    return res.status(400).json({ message: 'Data Privacy Act consent is required to register' });
  }
  return next();
}

function validateBooking(req, res, next) {
  const { doctorId, date, timeSlot, reason } = req.body;
  if (!doctorId) {
    return res.status(400).json({ message: 'doctorId is required' });
  }
  if (!isValidDateStr(date)) {
    return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
  }
  if (!isValidTimeStr(timeSlot)) {
    return res.status(400).json({ message: 'timeSlot must be in HH:mm format' });
  }
  if (!reason || String(reason).trim().length < 3) {
    return res.status(400).json({ message: 'Please provide a brief reason for your visit' });
  }
  return next();
}

module.exports = {
  validateRegister,
  validateBooking
};
