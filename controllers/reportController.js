const Contribution = require('../models/contributionModel');
const User = require('../models/userModel');

// Admin Reports
exports.getTotalContributionsPerFaculty = async (req, res) => {
  const stats = await Contribution.findAll({
    attributes: ['faculty_id', [Sequelize.fn('COUNT', Sequelize.col('contribution_id')), 'total']],
    group: ['faculty_id'],
  });

  res.json(stats);
};

exports.getPercentageContributionsPerFaculty = async (req, res) => {
  const totalContributions = await Contribution.count();

  const stats = await Contribution.findAll({
    attributes: [
      'faculty_id',
      [Sequelize.literal('COUNT(*) * 100.0 / :total'), 'percentage'],
    ],
    replacements: { total: totalContributions },
    group: ['faculty_id'],
  });

  res.json(stats);
};

exports.getTotalStudentContributorsPerFaculty = async (req, res) => {
  const stats = await Contribution.findAll({
    attributes: ['faculty_id', [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('user_id'))), 'unique_contributors']],
    group: ['faculty_id'],
  });

  res.json(stats);
};

// Faculty Coordinator Reports
exports.getFacultyContributions = async (req, res) => {
  const contributions = await Contribution.findAll({
    where: { faculty_id: req.user.faculty_id },
  });

  res.json(contributions);
};

exports.getExceptionReport = async (req, res) => {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const exceptions = await Contribution.findAll({
    where: {
      faculty_id: req.user.faculty_id,
      status: 'submitted',
      submitted_at: { [Op.lt]: twoWeeksAgo },
    },
    include: [{ model: Review, required: false }],
  }).filter((c) => !c.Reviews.length);

  res.json(exceptions);
};