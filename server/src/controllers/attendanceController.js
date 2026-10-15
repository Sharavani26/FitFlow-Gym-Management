const User = require('../models/User');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { todayStr, dayRange } = require('../utils/time');

exports.list = asyncHandler(async (req, res) => {
  const { start, end } = dayRange(req.query.date || todayStr());
  const records = await Attendance.find({ checkInAt: { $gte: start, $lt: end } })
    .sort({ checkInAt: -1 })
    .limit(200)
    .populate('user', 'name email');
  res.json({ status: 'success', records });
});

exports.checkIn = asyncHandler(async (req, res) => {
  const member = await User.findOne({ _id: req.body.userId, role: 'member' });
  if (!member) throw new ApiError(404, 'Member not found');
  if (!member.isActive) throw new ApiError(400, 'This member account is inactive');

  const now = new Date();
  const active = await Membership.findOne({ user: member._id, startDate: { $lte: now }, endDate: { $gte: now } });
  if (!active) throw new ApiError(400, 'This member has no active membership');

  const open = await Attendance.findOne({ user: member._id, checkOutAt: null });
  if (open) throw new ApiError(409, 'This member is already checked in');

  const record = await Attendance.create({ user: member._id, checkInAt: now, createdBy: req.user._id });
  res.status(201).json({ status: 'success', record });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Attendance record not found');
  if (record.checkOutAt) throw new ApiError(409, 'Already checked out');
  record.checkOutAt = new Date();
  await record.save();
  res.json({ status: 'success', record });
});

exports.myCheckIn = asyncHandler(async (req, res) => {
  const now = new Date();
  const active = await Membership.findOne({
    user: req.user._id,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
  if (!active) throw new ApiError(400, 'An active membership is required to check in');

  const open = await Attendance.findOne({ user: req.user._id, checkOutAt: null });
  if (open) throw new ApiError(409, 'You are already checked in');

  const record = await Attendance.create({ user: req.user._id, checkInAt: now, createdBy: req.user._id });
  res.status(201).json({ status: 'success', record });
});

exports.myList = asyncHandler(async (req, res) => {
  const [records, total] = await Promise.all([
    Attendance.find({ user: req.user._id }).sort({ checkInAt: -1 }).limit(100),
    Attendance.countDocuments({ user: req.user._id }),
  ]);
  res.json({ status: 'success', records, total });
});

exports.myCheckOut = asyncHandler(async (req, res) => {
  const record = await Attendance.findOneAndUpdate(
    { user: req.user._id, checkOutAt: null },
    { $set: { checkOutAt: new Date() } },
    { new: true }
  );
  if (!record) throw new ApiError(409, 'You are not currently checked in');
  res.json({ status: 'success', record });
});