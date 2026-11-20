const express = require('express');
const protect = require('../middleware/auth');
const { validateRegister } = require('../middleware/validate');
const { register, login, getMe, forgotPassword } = require('../controllers/authController');

const router = express.Router();

router.post('/register', validateRegister, register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgot-password', forgotPassword);

module.exports = router;
