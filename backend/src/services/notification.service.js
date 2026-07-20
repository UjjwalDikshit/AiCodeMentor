/**
 * Notification helpers — backend preparation.
 */
const Notification = require('../models/Notification.model');
const { AppError } = require('../utils/AppError');

async function listNotifications(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const filter = { userId };

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    notifications: items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    },
  };
}

async function markAsRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  return notification;
}

async function createNotification({ userId, title, message, type = 'info' }) {
  return Notification.create({ userId, title, message, type });
}

module.exports = {
  listNotifications,
  markAsRead,
  createNotification,
};
