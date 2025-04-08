require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sequelize = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const contributionRoutes = require('./routes/contributionRoutes');

const app = express();
app.use(express.json());

// Multer for file uploads
const upload = multer({ dest: process.env.UPLOAD_DIR });

// Routes
app.use('/auth', authRoutes);
app.use('/contributions', contributionRoutes);

// Start Server
const PORT = process.env.PORT || 3000;
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});