const crypto = require('crypto');
const config = require('../config/env');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

module.exports = (req, res, next) => {
  const header = req.headers.authorization || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  // Hash both sides so the comparison is constant-time and length-safe.
  if (supplied && crypto.timingSafeEqual(sha(supplied), sha(config.metricsToken))) return next();
  res.set('WWW-Authenticate', 'Bearer');
  return res.status(401).json({ status: 'error', message: 'Unauthorized' });
};
