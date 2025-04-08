const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  full_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password_hash: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('student', 'faculty_coordinator', 'admin', 'marketing_manager', 'guest'),
    defaultValue: 'student',
  },
  last_login: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;