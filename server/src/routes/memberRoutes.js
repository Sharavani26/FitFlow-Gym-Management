const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { list, assignPlan } = require('../controllers/memberController');

router.use(protect, authorize('admin'));

router.get(
  '/',
  [
    query('search').optional().isString().isLength({ max: 100 }).withMessage('Search is too long'),
    query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid page'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1 to 50'),
  ],
  validate,
  list
);

router.post(
  '/:id/membership',
  [
    param('id').isMongoId().withMessage('Invalid member id'),
    body('planId').isMongoId().withMessage('A valid plan is required'),
    body('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  ],
  validate,
  assignPlan
);

module.exports = router;
