// index.js

require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');


const { Pool } = require('pg');
const fs = require('fs');
const archiver = require('archiver');
const moment = require('moment');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Upload config
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// DB Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
});

// Email setup
const mailer = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  }
});



const sendEmail = async (to, subject, html) => {
  await mailer.sendMail({
    from: 'UMCS <no-reply@umcs.local>',
    to,
    subject,
    html
  });
};

// Utils
const authMiddleware = (roles = []) => (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    if (roles.length && !roles.includes(user.role)) return res.sendStatus(403);
    next();
  });
};

const getUserRole = async (userId) => {
  const { rows } = await pool.query('SELECT r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = $1', [userId]);
  return rows[0]?.role_name;
};

// Auth Routes
app.post('/register', async (req, res) => {
  const { email, password, full_name, role_id, faculty_id } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query('INSERT INTO users (email, password_hash, full_name, role_id, faculty_id) VALUES ($1,$2,$3,$4,$5) RETURNING *', [email, hash, full_name, role_id, faculty_id]);
  res.json(result.rows[0]);
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.sendStatus(401);
  await pool.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);
  const role = await getUserRole(user.user_id);
  const token = jwt.sign({ id: user.user_id, role }, process.env.JWT_SECRET);
  res.json({ token, last_login: user.last_login });
});

// Student: Submit & Update
app.post('/contributions', authMiddleware(['Student']), upload.fields([{ name: 'document' }, { name: 'image' }]), async (req, res) => {
  const userId = req.user.id;
  const { title, description } = req.body;
  const docUrl = req.files.document?.[0]?.path;
  const imgUrl = req.files.image?.[0]?.path;
  const { rows } = await pool.query('INSERT INTO contributions (user_id, faculty_id, title, description, document_url, image_url) SELECT $1, faculty_id, $2, $3, $4, $5 FROM users WHERE user_id = $1 RETURNING *', [userId, title, description, docUrl, imgUrl]);
  const contribution = rows[0];
  const { rows: userRows } = await pool.query('SELECT full_name, email FROM users WHERE user_id = $1', [userId]);
  const user = userRows[0];

  // Notify Student
  await sendEmail(user.email, '🎉 Contribution Submitted', `<h3>Hello ${user.full_name},</h3><p>Your contribution titled <strong>"${title}"</strong> has been successfully submitted.</p><p>Thanks,<br>UMCS Team</p>`);

  // Notify Coordinators of same faculty
  const { rows: coordinators } = await pool.query(`
    SELECT u.email, u.full_name FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE r.role_name = 'Faculty Marketing Coordinator' AND u.faculty_id = $1
  `, [contribution.faculty_id]);

  for (const coord of coordinators) {
    await sendEmail(
      coord.email,
      '📥 New Contribution Submitted',
      `<h3>New Contribution Submitted</h3>
       <p>A new contribution titled <strong>"${title}"</strong> has been submitted by <strong>${user.full_name}</strong>.</p>
       <p>Please log in to review it.</p>`
    );
  }

  res.json(contribution);
});

app.put('/contributions/:id', authMiddleware(['Student']), upload.fields([{ name: 'document' }, { name: 'image' }]), async (req, res) => {
  const userId = req.user.id;
  const { title, description } = req.body;
  const docUrl = req.files.document?.[0]?.path;
  const imgUrl = req.files.image?.[0]?.path;
  const result = await pool.query('UPDATE contributions SET title=$1, description=$2, document_url=COALESCE($3, document_url), image_url=COALESCE($4, image_url) WHERE contribution_id=$5 AND user_id=$6 RETURNING *', [title, description, docUrl, imgUrl, req.params.id, userId]);
  res.json(result.rows[0]);
});

// Coordinator: Comment & Select
app.post('/reviews/:contributionId', authMiddleware(['Faculty Marketing Coordinator']), async (req, res) => {
  const { comment } = req.body;
  const reviewerId = req.user.id;
  const { contributionId } = req.params;
  const result = await pool.query('INSERT INTO reviews (contribution_id, reviewer_id, comment) VALUES ($1,$2,$3) RETURNING *', [contributionId, reviewerId, comment]);
  res.json(result.rows[0]);
});

app.post('/select/:contributionId', authMiddleware(['Faculty Marketing Coordinator']), async (req, res) => {
  const { contributionId } = req.params;
  await pool.query('UPDATE contributions SET is_selected = TRUE, selected_by = $1, selected_at = NOW() WHERE contribution_id = $2', [req.user.id, contributionId]);
  res.sendStatus(200);
});

// Manager: Download ZIP + Reports
app.get('/download-selected', authMiddleware(['University Marketing Manager']), async (req, res) => {
  const { rows: config } = await pool.query('SELECT MAX(final_deadline) AS deadline FROM system_config');
  if (new Date() < new Date(config[0].deadline)) return res.status(403).send('Download not allowed yet');
  const { rows } = await pool.query('SELECT document_url FROM contributions WHERE is_selected = TRUE');
  const archive = archiver('zip');
  res.attachment('selected_contributions.zip');
  archive.pipe(res);
  rows.forEach(f => {
    if (f.document_url && fs.existsSync(f.document_url)) archive.file(f.document_url, { name: f.document_url.split('/').pop() });
  });
  archive.finalize();
});

app.get('/report', authMiddleware(['University Marketing Manager']), async (req, res) => {
  const result = await pool.query('SELECT f.faculty_name, COUNT(c.contribution_id) AS total_contributions FROM faculties f LEFT JOIN contributions c ON c.faculty_id = f.faculty_id GROUP BY f.faculty_name');
  res.json(result.rows);
});

// Admin: System config, manage users
app.post('/config', authMiddleware(['Admin']), async (req, res) => {
  const { faculty_id, submission_deadline, final_deadline } = req.body;
  const result = await pool.query('INSERT INTO system_config (faculty_id, submission_deadline, final_deadline) VALUES ($1,$2,$3) RETURNING *', [faculty_id, submission_deadline, final_deadline]);
  res.json(result.rows[0]);
});

app.get('/users', authMiddleware(['Admin']), async (req, res) => {
  const { rows } = await pool.query('SELECT user_id, full_name, email FROM users');
  res.json(rows);
});

// Guest: View public articles
app.get('/public-articles', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM contributions WHERE is_selected = TRUE');
  res.json(rows);
});

app.get('/public-articles/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM contributions WHERE contribution_id = $1 AND is_selected = TRUE', [req.params.id]);
  res.json(rows[0]);
});

// Logs
app.post('/log', authMiddleware(), async (req, res) => {
  const { page_visited, browser_info } = req.body;
  await pool.query('INSERT INTO activity_logs (user_id, page_visited, browser_info) VALUES ($1,$2,$3)', [req.user.id, page_visited, browser_info]);
  res.sendStatus(200);
});

// Guest signup
app.post('/guests', async (req, res) => {
  const { guest_name, email, faculty_id } = req.body;
  const result = await pool.query('INSERT INTO guests (guest_name, email, faculty_id) VALUES ($1,$2,$3) RETURNING *', [guest_name, email, faculty_id]);
  res.json(result.rows[0]);
});

app.listen(port, () => console.log(`UMCS API running on port ${port}`));
