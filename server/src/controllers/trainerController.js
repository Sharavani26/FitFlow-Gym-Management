const Trainer = require('../models/Trainer');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const ALLOWED = ['name', 'email', 'phone', 'specialization', 'isActive'];
const pick = (body) => {
  const out = {};
  for (const key of ALLOWED) if (body[key] !== undefined) out[key] = body[key];
  return out;
};

exports.list = asyncHandler(async (req, res) => {
  const trainers = await Trainer.find().sort({ isActive: -1, name: 1 });
  res.json({ status: 'success', trainers });
});

exports.create = asyncHandler(async (req, res) => {
  const trainer = await Trainer.create(pick(req.body));
  res.status(201).json({ status: 'success', trainer });
});

exports.update = asyncHandler(async (req, res) => {
  const trainer = await Trainer.findById(req.params.id);
  if (!trainer) throw new ApiError(404, 'Trainer not found');
  trainer.set(pick(req.body));
  await trainer.save();
  res.json({ status: 'success', trainer });
});