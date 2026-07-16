const { comingSoon } = require('../utils/response');
const { asyncHandler } = require('../utils/asyncHandler');
const placeholderService = require('../services/placeholder.service');

const chatController = {
  list: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('chat');
    return comingSoon(res, 'chat');
  }),
  send: asyncHandler(async (_req, res) => {
    await placeholderService.getComingSoon('chat.send');
    return comingSoon(res, 'chat');
  }),
};

module.exports = chatController;
