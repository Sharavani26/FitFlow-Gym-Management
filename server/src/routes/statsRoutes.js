const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { overview, memberProgress } = require('../controllers/statsController');

router.get('/me', protect, authorize('member'), memberProgress);
router.get('/', protect, authorize('admin'), overview);

module.exports = router;
