const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const plannerController = {
  list: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('planner');
    return comingSoon(res, 'planner');
  }),
  create: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('planner.create');
    return comingSoon(res, 'planner');
  }),
};

module.exports = plannerController;
