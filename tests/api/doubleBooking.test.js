const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server/server');
const User = require('../../server/models/User');
const Doctor = require('../../server/models/Doctor');
const Appointment = require('../../server/models/Appointment');

let mongoServer;
let tokenA;
let tokenB;
let doctorProfile;

function futureWeekdayStr(daysAhead = 5) {
  const dt = new Date(Date.now() + daysAhead * 86400000);
  while ([0, 6].includes(dt.getUTCDay())) {
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  return dt.toISOString().slice(0, 10);
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Appointment.syncIndexes();

  const hash = await User.hashPassword('Clinic123!');
  const docUser = await User.create({
    name: 'Dr. Concurrency',
    email: 'doc.race@test.ph',
    phone: '+639175551111',
    passwordHash: hash,
    role: 'doctor',
    consentAt: new Date()
  });
  doctorProfile = await Doctor.create({
    userId: docUser._id,
    specialty: 'Cardiology',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30
  });

  const resA = await request(app).post('/api/auth/register').send({
    name: 'Patient A',
    email: 'pa@test.ph',
    phone: '09171000001',
    password: 'Password123!',
    consentAccepted: true
  });
  const resB = await request(app).post('/api/auth/register').send({
    name: 'Patient B',
    email: 'pb@test.ph',
    phone: '09171000002',
    password: 'Password123!',
    consentAccepted: true
  });
  tokenA = resA.body.token;
  tokenB = resB.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Concurrent Double-Booking Prevention', () => {
  it('accepts exactly one booking (201) and rejects concurrent collision (409)', async () => {
    const date = futureWeekdayStr(6);
    const payload = {
      doctorId: doctorProfile._id,
      date,
      timeSlot: '10:00',
      reason: 'Simultaneous booking race test'
    };

    const [r1, r2] = await Promise.all([
      request(app).post('/api/appointments').set('Authorization', `Bearer ${tokenA}`).send(payload),
      request(app).post('/api/appointments').set('Authorization', `Bearer ${tokenB}`).send(payload)
    ]);

    const codes = [r1.statusCode, r2.statusCode].sort();
    expect(codes).toEqual([201, 409]);
  });
});
