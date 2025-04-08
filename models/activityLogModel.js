const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ActivityLog = sequelize.define('ActivityLog', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  details: {
    type: DataTypes.TEXT,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'activity_logs',
  timestamps: false,
});

module.exports = ActivityLog;