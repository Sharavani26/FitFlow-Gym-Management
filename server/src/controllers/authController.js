const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const m = require('../metrics/registry');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

exports.login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user
    ? await user.verifyPassword(password)
    : await bcrypt.compare(password, DUMMY_HASH).then(() => false);

  if (!user || !ok || !user.isActive) {
    m.authFailuresTotal.inc();
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn,
  });
  res.json({ status: 'success', token, user });
});

exports.me = (req, res) => res.json({ status: 'success', user: req.user });

exports.register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (await User.exists({ email })) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  let user;
  try {
    // role is fixed here on purpose; nothing from req.body can set it.
    user = await User.create({
      name,
      email,
      passwordHash: await User.hashPassword(password),
      role: 'member',
    });
  } catch (err) {
    // Two simultaneous signups can both pass the check above; the unique index catches the second.
    if (err.code === 11000) throw new ApiError(409, 'An account with this email already exists');
    throw err;
  }

  res.status(201).json({
    status: 'success',
    message: 'Account created. You can now log in.',
    user, // toJSON removes passwordHash
  });
});