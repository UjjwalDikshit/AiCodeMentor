const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const interviewController = {
  list: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('interview');
    return comingSoon(res, 'interview');
  }),
  create: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('interview.create');
    return comingSoon(res, 'interview');
  }),
};

module.exports = interviewController;
