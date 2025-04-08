const express = require('express');
const { authenticate, authorizeRole } = require('../middlewares/authMiddleware');
const {
  getTotalContributionsPerFaculty,
  getPercentageContributionsPerFaculty,
  getTotalStudentContributorsPerFaculty,
  getFacultyContributions,
  getExceptionReport,
} = require('../controllers/reportController');

const router = express.Router();

// Admin Reports
router.get('/admin/reports/total-contributions-per-faculty', authenticate, authorizeRole(['admin']), getTotalContributionsPerFaculty);
router.get('/admin/reports/percentage-contributions-per-faculty', authenticate, authorizeRole(['admin']), getPercentageContributionsPerFaculty);
router.get('/admin/reports/total-student-contributors-per-faculty', authenticate, authorizeRole(['admin']), getTotalStudentContributorsPerFaculty);

// Faculty Coordinator Reports
router.get('/faculty/reports/contributions', authenticate, authorizeRole(['faculty_coordinator']), getFacultyContributions);
router.get('/faculty/reports/exceptions', authenticate, authorizeRole(['faculty_coordinator']), getExceptionReport);

module.exports = router;