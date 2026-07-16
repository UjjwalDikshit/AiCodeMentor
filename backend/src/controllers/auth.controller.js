/**
 * Controllers: HTTP adapters only — delegate to services.
 */
const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const authController = {
  login: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('auth.login');
    return comingSoon(res, 'auth');
  }),
  register: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('auth.register');
    return comingSoon(res, 'auth');
  }),
  logout: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('auth.logout');
    return comingSoon(res, 'auth');
  }),
  refresh: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('auth.refresh');
    return comingSoon(res, 'auth');
  }),
};

module.exports = authController;
