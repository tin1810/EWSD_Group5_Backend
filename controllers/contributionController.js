const multer = require('multer');
const path = require('path');
const Contribution = require('../models/contributionModel');
const Config = require('../models/configModel');
const { sendEmail } = require('../utils/email');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

exports.submitContribution = [
  upload.fields([{ name: 'document', maxCount: 1 }, { name: 'image', maxCount: 1 }]),
  async (req, res) => {
    const { title, description } = req.body;
    const documentFile = req.files['document'] ? req.files['document'][0] : null;
    const imageFile = req.files['image'] ? req.files['image'][0] : null;

    const config = await Config.findOne();
    if (new Date() > config.submission_deadline) {
      return res.status(403).json({ error: 'Submission deadline has passed' });
    }

    const contribution = await Contribution.create({
      title,
      description,
      document_url: documentFile ? documentFile.path : null,
      image_url: imageFile ? imageFile.path : null,
      user_id: req.user.userId,
    });

    // Notify Faculty Coordinator
    const facultyCoordinator = await User.findOne({ where: { role: 'faculty_coordinator' } });
    sendEmail(facultyCoordinator.email, 'New Contribution Submitted', `A new contribution titled "${title}" has been submitted.`);

    res.status(201).json(contribution);
  },
];

exports.getContributions = async (req, res) => {
  const contributions = await Contribution.findAll({ where: { user_id: req.user.userId } });
  res.json(contributions);
};