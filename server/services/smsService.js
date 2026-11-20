const axios = require('axios');
const NotificationLog = require('../models/NotificationLog');

async function sendSms({ appointmentId, to, message, type = 'confirmation' }) {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  const senderName = process.env.SEMAPHORE_SENDER_NAME || 'CityClinic';

  if (!apiKey) {
    await NotificationLog.create({
      appointmentId,
      recipient: to,
      type,
      channel: 'sms',
      status: 'sent',
      providerMessageId: 'sandbox-sms-local',
      errorMessage: ''
    });
    return { ok: true, mode: 'sandbox' };
  }

  try {
    const response = await axios.post(
      'https://api.semaphore.co/api/v4/messages',
      {
        apikey: apiKey,
        number: to,
        message,
        sendername: senderName
      },
      { timeout: 8000 }
    );

    const providerId = Array.isArray(response.data)
      ? String(response.data[0]?.message_id || '')
      : String(response.data?.message_id || '');

    await NotificationLog.create({
      appointmentId,
      recipient: to,
      type,
      channel: 'sms',
      status: 'sent',
      providerMessageId: providerId
    });
    return { ok: true, mode: 'semaphore', providerId };
  } catch (err) {
    await NotificationLog.create({
      appointmentId,
      recipient: to,
      type,
      channel: 'sms',
      status: 'failed',
      errorMessage: err.message || 'SMS gateway error'
    });
    return { ok: false, error: err.message };
  }
}

module.exports = { sendSms };
