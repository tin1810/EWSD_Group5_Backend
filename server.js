const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const archiver = require('archiver');
require('dotenv').config();


const dbUrl = process.env.DB_URL;
const parsedUrl = new URL(dbUrl);

const connection = mysql.createConnection({
  host: parsedUrl.hostname,
  user: parsedUrl.username,
  password: parsedUrl.password,
  database: parsedUrl.pathname.split('/')[1], // This gets the database name from the URL
  port: parsedUrl.port
});

connection.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
    return;
  }
  console.log("✅ Connected to MySQL database!");
});

module.exports = connection;

// end

const app = express();
app.use(express.json());

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
db.connect(err => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1); // Exit if unable to connect to the database
    }
    console.log('MySQL Connected');
});

// Email Configuration
const transporter = nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525, // Use 2525, 465, or 587
    auth: {
        user: process.env.MAILTRAP_USER, // Replace with your Mailtrap username
        pass: process.env.MAILTRAP_PASS // Replace with your Mailtrap password
    }
});
// Middleware for authentication
const authenticate = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided' });
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = decoded;
        next();
    });
};

// Role-based access control middleware
const authorizeRole = (role) => (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
};

// File upload configuration with validation
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

// List of allowed file types for universities
const allowedFileTypes = [
    'application/pdf', // PDF documents
    'application/msword', // Microsoft Word (.doc)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Microsoft Word (.docx)
    'image/jpeg', // JPEG images
    'image/png', // PNG images
    'text/plain' // Plain text files (.txt)
];

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (allowedFileTypes.includes(file.mimetype)) {
            cb(null, true); // Accept the file
        } else {
            cb(new Error('Invalid file type. Allowed types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, JPG, PNG, GIF, MP4, MOV, TXT'));
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // Limit file size to 50MB
    }
});

// User Registration & Management
app.post('/register', (req, res) => {
    const { name, email, password, role, faculty_id } = req.body;

    // Validate password
    if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Password hashing error:', err);
            return res.status(500).json({ error: 'An internal server error occurred' });
        }
        db.query('INSERT INTO users (name, email, password, role, faculty_id) VALUES (?, ?, ?, ?, ?)',
            [name, email, hash, role, faculty_id], (error, result) => {
                if (error) {
                    console.error('Database error:', error);
                    return res.status(500).json({ error: 'An internal server error occurred' });
                }
                res.json({ message: 'User registered successfully' });
            });
    });
});

app.get('/users', authenticate, authorizeRole('Admin'), (req, res) => {
    db.query('SELECT id, name, email, role, faculty_id FROM users', (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'An internal server error occurred' });
        }
        res.json(results);
    });
});

app.delete('/users/:id', authenticate, authorizeRole('Admin'), (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (error, result) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'An internal server error occurred' });
        }
        res.json({ message: 'User deleted successfully' });
    });
});

// Article Submission & Updates
app.post('/articles', authenticate, upload.single('file'), (req, res) => {
    const { title, content } = req.body;
    const filePath = req.file ? req.file.path : null;

    db.query('INSERT INTO articles (title, content, file, user_id, faculty_id) VALUES (?, ?, ?, ?, ?)',
        [title, content, filePath, req.user.id, req.user.faculty_id], (error, result) => {
            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({ error: 'An internal server error occurred' });
            }
            transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: 'faculty@example.com',
                subject: 'New Article Submitted',
                text: `A new article titled "${title}" has been submitted.`
            }, (err, info) => {
                if (err) {
                    console.error('Email sending failed:', err);
                    return res.status(500).json({ error: 'Failed to send notification email' });
                }
                console.log('Email sent:', info.response);
            });
            res.json({ message: 'Article submitted successfully' });
        });
});

app.put('/articles/:id', authenticate, (req, res) => {
    const { title, content } = req.body;
    db.query('UPDATE articles SET title = ?, content = ? WHERE id = ? AND user_id = ?',
        [title, content, req.params.id, req.user.id], (error, result) => {
            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({ error: 'An internal server error occurred' });
            }
            res.json({ message: 'Article updated successfully' });
        });
});

// Generate Reports
app.get('/reports/faculty-contributions', authenticate, authorizeRole('Manager'), (req, res) => {
    db.query('SELECT faculty_id, COUNT(*) as total FROM articles GROUP BY faculty_id', (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'An internal server error occurred' });
        }
        res.json(results);
    });
});

// Download Selected Articles as ZIP
app.get('/articles/download', authenticate, authorizeRole('Manager'), (req, res) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('selected_articles.zip');
    archive.pipe(res);

    db.query('SELECT file FROM articles WHERE status = "approved"', (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'An internal server error occurred' });
        }
        results.forEach(file => {
            if (file.file && fs.existsSync(file.file)) {
                archive.file(file.file, { name: file.file.split('/').pop() });
            } else {
                console.warn(`File not found: ${file.file}`);
            }
        });
        archive.finalize();
    });
});

// Admin - Set Deadlines
app.post('/admin/set-deadline', authenticate, authorizeRole('Admin'), (req, res) => {
    const { submission_deadline, final_deadline } = req.body;
    db.query('UPDATE system_settings SET submission_deadline = ?, final_deadline = ? WHERE id = 1',
        [submission_deadline, final_deadline], (error, result) => {
            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({ error: 'An internal server error occurred' });
            }
            res.json({ message: 'Deadlines updated' });
        });
});

// Start Server
const PORT = process.env.PORT || 5000;
try {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} catch (err) {
    console.error('Failed to start server:', err);
}