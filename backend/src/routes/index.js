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
const githubRoutes = require('./github.routes');
const chatRoutes = require('./chat.routes');
const plannerRoutes = require('./planner.routes');
const progressRoutes = require('./progress.routes');

const router = Router();

router.use('/auth', authLimiter, authRoutes);

router.use(apiLimiter);
router.use(authenticateUser);

router.use('/user', userRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/interview', interviewRoutes);
router.use('/resume', resumeRoutes);
router.use('/github', githubRoutes);
router.use('/chat', chatRoutes);
router.use('/planner', plannerRoutes);
router.use('/progress', progressRoutes);

module.exports = router;
