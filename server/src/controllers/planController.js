const Plan = require('../models/Plan');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Only these fields can ever be set from the request body.
const ALLOWED = ['name', 'description', 'price', 'durationDays', 'isActive'];
const pick = (body) => {
  const out = {};
  for (const key of ALLOWED) if (body[key] !== undefined) out[key] = body[key];
  return out;
};

exports.list = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { isActive: true };
  const plans = await Plan.find(filter).sort({ price: 1 });
  res.json({ status: 'success', plans });
});

exports.create = asyncHandler(async (req, res) => {
  const plan = await Plan.create(pick(req.body));
  res.status(201).json({ status: 'success', plan });
});

exports.update = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found');
  plan.set(pick(req.body));
  await plan.save(); // runs the schema validators
  res.json({ status: 'success', plan });
});