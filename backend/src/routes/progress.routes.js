const { Router } = require('express');
const progressController = require('../controllers/progress.controller');

const router = Router();

router.get('/', progressController.get);

module.exports = router;
