/**
 * User profile HTTP adapters — delegate to user.service.
 */
const userService = require('../services/user.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');

const userController = {
  getProfile: asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user.id);
    return success(res, { message: 'Profile retrieved', data: { user } });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const user = await userService.updateProfile(req.user.id, req.body);
    return success(res, { message: 'Profile updated', data: { user } });
  }),

  updatePassword: asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await userService.updatePassword(req.user.id, {
      currentPassword,
      newPassword,
    });
    return success(res, { message: result.message });
  }),

  uploadAvatar: asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Avatar file is required', 400);
    }
    const user = await userService.updateAvatar(req.user.id, req.file);
    return success(res, { message: 'Avatar updated', data: { user } });
  }),
};

module.exports = userController;
