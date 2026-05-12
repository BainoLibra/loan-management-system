/**
 * Utility to send emails
 * 
 * In development, if SMTP credentials are not provided, 
 * it will log the email details to the console instead.
 */
const sendEmail = async (options) => {
  // Check if SMTP is configured
  const isSmtpConfigured = process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER;

  if (!isSmtpConfigured) {
    console.log('\n=============================================');
    console.log('DEVELOPMENT MODE: SMTP NOT CONFIGURED');
    console.log('=============================================');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: \n${options.text}`);
    console.log('=============================================\n');
    return; // Skip actual sending
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    error.message = 'SMTP is configured, but nodemailer is not installed. Run npm install in backend.';
    throw error;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || 'Libra Loan Management <noreply@libra.com>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    // html: options.html, // Optional: if you want to send HTML emails
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
