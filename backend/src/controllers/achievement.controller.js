const achievementService = require('../services/achievement.service');
const progressService = require('../services/progress.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const achievementController = {
  list: asyncHandler(async (req, res) => {
    const progress = await progressService.getProgress(req.user.id);
    await achievementService.evaluateAndUnlock(req.user.id, progress);
    const result = await achievementService.listAchievements(req.user.id);
    return success(res, {
      message: 'Achievements retrieved',
      data: result,
    });
  }),
};

module.exports = achievementController;
