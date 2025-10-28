const express = require('express');
const ctrl = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/verify', ctrl.verify);
router.post('/resend-verification', ctrl.resendVerification);
router.get('/me', auth, ctrl.me);

module.exports = router;