const User = require('../models/User');
const Plan = require('../models/Plan');
const Membership = require('../models/Membership');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const DAY_MS = 24 * 60 * 60 * 1000;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const statusOf = (m) => {
  if (!m) return 'none';
  const now = new Date();
  if (m.startDate > now) return 'upcoming';
  return m.endDate < now ? 'expired' : 'active';
};

exports.list = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const filter = { role: 'member' };
  const search = String(req.query.search || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);

  // Latest membership per user on this page
  const memberships = await Membership.find({ user: { $in: users.map((u) => u._id) } }).sort({ endDate: -1 });
  const latest = new Map();
  for (const m of memberships) if (!latest.has(String(m.user))) latest.set(String(m.user), m);

  const members = users.map((u) => {
    const m = latest.get(String(u._id));
    return {
      ...u.toJSON(),
      membership: m ? { planName: m.planName, startDate: m.startDate, endDate: m.endDate } : null,
      membershipStatus: statusOf(m),
    };
  });

  res.json({ status: 'success', members, page, limit, total, pages: Math.ceil(total / limit) });
});

exports.assignPlan = asyncHandler(async (req, res) => {
  const member = await User.findOne({ _id: req.params.id, role: 'member' });
  if (!member) throw new ApiError(404, 'Member not found');

  const plan = await Plan.findById(req.body.planId);
  if (!plan || !plan.isActive) throw new ApiError(400, 'Choose an active plan');

  const now = new Date();
  let start;
  if (req.body.startDate) {
    start = new Date(req.body.startDate);
  } else {
    const current = await Membership.findOne({ user: member._id }).sort({ endDate: -1 });
    start = current && current.endDate > now ? current.endDate : now;
  }
  const end = new Date(start.getTime() + plan.durationDays * DAY_MS);

  const membership = await Membership.create({
    user: member._id,
    plan: plan._id,
    planName: plan.name,
    price: plan.price,
    startDate: start,
    endDate: end,
    createdBy: req.user._id,
  });

  res.status(201).json({ status: 'success', membership });
});