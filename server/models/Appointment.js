const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD']
    },
    timeSlot: {
      type: String,
      required: true,
      match: [/^\d{2}:\d{2}$/, 'timeSlot must be HH:mm']
    },
    startsAt: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
      default: 'confirmed'
    },
    reason: {
      type: String,
      required: [true, 'Reason for visit is required'],
      trim: true,
      maxlength: 500
    },
    notes: {
      type: String,
      default: '',
      maxlength: 2000
    },
    isWalkIn: {
      type: Boolean,
      default: false
    },
    reminder24hSent: {
      type: Boolean,
      default: false
    },
    reminder2hSent: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

// Atomic double-booking prevention: only one active booking per doctor/date/slot
appointmentSchema.index(
  { doctorId: 1, date: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['confirmed', 'checked_in'] } }
  }
);

appointmentSchema.index({ patientId: 1, startsAt: -1 });
appointmentSchema.index({ status: 1, startsAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
