const express = require('express');
const ctrl = require('../controllers/goals.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

// all routes require auth
router.use(auth);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;