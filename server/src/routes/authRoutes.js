const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { login, me, register } = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many login attempts. Try again later.' },
});

router.post(
  '/login',
  loginLimiter,
  [body('email').isEmail().withMessage('A valid email is required'), body('password').isString().notEmpty().withMessage('Password is required')],
  validate,
  login
);
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many sign-ups from this address. Try again later.' },
});

router.post(
  '/register',
  registerLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters'),
    body('email').trim().isEmail().withMessage('A valid email is required').isLength({ max: 254 }),
    body('password')
      .isString()
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be 8 to 72 characters')
      .matches(/[A-Za-z]/)
      .withMessage('Password must include a letter')
      .matches(/\d/)
      .withMessage('Password must include a number'),
  ],
  validate,
  register
);
router.get('/me', protect, me);

module.exports = router;