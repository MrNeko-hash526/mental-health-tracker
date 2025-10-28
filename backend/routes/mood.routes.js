const express = require('express');
const ctrl = require('../controllers/mood.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// All mood endpoints require authentication
router.get('/entries', auth, ctrl.listEntries);
router.post('/entries', auth, ctrl.createEntry);
router.get('/entries/:id', auth, ctrl.getEntry);
router.put('/entries/:id', auth, ctrl.updateEntry);
router.delete('/entries/:id', auth, ctrl.deleteEntry);

module.exports = router;