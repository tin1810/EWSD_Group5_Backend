const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Config = sequelize.define('Config', {
  submission_deadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  final_deadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'configs',
  timestamps: true,
});

module.exports = Config;