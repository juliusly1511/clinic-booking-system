const Appointment = require('../models/Appointment');
const NotificationLog = require('../models/NotificationLog');

async function getSummaryReport(req, res) {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = from;
      if (to) match.date.$lte = to;
    }

    const appointments = await Appointment.find(match).populate({
      path: 'doctorId',
      populate: { path: 'userId', select: 'name' }
    });

    const total = appointments.length;
    const counts = {
      confirmed: 0,
      checked_in: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      walkIns: 0
    };
    const byDoctorMap = new Map();

    for (const appt of appointments) {
      if (counts[appt.status] !== undefined) counts[appt.status] += 1;
      if (appt.isWalkIn) counts.walkIns += 1;

      const docKey = String(appt.doctorId?._id || 'unknown');
      const docName = appt.doctorId?.userId?.name || 'Unknown Physician';
      const specialty = appt.doctorId?.specialty || 'General';
      if (!byDoctorMap.has(docKey)) {
        byDoctorMap.set(docKey, { doctorId: docKey, name: docName, specialty, total: 0, completed: 0, noShow: 0 });
      }
      const entry = byDoctorMap.get(docKey);
      entry.total += 1;
      if (appt.status === 'completed') entry.completed += 1;
      if (appt.status === 'no_show') entry.noShow += 1;
    }

    const completionRate = total ? Number(((counts.completed / total) * 100).toFixed(1)) : 0;
    const noShowRate = total ? Number(((counts.no_show / total) * 100).toFixed(1)) : 0;

    return res.json({
      summary: {
        total,
        ...counts,
        completionRate,
        noShowRate
      },
      byDoctor: Array.from(byDoctorMap.values())
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to generate report' });
  }
}

async function getNotificationLogs(req, res) {
  try {
    const logs = await NotificationLog.find().sort({ sentAt: -1 }).limit(100);
    return res.json({ logs });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Failed to fetch notification logs' });
  }
}

module.exports = {
  getSummaryReport,
  getNotificationLogs
};
