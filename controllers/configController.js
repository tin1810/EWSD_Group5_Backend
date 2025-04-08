const Config = require('../models/configModel');

exports.setConfig = async (req, res) => {
  const { submission_deadline, final_deadline } = req.body;

  const config = await Config.create({
    submission_deadline,
    final_deadline,
  });

  res.status(201).json(config);
};

exports.getConfig = async (req, res) => {
  const config = await Config.findOne();
  if (!config) return res.status(404).json({ error: 'Configuration not found' });

  res.json(config);
};