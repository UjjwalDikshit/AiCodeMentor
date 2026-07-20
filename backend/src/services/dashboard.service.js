/**
 * Dashboard aggregate service — composes progress, goals, activity, achievements.
 */
const progressService = require('./progress.service');
const goalService = require('./goal.service');
const activityService = require('./activity.service');
const achievementService = require('./achievement.service');
const { getRank, xpToNextLevel } = require('../utils/level');

async function getDashboard(userId) {
  const [progress, todayGoals, activityResult, achievementResult] = await Promise.all([
    progressService.getProgress(userId),
    goalService.ensureToday(userId).then((doc) => goalService.serializeDailyGoal(doc)),
    activityService.listActivities(userId, { page: 1, limit: 10 }),
    achievementService.listAchievements(userId),
  ]);

  // Ensure first-login achievement is evaluated
  await achievementService.evaluateAndUnlock(userId, progress);

  const refreshedAchievements = await achievementService.listAchievements(userId);

  return {
    streak: {
      current: progress.currentStreak,
      longest: progress.longestStreak,
      lastActiveDate: progress.lastActiveDate,
    },
    xp: {
      current: progress.currentXP,
      level: progress.currentLevel,
      rank: getRank(progress.currentLevel),
      xpToNext: xpToNextLevel(progress.currentXP),
    },
    todaysGoals: todayGoals,
    statistics: {
      totalSolved: progress.totalSolved,
      easySolved: progress.easySolved,
      mediumSolved: progress.mediumSolved,
      hardSolved: progress.hardSolved,
      codingScore: progress.codingScore,
      interviewScore: progress.interviewScore,
      resumeScore: progress.resumeScore,
      githubScore: progress.githubScore,
    },
    recentActivity: activityResult.activities,
    achievements: refreshedAchievements.achievements.slice(0, 5),
    weakTopics: progress.weakTopics,
    strongTopics: progress.strongTopics,
  };
}

module.exports = { getDashboard };
