const progressService = require('../services/progress.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const progressController = {
  get: asyncHandler(async (req, res) => {
    const progress = await progressService.getProgress(req.user.id);
    return success(res, {
      message: 'Progress retrieved',
      data: { progress },
    });
  }),

  update: asyncHandler(async (req, res) => {
    const progress = await progressService.updateProgress(req.user.id, req.body, {
      ip: req.ip,
    });
    return success(res, {
      message: 'Progress updated',
      data: { progress },
    });
  }),
};

module.exports = progressController;
