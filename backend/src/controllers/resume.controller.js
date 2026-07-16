const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const resumeController = {
  list: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('resume');
    return comingSoon(res, 'resume');
  }),
  upload: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('resume.upload');
    return comingSoon(res, 'resume');
  }),
};

module.exports = resumeController;
