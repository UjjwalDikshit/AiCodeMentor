const { Router } = require('express');
const achievementController = require('../controllers/achievement.controller');

const router = Router();

router.get('/', achievementController.list);

module.exports = router;
