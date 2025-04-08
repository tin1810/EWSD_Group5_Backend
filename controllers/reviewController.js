const Review = require('../models/reviewModel');

exports.addReview = async (req, res) => {
  const { contribution_id, comment } = req.body;

  const review = await Review.create({
    contribution_id,
    reviewer_id: req.user.userId,
    comment,
  });

  res.status(201).json(review);
};

exports.getReviewsForContribution = async (req, res) => {
  const { contribution_id } = req.params;

  const reviews = await Review.findAll({ where: { contribution_id } });
  res.json(reviews);
};