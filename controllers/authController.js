const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

exports.register = async (req, res) => {
  const { email, password, role, full_name } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    password_hash: hashedPassword,
    role,
    full_name,
  });

  res.status(201).json({ message: 'User registered successfully' });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET);

  res.json({ token });
};