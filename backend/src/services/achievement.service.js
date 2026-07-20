/**
 * Achievement unlock evaluation — automatic based on progress thresholds.
 */
const Achievement = require('../models/Achievement.model');
const {
  ACHIEVEMENT_KEYS,
  ACHIEVEMENT_DEFINITIONS,
} = require('../models/Achievement.model');
const Progress = require('../models/Progress.model');
const { applyXpGain } = require('../utils/level');
const { createActivity } = require('./activity.service');
const { createNotification } = require('./notification.service');

async function listAchievements(userId) {
  const unlocked = await Achievement.find({ userId }).sort({ unlockedAt: -1 }).lean();
  const unlockedKeys = new Set(unlocked.map((a) => a.key));

  const catalog = Object.entries(ACHIEVEMENT_DEFINITIONS).map(([key, def]) => ({
    key,
    ...def,
    unlocked: unlockedKeys.has(key),
    unlockedAt: unlocked.find((a) => a.key === key)?.unlockedAt || null,
  }));

  return { achievements: unlocked, catalog };
}

async function unlock(userId, key) {
  const def = ACHIEVEMENT_DEFINITIONS[key];
  if (!def) return null;

  const existing = await Achievement.findOne({ userId, key });
  if (existing) return null;

  const achievement = await Achievement.create({
    userId,
    key,
    title: def.title,
    description: def.description,
    badge: def.badge,
    xpReward: def.xpReward,
    unlockedAt: new Date(),
  });

  if (def.xpReward > 0) {
    const progress = await Progress.findOne({ userId });
    if (progress) {
      const result = applyXpGain(progress.currentXP, def.xpReward);
      progress.currentXP = result.currentXP;
      progress.currentLevel = result.currentLevel;
      await progress.save();
    }
  }

  await createActivity({
    userId,
    type: 'achievement_unlocked',
    title: `Achievement unlocked: ${def.title}`,
    description: def.description,
    points: def.xpReward,
    metadata: { key, badge: def.badge },
  });

  await createNotification({
    userId,
    title: 'Achievement unlocked',
    message: `You unlocked "${def.title}" (+${def.xpReward} XP)`,
    type: 'achievement',
  });

  return achievement;
}

async function evaluateAndUnlock(userId, progressDoc) {
  const progress = progressDoc || (await Progress.findOne({ userId }));
  if (!progress) return [];

  const unlocked = [];

  const checks = [
    [ACHIEVEMENT_KEYS.FIRST_LOGIN, true],
    [ACHIEVEMENT_KEYS.PROBLEMS_10, progress.totalSolved >= 10],
    [ACHIEVEMENT_KEYS.PROBLEMS_50, progress.totalSolved >= 50],
    [ACHIEVEMENT_KEYS.PROBLEMS_100, progress.totalSolved >= 100],
    [ACHIEVEMENT_KEYS.STREAK_7, progress.currentStreak >= 7],
    [ACHIEVEMENT_KEYS.STREAK_30, progress.currentStreak >= 30],
    [ACHIEVEMENT_KEYS.FIRST_MOCK_INTERVIEW, progress.interviewScore > 0],
    [ACHIEVEMENT_KEYS.RESUME_REVIEWED, progress.resumeScore > 0],
  ];

  for (const [key, condition] of checks) {
    if (condition) {
      const result = await unlock(userId, key);
      if (result) unlocked.push(result);
    }
  }

  return unlocked;
}

module.exports = {
  listAchievements,
  unlock,
  evaluateAndUnlock,
};
