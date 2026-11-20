const express = require('express');
const protect = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { validateBooking } = require('../middleware/validate');
const {
  createAppointment,
  listAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  updateVisitNotes
} = require('../controllers/appointmentController');

const router = express.Router();

router.use(protect);

router.get('/', listAppointments);
router.post('/', authorize('patient', 'staff', 'admin'), validateBooking, createAppointment);
router.get('/:id', getAppointmentById);
router.patch('/:id/cancel', authorize('patient', 'staff', 'admin'), cancelAppointment);
router.patch('/:id/reschedule', authorize('patient', 'staff', 'admin'), rescheduleAppointment);
router.patch('/:id/status', authorize('staff', 'doctor', 'admin'), updateAppointmentStatus);
router.patch('/:id/notes', authorize('doctor', 'admin'), updateVisitNotes);

module.exports = router;
