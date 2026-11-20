const express = require('express');
const { listDoctors, getDoctorById, getAvailableSlots } = require('../controllers/doctorController');

const router = express.Router();

router.get('/', listDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/slots', getAvailableSlots);

module.exports = router;
