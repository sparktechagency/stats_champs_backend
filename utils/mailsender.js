const nodemailer = require('nodemailer');

exports.sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Corrected SMTP host
    port: 587,
    secure: process.env.NODE_ENV === 'production', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Your email user
      pass: process.env.EMAIL_PASS, // Your email password
    },
  });

  await transporter.sendMail({
    from: 'nurmdopu428@gmail.com', // Sender address
    to, // List of receivers
    subject,
    text: '', // Plain text body (empty as you have HTML body)
    html, // HTML body
  });
};
