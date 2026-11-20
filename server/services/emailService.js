const nodemailer = require('nodemailer');
const NotificationLog = require('../models/NotificationLog');

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function sendEmail({ appointmentId, to, subject, html, text, type = 'confirmation' }) {
  const transporter = createTransporter();

  if (!transporter) {
    await NotificationLog.create({
      appointmentId,
      recipient: to,
      type,
      channel: 'email',
      status: 'sent',
      providerMessageId: 'sandbox-email-local'
    });
    return { ok: true, mode: 'sandbox' };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html
    });

    await NotificationLog.create({
      appointmentId,
      recipient: to,
      type,
      channel: 'email',
      status: 'sent',
      providerMessageId: info.messageId || ''
    });
    return { ok: true, mode: 'smtp', messageId: info.messageId };
  } catch (err) {
    await NotificationLog.create({
      appointmentId,
      recipient: to,
      type,
      channel: 'email',
      status: 'failed',
      errorMessage: err.message || 'SMTP delivery failed'
    });
    return { ok: false, error: err.message };
  }
}

module.exports = { sendEmail };
