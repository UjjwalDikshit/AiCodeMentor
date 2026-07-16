const { Router } = require('express');
const githubController = require('../controllers/github.controller');

const router = Router();

router.get('/', githubController.status);
router.post('/connect', githubController.connect);

module.exports = router;
