const User = require('../models/User');
const Trainer = require('../models/Trainer');
const Membership = require('../models/Membership');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const { TZ, DAY_MS, todayStr, dayRange, monthStart, dateKey } = require('../utils/time');

exports.overview = asyncHandler(async (req, res) => {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * DAY_MS);
  const today = dayRange(todayStr());
  const sixMonthsAgo = monthStart(5);
  const sevenDaysAgo = new Date(today.start.getTime() - 6 * DAY_MS);

  const [totalMembers, latestPerUser, activeTrainers, checkedInToday, revenueRows, attendanceRows] =
    await Promise.all([
      User.countDocuments({ role: 'member' }),
      Membership.aggregate([
        { $sort: { user: 1, endDate: -1 } },
        { $group: { _id: '$user', start: { $first: '$startDate' }, end: { $first: '$endDate' } } },
      ]),
      Trainer.countDocuments({ isActive: true }),
      Attendance.countDocuments({ checkInAt: { $gte: today.start, $lt: today.end } }),
      Payment.aggregate([
        { $match: { paidAt: { $gte: sixMonthsAgo }, $or: [{ status: 'paid' }, { status: { $exists: false } }] } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt', timezone: TZ } }, total: { $sum: '$amount' } } },
      ]),
      Attendance.aggregate([
        { $match: { checkInAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkInAt', timezone: TZ } }, count: { $sum: 1 } } },
      ]),
    ]);

  let active = 0;
  let upcoming = 0;
  let expiringSoon = 0;
  let expired = 0;
  for (const row of latestPerUser) {
    if (row.end < now) expired += 1;
    else if (row.start > now) upcoming += 1;
    else {
      active += 1;
      if (row.end <= soon) expiringSoon += 1;
    }
  }

  const revenueMap = new Map(revenueRows.map((r) => [r._id, r.total]));
  const revenueByMonth = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = monthStart(i);
    const key = dateKey(d).slice(0, 7);
    revenueByMonth.push({
      month: d.toLocaleDateString('en-IN', { month: 'short', timeZone: TZ }),
      total: revenueMap.get(key) || 0,
    });
  }

  const attMap = new Map(attendanceRows.map((r) => [r._id, r.count]));
  const attendanceByDay = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today.start.getTime() - i * DAY_MS);
    attendanceByDay.push({
      day: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: TZ }),
      count: attMap.get(dateKey(d)) || 0,
    });
  }

  res.json({
    status: 'success',
    stats: {
      totalMembers,
      activeMembers: active,
      upcomingMembers: upcoming,
      expiringSoon,
      expiredMembers: expired,
      noPlanMembers: Math.max(0, totalMembers - latestPerUser.length),
      activeTrainers,
      checkedInToday,
      revenueThisMonth: revenueByMonth[revenueByMonth.length - 1].total,
      revenueByMonth,
      attendanceByDay,
    },
  });
});

exports.memberProgress = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = dayRange(todayStr());
  const weekStart = new Date(today.start.getTime() - 6 * DAY_MS);
  const thisMonth = monthStart(0);

  const [membership, totalVisits, visitsThisMonth, attendanceRows, recentAttendance, openAttendance, recentPayments] =
    await Promise.all([
      Membership.findOne({ user: req.user._id }).sort({ endDate: -1 }),
      Attendance.countDocuments({ user: req.user._id }),
      Attendance.countDocuments({ user: req.user._id, checkInAt: { $gte: thisMonth } }),
      Attendance.aggregate([
        { $match: { user: req.user._id, checkInAt: { $gte: weekStart, $lt: today.end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkInAt', timezone: TZ } }, count: { $sum: 1 } } },
      ]),
      Attendance.find({ user: req.user._id }).sort({ checkInAt: -1 }).limit(5).select('checkInAt checkOutAt'),
      Attendance.findOne({ user: req.user._id, checkOutAt: null }).select('checkInAt'),
      Payment.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('amount method status planName paidAt createdAt'),
    ]);

  const visitMap = new Map(attendanceRows.map((row) => [row._id, row.count]));
  const visitsByDay = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(today.start.getTime() - i * DAY_MS);
    visitsByDay.push({
      day: day.toLocaleDateString('en-IN', { weekday: 'short', timeZone: TZ }),
      count: visitMap.get(dateKey(day)) || 0,
    });
  }

  let membershipStatus = 'none';
  if (membership) {
    if (membership.startDate > now) membershipStatus = 'upcoming';
    else if (membership.endDate >= now) membershipStatus = 'active';
    else membershipStatus = 'expired';
  }

  res.json({
    status: 'success',
    progress: {
      membership,
      membershipStatus,
      totalVisits,
      visitsThisMonth,
      visitsByDay,
      recentAttendance,
      openAttendance,
      recentPayments,
    },
  });
});