const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Review = sequelize.define('Review', {
  comment: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  reviewed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'reviews',
  timestamps: false,
});

module.exports = Review;