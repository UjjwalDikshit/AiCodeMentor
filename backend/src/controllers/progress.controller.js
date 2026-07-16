const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const progressController = {
  get: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('progress');
    return comingSoon(res, 'progress');
  }),
};

module.exports = progressController;
