const authService = require('./auth.service');
const userService = require('./user.service');
const tokenService = require('./token.service');
const dashboardService = require('./dashboard.service');
const progressService = require('./progress.service');
const goalService = require('./goal.service');
const activityService = require('./activity.service');
const achievementService = require('./achievement.service');
const notificationService = require('./notification.service');
const analyticsService = require('./analytics.service');
const auditService = require('./audit.service');
const placeholderService = require('./placeholder.service');
const aiClient = require('./aiClient.service');

module.exports = {
  authService,
  userService,
  tokenService,
  dashboardService,
  progressService,
  goalService,
  activityService,
  achievementService,
  notificationService,
  analyticsService,
  auditService,
  placeholderService,
  aiClient,
};
