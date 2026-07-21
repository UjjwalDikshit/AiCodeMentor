/**
 * API route aggregator — mount domain routers under /api/v1.
 */
const { Router } = require('express');
const { apiLimiter, authLimiter } = require('../middlewares/rateLimit.middleware');
const { authenticateUser } = require('../middlewares/auth.middleware');

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const dashboardRoutes = require('./dashboard.routes');
const interviewRoutes = require('./interview.routes');
const resumeRoutes = require('./resume.routes');
const codeIntelRoutes = require('./codeIntel.routes');
const githubRoutes = require('./github.routes');
const chatRoutes = require('./chat.routes');
const conversationRoutes = require('./conversation.routes');
const plannerRoutes = require('./planner.routes');
const progressRoutes = require('./progress.routes');
const goalRoutes = require('./goal.routes');
const activityRoutes = require('./activity.routes');
const achievementRoutes = require('./achievement.routes');
const notificationRoutes = require('./notification.routes');
const analyticsRoutes = require('./analytics.routes');

const router = Router();

router.use('/auth', authLimiter, authRoutes);

router.use(apiLimiter);
router.use(authenticateUser);

router.use('/user', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/progress', progressRoutes);
router.use('/goals', goalRoutes);
router.use('/activity', activityRoutes);
router.use('/achievements', achievementRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/interview', interviewRoutes);
router.use('/resume', resumeRoutes);
router.use('/code-intel', codeIntelRoutes);
router.use('/code-review', codeIntelRoutes);
router.use('/github', githubRoutes);
router.use('/chat', chatRoutes);
router.use('/conversations', conversationRoutes);
router.use('/planner', plannerRoutes);

module.exports = router;
