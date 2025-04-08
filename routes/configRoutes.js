const express = require('express');
const { authenticate, authorizeRole } = require('../middlewares/authMiddleware');
const { setConfig, getConfig } = require('../controllers/configController');

const router = express.Router();

router.post('/config', authenticate, authorizeRole(['admin']), setConfig);
router.get('/config', authenticate, authorizeRole(['admin']), getConfig);

module.exports = router;