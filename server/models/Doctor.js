const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    specialty: {
      type: String,
      required: [true, 'Medical specialty is required'],
      trim: true
    },
    bio: {
      type: String,
      default: '',
      maxlength: 600
    },
    roomNumber: {
      type: String,
      default: 'Room 101',
      trim: true
    },
    slotDuration: {
      type: Number,
      enum: [15, 20, 30],
      default: 30
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
      validate: {
        validator: (days) => Array.isArray(days) && days.every((d) => d >= 0 && d <= 6),
        message: 'Working days must be integers between 0 (Sun) and 6 (Sat)'
      }
    },
    startTime: {
      type: String,
      default: '09:00',
      match: [/^\d{2}:\d{2}$/, 'startTime must be HH:mm']
    },
    endTime: {
      type: String,
      default: '17:00',
      match: [/^\d{2}:\d{2}$/, 'endTime must be HH:mm']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

doctorSchema.index({ specialty: 1, isActive: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
