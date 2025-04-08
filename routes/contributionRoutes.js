const express = require('express');
const { authenticate, authorizeRole } = require('../middlewares/authMiddleware');
const { submitContribution, getContributions } = require('../controllers/contributionController');

const router = express.Router();

router.post('/submit', authenticate, authorizeRole(['student']), submitContribution);
router.get('/', authenticate, authorizeRole(['student']), getContributions);

module.exports = router;