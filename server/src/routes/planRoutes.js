const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { list, create, update } = require('../controllers/planController');

const planRules = (isCreate) => {
  const field = (name) => (isCreate ? body(name) : body(name).optional());
  return [
    field('name')
      .isString().withMessage('Name is required').bail()
      .trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2 to 60 characters'),
    body('description')
      .optional()
      .isString().withMessage('Description must be text').bail()
      .trim().isLength({ max: 300 }).withMessage('Description must be at most 300 characters'),
    field('price')
      .isFloat({ min: 0, max: 1000000 }).withMessage('Price must be a number from 0 to 1000000')
      .toFloat(),
    field('durationDays')
      .isInt({ min: 1, max: 3650 }).withMessage('Duration must be a whole number of days from 1 to 3650')
      .toInt(),
    body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
  ];
};

router.use(protect);

router.get('/', list);
router.post('/', authorize('admin'), planRules(true), validate, create);
router.put(
  '/:id',
  authorize('admin'),
  param('id').isMongoId().withMessage('Invalid plan id'),
  planRules(false),
  validate,
  update
);

module.exports = router;