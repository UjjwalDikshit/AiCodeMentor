const goalService = require('../services/goal.service');
const { success } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');

const goalController = {
  create: asyncHandler(async (req, res) => {
    const result = await goalService.createGoal(req.user.id, req.body);
    return success(res, {
      message: 'Goal created',
      data: result,
      statusCode: 201,
    });
  }),

  list: asyncHandler(async (req, res) => {
    const result = await goalService.listGoals(req.user.id, req.query);
    return success(res, {
      message: 'Goals retrieved',
      data: result,
    });
  }),

  update: asyncHandler(async (req, res) => {
    const result = await goalService.updateGoalItem(req.user.id, req.params.id, req.body, {
      ip: req.ip,
    });
    return success(res, {
      message: 'Goal updated',
      data: result,
    });
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await goalService.softDeleteGoalItem(req.user.id, req.params.id);
    return success(res, {
      message: 'Goal deleted',
      data: result,
    });
  }),

  restore: asyncHandler(async (req, res) => {
    const result = await goalService.restoreGoalItem(req.user.id, req.params.id);
    return success(res, {
      message: 'Goal restored',
      data: result,
    });
  }),
};

module.exports = goalController;
