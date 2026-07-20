const analyticsService = require('../services/analytics.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const analyticsController = {
  get: asyncHandler(async (req, res) => {
    const data = await analyticsService.getAnalytics(req.user.id);
    return success(res, {
      message: 'Analytics retrieved',
      data,
    });
  }),
};

module.exports = analyticsController;
