const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server/server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Auth API (/api/auth)', () => {
  it('registers a patient with RA 10173 consent and normalizes PH phone', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Maria Clara',
      email: 'maria@example.com',
      phone: '09171234567',
      password: 'Password123!',
      consentAccepted: true
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.phone).toBe('+639171234567');
    expect(res.body.user.role).toBe('patient');
  });

  it('rejects duplicate email registration with 409', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Maria Duplicate',
      email: 'maria@example.com',
      phone: '09179998888',
      password: 'Password123!',
      consentAccepted: true
    });

    expect(res.statusCode).toBe(409);
  });

  it('logs in registered patient and returns profile on /api/auth/me', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'maria@example.com',
      password: 'Password123!'
    });
    expect(loginRes.statusCode).toBe(200);

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.user.email).toBe('maria@example.com');
  });
});
