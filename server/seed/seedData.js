require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const BlockedDate = require('../models/BlockedDate');
const { getTodayManila, manilaDateTimeToUtc } = require('../utils/dateHelpers');

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

async function seed() {
  await connectDB();

  await Promise.all([
    Appointment.deleteMany({}),
    BlockedDate.deleteMany({}),
    Doctor.deleteMany({}),
    User.deleteMany({})
  ]);

  const passwordHash = await User.hashPassword('Clinic123!');

  const [patient, staff, admin, docUser1, docUser2, docUser3] = await User.create([
    { name: 'Juan Dela Cruz', email: 'patient@clinic.test', phone: '+639171234567', passwordHash, role: 'patient', consentAt: new Date() },
    { name: 'Ana Reyes', email: 'staff@clinic.test', phone: '+639172223344', passwordHash, role: 'staff', consentAt: new Date() },
    { name: 'Marco Villanueva', email: 'admin@clinic.test', phone: '+639173334455', passwordHash, role: 'admin', consentAt: new Date() },
    { name: 'Dr. Elena Santos', email: 'doctor.santos@clinic.test', phone: '+639174445566', passwordHash, role: 'doctor', consentAt: new Date() },
    { name: 'Dr. Rafael Mendoza', email: 'doctor.mendoza@clinic.test', phone: '+639175556677', passwordHash, role: 'doctor', consentAt: new Date() },
    { name: 'Dr. Camille Lim', email: 'doctor.lim@clinic.test', phone: '+639176667788', passwordHash, role: 'doctor', consentAt: new Date() }
  ]);

  const [doc1, doc2] = await Doctor.create([
    {
      userId: docUser1._id,
      specialty: 'Cardiology',
      bio: 'Preventive cardiology, ECG interpretation, and hypertension care.',
      roomNumber: 'Room 201',
      slotDuration: 30,
      workingDays: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '17:00'
    },
    {
      userId: docUser2._id,
      specialty: 'Pediatrics',
      bio: 'Well-child checkups, pediatric immunizations, and acute care.',
      roomNumber: 'Room 104',
      slotDuration: 20,
      workingDays: [1, 2, 3, 4, 5, 6],
      startTime: '08:00',
      endTime: '16:00'
    },
    {
      userId: docUser3._id,
      specialty: 'General Medicine',
      bio: 'Primary care consultations, medical clearances, and chronic care.',
      roomNumber: 'Room 102',
      slotDuration: 30,
      workingDays: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '17:00'
    }
  ]);

  const today = getTodayManila();
  const tomorrow = addDaysToDateStr(today, 1);
  const leaveDate = addDaysToDateStr(today, 7);

  await Appointment.create([
    {
      patientId: patient._id,
      doctorId: doc1._id,
      date: tomorrow,
      timeSlot: '09:30',
      startsAt: manilaDateTimeToUtc(tomorrow, '09:30'),
      status: 'confirmed',
      reason: 'Annual blood pressure follow-up',
      createdBy: patient._id
    },
    {
      patientId: patient._id,
      doctorId: doc2._id,
      date: today,
      timeSlot: '15:00',
      startsAt: manilaDateTimeToUtc(today, '15:00'),
      status: 'checked_in',
      reason: 'Walk-in pediatric clearance',
      isWalkIn: true,
      createdBy: staff._id
    }
  ]);

  await BlockedDate.create({
    doctorId: doc1._id,
    date: leaveDate,
    reason: 'Annual Cardiology Convention',
    createdBy: admin._id
  });

  console.log('Seed completed successfully.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
