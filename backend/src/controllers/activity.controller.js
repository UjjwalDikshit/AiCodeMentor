const activityService = require('../services/activity.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const activityController = {
  list: asyncHandler(async (req, res) => {
    const result = await activityService.listActivities(req.user.id, req.query);
    return success(res, {
      message: 'Activities retrieved',
      data: { activities: result.activities },
      meta: result.meta,
    });
  }),
};

module.exports = activityController;
