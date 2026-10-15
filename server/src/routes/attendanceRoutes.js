const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { list, checkIn, checkOut, myList, myCheckIn, myCheckOut } = require('../controllers/attendanceController');

router.use(protect);

router.get('/mine', authorize('member'), myList);
router.post('/mine/check-in', authorize('member'), myCheckIn);
router.patch('/mine/check-out', authorize('member'), myCheckOut);

router.use(authorize('admin'));

router.get(
  '/',
  query('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must look like 2026-10-15'),
  validate,
  list
);
router.post('/check-in', body('userId').isMongoId().withMessage('A valid member is required'), validate, checkIn);
router.patch('/:id/check-out', param('id').isMongoId().withMessage('Invalid record id'), validate, checkOut);

module.exports = router;