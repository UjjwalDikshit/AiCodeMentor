const { Router } = require('express');
const progressController = require('../controllers/progress.controller');
const { validate } = require('../middlewares/validate.middleware');
const { updateProgressSchema } = require('../validators/dashboard.validator');

const router = Router();

router.get('/', progressController.get);
router.patch('/', validate(updateProgressSchema), progressController.update);

module.exports = router;
