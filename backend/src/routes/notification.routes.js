const { Router } = require('express');
const notificationController = require('../controllers/notification.controller');
const { validate } = require('../middlewares/validate.middleware');
const {
  listNotificationsSchema,
  notificationIdParamsSchema,
} = require('../validators/dashboard.validator');

const router = Router();

router.get('/', validate(listNotificationsSchema), notificationController.list);
router.patch(
  '/:id/read',
  validate(notificationIdParamsSchema),
  notificationController.markRead
);

module.exports = router;
