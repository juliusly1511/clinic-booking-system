const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const { normalizePhPhone } = require('../utils/dateHelpers');

function signToken(user) {
  const secret = process.env.JWT_SECRET || 'dev_clinic_jwt_secret_change_me';
  return jwt.sign({ id: user._id, role: user.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

async function register(req, res) {
  try {
    const { name, email, phone, password, consentAccepted } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = normalizePhPhone(phone);

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: 'patient',
      consentAt: consentAccepted ? new Date() : null
    });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'This account has been deactivated by administration' });
    }

    const doctorProfile = user.role === 'doctor' ? await Doctor.findOne({ userId: user._id }) : null;
    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        doctorId: doctorProfile ? doctorProfile._id : null
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Login failed' });
  }
}

async function getMe(req, res) {
  const doctorProfile = req.user.role === 'doctor' ? await Doctor.findOne({ userId: req.user._id }) : null;
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      doctorId: doctorProfile ? doctorProfile._id : null
    }
  });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email address is required' });
  }
  return res.json({
    message: 'If an active account matches that email, password reset instructions have been queued.'
  });
}

module.exports = {
  register,
  login,
  getMe,
  forgotPassword
};
