const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { list, create, update } = require('../controllers/trainerController');

const rules = (isCreate) => {
  const field = (name) => (isCreate ? body(name) : body(name).optional());
  return [
    field('name').isString().withMessage('Name is required').bail()
      .trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2 to 100 characters'),
    field('email').isString().withMessage('Email is required').bail()
      .trim().isEmail().withMessage('A valid email is required').bail()
      .isLength({ max: 254 }).withMessage('Email is too long'),
    body('phone').optional({ values: 'falsy' }).isString().bail()
      .trim().matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Phone must be 7 to 20 digits (spaces, +, -, ( ) allowed)'),
    field('specialization').isString().withMessage('Specialization is required').bail()
      .trim().isLength({ min: 2, max: 60 }).withMessage('Specialization must be 2 to 60 characters'),
    body('isActive').optional().isBoolean().withMessage('isActive must be true or false').toBoolean(),
  ];
};

router.use(protect, authorize('admin'));

router.get('/', list);
router.post('/', rules(true), validate, create);
router.put('/:id', param('id').isMongoId().withMessage('Invalid trainer id'), rules(false), validate, update);

module.exports = router;