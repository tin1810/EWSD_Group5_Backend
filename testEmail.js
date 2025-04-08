require('dotenv').config();
const nodemailer = require('nodemailer');

// Log environment variables for debugging
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // smtp.mailtrap.io
  port: process.env.EMAIL_PORT, // 2525
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test the connection to the SMTP server
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error.message);
  } else {
    console.log('SMTP connection successful:', success);
  }
});

// Email options
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: 'zawmh@gmail.com', // Replace with a valid email address
  subject: 'Test Email',
  text: 'This is a test email sent from the API.',
};

// Send email
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Error sending email:', error.message);
  } else {
    console.log('Email sent:', info.response);
  }
});