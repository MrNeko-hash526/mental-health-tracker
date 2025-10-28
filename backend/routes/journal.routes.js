const express = require('express');
const ctrl = require('../controllers/journal.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// All journal endpoints require authentication
router.get('/entries', auth, ctrl.listEntries);
router.post('/entries', auth, ctrl.createEntry);
router.get('/entries/:id', auth, ctrl.getEntry);
router.put('/entries/:id', auth, ctrl.updateEntry);
router.delete('/entries/:id', auth, ctrl.deleteEntry);
router.post('/entries/:id/summarize', auth, ctrl.generateSummary);

module.exports = router;