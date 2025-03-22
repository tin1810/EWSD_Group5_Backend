const jwt = require('jsonwebtoken');

// Replace with your actual JWT secret from .env
const JWT_SECRET = 'f8a9c3b7d5e4f1a2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2';

// Create a sample payload (e.g., an Admin user)
const payload = {
  id: 1,
  role: 'Admin',
  faculty_id: 1
};

// Generate the token
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
console.log(token);