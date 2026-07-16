const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const githubController = {
  status: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('github');
    return comingSoon(res, 'github');
  }),
  connect: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('github.connect');
    return comingSoon(res, 'github');
  }),
};

module.exports = githubController;
