const express = require('express');
const ctrl = require('../controllers/meditation.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// Make sessions endpoint require authentication
router.get('/sessions', auth, ctrl.listSessions);  // <- This is the key fix
router.get('/sessions/:id', auth, ctrl.getSession);

// Protected session management
router.post('/sessions', auth, ctrl.createSession);
router.put('/sessions/:id', auth, ctrl.updateSession);
router.delete('/sessions/:id', auth, ctrl.deleteSession);

// Protected runs (history)
router.get('/runs', auth, ctrl.listRuns);
router.post('/runs', auth, ctrl.createRun);
router.get('/runs/:id', auth, ctrl.getRun);
router.put('/runs/:id', auth, ctrl.updateRun);
router.delete('/runs/:id', auth, ctrl.deleteRun);

module.exports = router;