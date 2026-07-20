/**
 * User profile business logic — no HTTP concerns.
 */
const path = require('path');
const fs = require('fs/promises');
const User = require('../models/User.model');
const { AppError } = require('../utils/AppError');
const { hashPassword, comparePassword } = require('../utils/password');
const { toPublicUser } = require('../utils/userSerializer');
const { sanitizeObject } = require('../utils/sanitize');
const { writeAudit } = require('./audit.service');

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return toPublicUser(user);
}

async function updateProfile(userId, { name, currentGoal }, { ip } = {}) {
  const updates = sanitizeObject({ name, currentGoal }, ['name', 'currentGoal']);
  const payload = {};

  // name is profile; currentGoal kept temporarily for backward compatibility only
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.currentGoal !== undefined) payload.currentGoal = updates.currentGoal;

  const user = await User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  await writeAudit({
    userId,
    action: 'profile_update',
    details: payload,
    ip,
  });

  return toPublicUser(user);
}

async function updatePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = await hashPassword(newPassword);
  user.refreshToken = null;
  await user.save();

  return { message: 'Password updated successfully' };
}

async function updateAvatar(userId, file) {
  if (!file) {
    throw new AppError('Avatar file is required', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.avatar) {
    const oldPath = path.join(process.cwd(), user.avatar.replace(/^\//, ''));
    try {
      await fs.unlink(oldPath);
    } catch {
      // ignore missing old file
    }
  }

  const avatarPath = `/uploads/avatars/${file.filename}`;
  user.avatar = avatarPath;
  await user.save();

  return toPublicUser(user);
}

module.exports = {
  getProfile,
  updateProfile,
  updatePassword,
  updateAvatar,
};
