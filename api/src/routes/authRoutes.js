const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { authenticate, ensureUserExists } = require('../middleware/auth');

const router = express.Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, ensureUserExists, me);
module.exports = router;
