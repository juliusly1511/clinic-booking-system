const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { sendSms } = require('./smsService');
const { sendEmail } = require('./emailService');

async function dispatchAppointmentNotice(appointment, type) {
  const patient = appointment.patientId;
  const doctorUser = appointment.doctorId?.userId;
  if (!patient) return;

  const docName = doctorUser?.name || 'your physician';
  const labelMap = {
    confirmation: 'Appointment Confirmed',
    reminder_24h: '24-Hour Appointment Reminder',
    reminder_2h: '2-Hour Appointment Reminder',
    cancellation: 'Appointment Cancelled',
    reschedule: 'Appointment Rescheduled'
  };
  const title = labelMap[type] || 'Clinic Notification';
  const message = `${title}: City Health Clinic with ${docName} on ${appointment.date} at ${appointment.timeSlot} PHT.`;

  await Promise.allSettled([
    sendSms({ appointmentId: appointment._id, to: patient.phone, message, type }),
    sendEmail({
      appointmentId: appointment._id,
      to: patient.email,
      subject: `City Health Clinic — ${title}`,
      text: message,
      html: `<p>Hello <strong>${patient.name}</strong>,</p><p>${message}</p><p>Thank you,<br/>City Health Clinic</p>`,
      type
    })
  ]);
}

async function runReminderSweep(now = new Date()) {
  const h24Start = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const h24End = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);
  const h2Start = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
  const h2End = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

  const due24h = await Appointment.find({
    status: 'confirmed',
    reminder24hSent: false,
    startsAt: { $gte: h24Start, $lte: h24End }
  })
    .populate('patientId', 'name email phone')
    .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });

  for (const appt of due24h) {
    await dispatchAppointmentNotice(appt, 'reminder_24h');
    appt.reminder24hSent = true;
    await appt.save();
  }

  const due2h = await Appointment.find({
    status: 'confirmed',
    reminder2hSent: false,
    startsAt: { $gte: h2Start, $lte: h2End }
  })
    .populate('patientId', 'name email phone')
    .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } });

  for (const appt of due2h) {
    await dispatchAppointmentNotice(appt, 'reminder_2h');
    appt.reminder2hSent = true;
    await appt.save();
  }

  return { sent24h: due24h.length, sent2h: due2h.length };
}

function startReminderCron() {
  return cron.schedule('*/15 * * * *', async () => {
    try {
      await runReminderSweep();
    } catch (err) {
      console.error('Reminder cron error:', err.message);
    }
  });
}

module.exports = {
  dispatchAppointmentNotice,
  runReminderSweep,
  startReminderCron
};
