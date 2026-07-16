const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const dashboardController = {
  getOverview: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('dashboard');
    return comingSoon(res, 'dashboard');
  }),
};

module.exports = dashboardController;
