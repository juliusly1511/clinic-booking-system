const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server/server');
const User = require('../../server/models/User');
const Doctor = require('../../server/models/Doctor');

let mongoServer;
let patientToken;
let doctorProfile;

function futureWeekdayStr(daysAhead = 3) {
  const dt = new Date(Date.now() + daysAhead * 86400000);
  while ([0, 6].includes(dt.getUTCDay())) {
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  return dt.toISOString().slice(0, 10);
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const hash = await User.hashPassword('Clinic123!');
  const docUser = await User.create({
    name: 'Dr. Test Physician',
    email: 'doc@test.ph',
    phone: '+639171112222',
    passwordHash: hash,
    role: 'doctor',
    consentAt: new Date()
  });

  doctorProfile = await Doctor.create({
    userId: docUser._id,
    specialty: 'General Medicine',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '12:00',
    slotDuration: 30
  });

  const regRes = await request(app).post('/api/auth/register').send({
    name: 'Test Patient',
    email: 'patient@test.ph',
    phone: '09173334444',
    password: 'Password123!',
    consentAccepted: true
  });
  patientToken = regRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Booking Lifecycle (/api/appointments)', () => {
  const date = futureWeekdayStr(4);
  let appointmentId;

  it('lists open slots and books an appointment', async () => {
    const slotsRes = await request(app).get(`/api/doctors/${doctorProfile._id}/slots?date=${date}`);
    expect(slotsRes.statusCode).toBe(200);
    expect(slotsRes.body.slots).toContain('09:30');

    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctorId: doctorProfile._id,
        date,
        timeSlot: '09:30',
        reason: 'Annual medical checkup'
      });

    expect(bookRes.statusCode).toBe(201);
    expect(bookRes.body.appointment.status).toBe('confirmed');
    expect(bookRes.body.appointment.notes).toBeUndefined();
    appointmentId = bookRes.body.appointment._id;
  });

  it('cancels appointment and frees the slot for re-booking', async () => {
    const cancelRes = await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.body.appointment.status).toBe('cancelled');

    const slotsRes = await request(app).get(`/api/doctors/${doctorProfile._id}/slots?date=${date}`);
    expect(slotsRes.body.slots).toContain('09:30');
  });
});
