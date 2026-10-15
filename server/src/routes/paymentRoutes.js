const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { list, create, requestPlanPayment, verifyPlanPayment, rejectPlanPayment, listMine } = require('../controllers/paymentController');

router.use(protect);

router.get('/mine', authorize('member'), listMine);
router.post(
  '/request',
  authorize('member'),
  [
    body('planId').isMongoId().withMessage('A valid plan is required'),
    body('method').isIn(['cash', 'card', 'upi', 'other']).withMessage('Choose a payment method'),
  ],
  validate,
  requestPlanPayment
);

router.use(authorize('admin'));

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid page'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1 to 50'),
  ],
  validate,
  list
);

router.post(
  '/',
  [
    body('userId').isMongoId().withMessage('A valid member is required'),
    body('amount').isFloat({ min: 0.01, max: 1000000 }).withMessage('Amount must be between 0.01 and 1000000').toFloat(),
    body('method').isIn(['cash', 'card', 'upi', 'other']).withMessage('Choose a payment method'),
    body('note').optional({ values: 'falsy' }).isString().bail().trim().isLength({ max: 200 }).withMessage('Note must be at most 200 characters'),
    body('paidAt').optional().isISO8601().withMessage('Paid date must be a valid date'),
  ],
  validate,
  create
);

router.post('/:id/verify', param('id').isMongoId().withMessage('Invalid payment id'), validate, verifyPlanPayment);
router.post('/:id/reject', param('id').isMongoId().withMessage('Invalid payment id'), validate, rejectPlanPayment);

module.exports = router;