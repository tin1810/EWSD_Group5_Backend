const express = require('express');
const { authenticate, authorizeRole } = require('../middlewares/authMiddleware');
const { addReview, getReviewsForContribution } = require('../controllers/reviewController');

const router = express.Router();

router.post('/reviews', authenticate, authorizeRole(['faculty_coordinator']), addReview);
router.get('/contributions/:contribution_id/reviews', authenticate, getReviewsForContribution);

module.exports = router;