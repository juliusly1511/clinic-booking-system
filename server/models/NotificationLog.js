const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true
    },
    recipient: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['confirmation', 'reminder_24h', 'reminder_2h', 'cancellation', 'reschedule'],
      required: true
    },
    channel: {
      type: String,
      enum: ['sms', 'email'],
      required: true
    },
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true
    },
    providerMessageId: {
      type: String,
      default: ''
    },
    errorMessage: {
      type: String,
      default: ''
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

notificationLogSchema.index({ appointmentId: 1, type: 1, channel: 1 });
notificationLogSchema.index({ sentAt: -1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
