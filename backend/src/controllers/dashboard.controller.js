const dashboardService = require('../services/dashboard.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const dashboardController = {
  getOverview: asyncHandler(async (req, res) => {
    const data = await dashboardService.getDashboard(req.user.id);
    return success(res, {
      message: 'Dashboard retrieved',
      data,
    });
  }),
};

module.exports = dashboardController;
