const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { createProfile, getMe } = require('../controllers/auth.controller');

router.post('/profile', authMiddleware, createProfile);
router.get('/me', authMiddleware, getMe);

module.exports = router;
