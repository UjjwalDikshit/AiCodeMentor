const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const userController = {
  getMe: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('user.me');
    return comingSoon(res, 'user');
  }),
  updateMe: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('user.update');
    return comingSoon(res, 'user');
  }),
  getById: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('user.getById');
    return comingSoon(res, 'user');
  }),
};

module.exports = userController;
