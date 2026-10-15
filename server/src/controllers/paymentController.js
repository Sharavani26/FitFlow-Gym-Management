const User = require('../models/User');
const Payment = require('../models/Payment');
const Plan = require('../models/Plan');
const Membership = require('../models/Membership');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { monthStart } = require('../utils/time');

exports.list = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const historyFilter = { status: { $nin: ['pending', 'processing'] } };

  const [paymentRequests, payments, total, month] = await Promise.all([
    Payment.find({ status: { $in: ['pending', 'processing'] } })
      .sort({ createdAt: -1 })
      .populate('user', 'name email'),
    Payment.find(historyFilter)
      .sort({ paidAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name email'),
    Payment.countDocuments(historyFilter),
    Payment.aggregate([
      { $match: { paidAt: { $gte: monthStart(0) }, $or: [{ status: 'paid' }, { status: { $exists: false } }] } },
      { $group: { _id: null, sum: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    status: 'success',
    paymentRequests,
    payments,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    thisMonth: { amount: month[0]?.sum || 0, count: month[0]?.count || 0 },
  });
});

exports.create = asyncHandler(async (req, res) => {
  const member = await User.findOne({ _id: req.body.userId, role: 'member' });
  if (!member) throw new ApiError(404, 'Member not found');

  const payment = await Payment.create({
    user: member._id,
    amount: req.body.amount,
    method: req.body.method,
    note: req.body.note || '',
    paidAt: req.body.paidAt ? new Date(req.body.paidAt) : new Date(),
    status: 'paid',
    createdBy: req.user._id,
  });
  res.status(201).json({ status: 'success', payment });
});

exports.requestPlanPayment = asyncHandler(async (req, res) => {
  const plan = await Plan.findOne({ _id: req.body.planId, isActive: true });
  if (!plan) throw new ApiError(404, 'This plan is no longer available');

  const pending = await Payment.findOne({ user: req.user._id, status: { $in: ['pending', 'processing'] } });
  if (pending) throw new ApiError(409, 'You already have a payment request awaiting review');

  if (plan.price === 0) {
    const now = new Date();
    const current = await Membership.findOne({ user: req.user._id }).sort({ endDate: -1 });
    const startDate = current && current.endDate > now ? current.endDate : now;
    const membership = await Membership.create({
      user: req.user._id,
      plan: plan._id,
      planName: plan.name,
      price: 0,
      startDate,
      endDate: new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000),
      createdBy: req.user._id,
    });
    return res.status(201).json({ status: 'success', membership });
  }

  const payment = await Payment.create({
    user: req.user._id,
    plan: plan._id,
    planName: plan.name,
    planDurationDays: plan.durationDays,
    amount: plan.price,
    method: req.body.method,
    status: 'pending',
    paidAt: null,
  });
  res.status(201).json({ status: 'success', payment });
});

exports.verifyPlanPayment = asyncHandler(async (req, res) => {
  let payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status === 'paid') {
    const membership = await Membership.findOne({ payment: payment._id });
    if (membership) return res.json({ status: 'success', payment, membership });
  }
  if (payment.status === 'pending') {
    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'pending' },
      { $set: { status: 'processing', verifiedBy: req.user._id } },
      { new: true }
    );
    payment = claimed || await Payment.findById(payment._id);
  }
  if (payment.status !== 'processing' || !payment.plan || !payment.planDurationDays) {
    throw new ApiError(409, 'This payment request is no longer awaiting review');
  }

  let membership = await Membership.findOne({ payment: payment._id });
  if (!membership) {
    const now = new Date();
    const current = await Membership.findOne({ user: payment.user }).sort({ endDate: -1 });
    const startDate = current && current.endDate > now ? current.endDate : now;
    const endDate = new Date(startDate.getTime() + payment.planDurationDays * 24 * 60 * 60 * 1000);
    const releaseVerification = () => Payment.updateOne(
      { _id: payment._id, status: 'processing', verifiedBy: req.user._id },
      { $set: { status: 'pending' }, $unset: { verifiedBy: 1 } }
    );
    try {
      membership = await Membership.create({
        user: payment.user,
        plan: payment.plan,
        payment: payment._id,
        planName: payment.planName,
        price: payment.amount,
        startDate,
        endDate,
        createdBy: req.user._id,
      });
    } catch (error) {
      if (error.code !== 11000) {
        await releaseVerification();
        throw error;
      }
      membership = await Membership.findOne({ payment: payment._id });
      if (!membership) {
        await releaseVerification();
        throw error;
      }
    }
  }

  const verified = await Payment.findOneAndUpdate(
    { _id: payment._id, status: 'processing' },
    { $set: { status: 'paid', paidAt: new Date(), verifiedBy: req.user._id } },
    { new: true }
  );
  if (!verified) {
    const latest = await Payment.findById(payment._id);
    if (latest?.status === 'paid') return res.json({ status: 'success', payment: latest, membership });
    throw new ApiError(409, 'This payment request has already been reviewed');
  }

  res.json({ status: 'success', payment: verified, membership });
});

exports.rejectPlanPayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: req.params.id, status: 'pending', plan: { $exists: true } },
    { $set: { status: 'rejected', paidAt: null, verifiedBy: req.user._id } },
    { new: true }
  );
  if (!payment) throw new ApiError(404, 'Pending plan payment request not found');
  res.json({ status: 'success', payment });
});

exports.listMine = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('amount method note status planName paidAt createdAt');
  res.json({ status: 'success', payments });
});