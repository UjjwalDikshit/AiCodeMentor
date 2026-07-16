const { Router } = require('express');
const plannerController = require('../controllers/planner.controller');

const router = Router();

router.get('/', plannerController.list);
router.post('/', plannerController.create);

module.exports = router;
