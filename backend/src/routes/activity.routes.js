const { Router } = require('express');
const activityController = require('../controllers/activity.controller');
const { validate } = require('../middlewares/validate.middleware');
const { listActivitySchema } = require('../validators/dashboard.validator');

const router = Router();

router.get('/', validate(listActivitySchema), activityController.list);

module.exports = router;
