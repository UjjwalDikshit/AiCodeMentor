const { Router } = require('express');
const analyticsController = require('../controllers/analytics.controller');

const router = Router();

router.get('/', analyticsController.get);

module.exports = router;
