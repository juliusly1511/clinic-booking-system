const express = require('express');
const protect = require('../middleware/auth');
const authorize = require('../middleware/roles');
const {
  listUsers,
  createUser,
  toggleUserActive,
  updateDoctorSchedule,
  listBlockedDates,
  addBlockedDate,
  removeBlockedDate
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect);

router.get('/users', authorize('admin', 'staff'), listUsers);
router.post('/users', authorize('admin'), createUser);
router.patch('/users/:id/toggle', authorize('admin'), toggleUserActive);
router.patch('/doctors/:id/schedule', authorize('admin'), updateDoctorSchedule);

router.get('/blocked-dates', authorize('admin', 'doctor', 'staff'), listBlockedDates);
router.post('/blocked-dates', authorize('admin', 'doctor'), addBlockedDate);
router.delete('/blocked-dates/:id', authorize('admin', 'doctor'), removeBlockedDate);

module.exports = router;
