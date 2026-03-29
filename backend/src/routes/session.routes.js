const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  createSession,
  joinSession,
  endSession,
  getSession,
  getMySessions,
  getMessages,
} = require('../controllers/session.controller');

router.use(authMiddleware); // All session routes require auth

router.get('/', getMySessions);
router.post('/', createSession);
router.post('/join', joinSession);
router.get('/:id', getSession);
router.patch('/:id/end', endSession);
router.get('/:id/messages', getMessages);

module.exports = router;
