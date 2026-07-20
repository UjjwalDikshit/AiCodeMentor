const notificationService = require('../services/notification.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const notificationController = {
  list: asyncHandler(async (req, res) => {
    const result = await notificationService.listNotifications(req.user.id, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    return success(res, {
      message: 'Notifications retrieved',
      data: { notifications: result.notifications },
      meta: result.meta,
    });
  }),

  markRead: asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(req.user.id, req.params.id);
    return success(res, {
      message: 'Notification marked as read',
      data: { notification },
    });
  }),
};

module.exports = notificationController;
