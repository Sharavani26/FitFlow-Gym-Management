process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/fitflow-test';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.METRICS_TOKEN = 'test-metrics-token-that-is-at-least-32-characters-long';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Plan = require('../src/models/Plan');
const Membership = require('../src/models/Membership');
const Attendance = require('../src/models/Attendance');
const Payment = require('../src/models/Payment');

let mongo;
let admin;
let member;
let otherMember;
let adminToken;
let memberToken;

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Plan.init(), Membership.init(), Attendance.init(), Payment.init()]);
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Plan.deleteMany({}),
    Membership.deleteMany({}),
    Attendance.deleteMany({}),
    Payment.deleteMany({}),
  ]);

  [admin, member, otherMember] = await User.create([
    { name: 'Admin', email: 'admin@example.com', passwordHash: 'not-used', role: 'admin' },
    { name: 'Member', email: 'member@example.com', passwordHash: 'not-used', role: 'member' },
    { name: 'Other Member', email: 'other@example.com', passwordHash: 'not-used', role: 'member' },
  ]);
  adminToken = tokenFor(admin);
  memberToken = tokenFor(member);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test('members request a plan, staff verify it, and the membership activates once', async () => {
  const plan = await Plan.create({ name: 'Monthly', price: 1200, durationDays: 30 });
  const response = await request(app)
    .post('/api/payments/request')
    .set(auth(memberToken))
    .send({ planId: String(plan._id), method: 'upi' })
    .expect(201);

  expect(response.body.payment).toMatchObject({
    amount: 1200,
    method: 'upi',
    planName: 'Monthly',
    status: 'pending',
  });
  expect(await Membership.countDocuments({ user: member._id })).toBe(0);

  await request(app)
    .post('/api/payments/request')
    .set(auth(memberToken))
    .send({ planId: String(plan._id), method: 'upi' })
    .expect(409);

  await request(app)
    .post(`/api/payments/${response.body.payment._id}/verify`)
    .set(auth(memberToken))
    .expect(403);

  const pendingList = await request(app).get('/api/payments').set(auth(adminToken)).expect(200);
  expect(pendingList.body.paymentRequests[0].status).toBe('pending');
  expect(pendingList.body.thisMonth.amount).toBe(0);

  const verifyPath = `/api/payments/${response.body.payment._id}/verify`;
  const verifications = await Promise.all([
    request(app).post(verifyPath).set(auth(adminToken)),
    request(app).post(verifyPath).set(auth(adminToken)),
  ]);
  expect(verifications.map((result) => result.status)).toEqual([200, 200]);
  expect(verifications[0].body.payment.status).toBe('paid');
  expect(verifications[0].body.membership.planName).toBe('Monthly');
  expect(await Membership.countDocuments({ payment: response.body.payment._id })).toBe(1);

  await request(app)
    .post(`/api/payments/${response.body.payment._id}/verify`)
    .set(auth(adminToken))
    .expect(200);
  expect(await Membership.countDocuments({ payment: response.body.payment._id })).toBe(1);
});

test('members can only check in and out themselves with an active membership', async () => {
  await request(app)
    .post('/api/attendance/mine/check-in')
    .set(auth(memberToken))
    .expect(400);

  const plan = await Plan.create({ name: 'Active', price: 100, durationDays: 30 });
  const payment = await Payment.create({
    user: member._id,
    plan: plan._id,
    planName: plan.name,
    planDurationDays: plan.durationDays,
    amount: plan.price,
    method: 'cash',
    status: 'pending',
    paidAt: null,
  });
  await request(app)
    .post(`/api/payments/${payment._id}/verify`)
    .set(auth(adminToken))
    .expect(200);

  const checkIn = await request(app)
    .post('/api/attendance/mine/check-in')
    .set(auth(memberToken))
    .send({ userId: String(otherMember._id) })
    .expect(201);
  expect(String(checkIn.body.record.user)).toBe(String(member._id));

  await request(app)
    .post('/api/attendance/mine/check-in')
    .set(auth(memberToken))
    .expect(409);

  const history = await request(app)
    .get('/api/attendance/mine')
    .set(auth(memberToken))
    .expect(200);
  expect(history.body.total).toBe(1);

  const checkedOut = await request(app)
    .patch('/api/attendance/mine/check-out')
    .set(auth(memberToken))
    .expect(200);
  expect(checkedOut.body.record.checkOutAt).toBeTruthy();

  await request(app)
    .patch('/api/attendance/mine/check-out')
    .set(auth(memberToken))
    .expect(409);
  await request(app).get('/api/attendance').set(auth(memberToken)).expect(403);

  const progress = await request(app).get('/api/stats/me').set(auth(memberToken)).expect(200);
  expect(progress.body.progress.totalVisits).toBe(1);
  expect(progress.body.progress.membershipStatus).toBe('active');
});

test('free plans activate immediately and rejected requests do not create memberships', async () => {
  const freePlan = await Plan.create({ name: 'Trial', price: 0, durationDays: 7 });
  const freeResponse = await request(app)
    .post('/api/payments/request')
    .set(auth(memberToken))
    .send({ planId: String(freePlan._id), method: 'cash' })
    .expect(201);
  expect(freeResponse.body.membership.price).toBe(0);
  expect(await Payment.countDocuments({ user: member._id })).toBe(0);

  const paidPlan = await Plan.create({ name: 'Annual', price: 5000, durationDays: 365 });
  const paymentResponse = await request(app)
    .post('/api/payments/request')
    .set(auth(tokenFor(otherMember)))
    .send({ planId: String(paidPlan._id), method: 'card' })
    .expect(201);
  const paymentId = paymentResponse.body.payment._id;

  await request(app)
    .post(`/api/payments/${paymentId}/reject`)
    .set(auth(adminToken))
    .expect(200);
  expect(await Membership.countDocuments({ user: otherMember._id })).toBe(0);
});
