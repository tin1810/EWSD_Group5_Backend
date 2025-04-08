const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Contribution = sequelize.define('Contribution', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  document_url: {
    type: DataTypes.TEXT,
  },
  image_url: {
    type: DataTypes.TEXT,
  },
  status: {
    type: DataTypes.ENUM('submitted', 'reviewed', 'selected'),
    defaultValue: 'submitted',
  },
  is_selected: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  submitted_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'contributions',
  timestamps: true,
});

module.exports = Contribution;