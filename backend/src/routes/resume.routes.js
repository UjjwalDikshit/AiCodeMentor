const { Router } = require('express');
const resumeController = require('../controllers/resume.controller');

const router = Router();

router.get('/', resumeController.list);
router.post('/upload', resumeController.upload);

module.exports = router;
