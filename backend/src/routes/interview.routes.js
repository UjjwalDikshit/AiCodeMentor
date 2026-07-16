const { Router } = require('express');
const interviewController = require('../controllers/interview.controller');

const router = Router();

router.get('/', interviewController.list);
router.post('/', interviewController.create);

module.exports = router;
