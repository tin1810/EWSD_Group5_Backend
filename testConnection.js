const { Sequelize } = require('sequelize');

// Load environment variables
require('dotenv').config();

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
  }
);

// Test the connection
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection successful!');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
  }
})();