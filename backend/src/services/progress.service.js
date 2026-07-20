/**
 * Progress service — source of truth for XP, streak, scores, topics.
 */
const Progress = require('../models/Progress.model');
const { calculateLevel, getRank, xpToNextLevel, applyXpGain } = require('../utils/level');
const { createActivity } = require('./activity.service');
const { writeAudit } = require('./audit.service');
const achievementService = require('./achievement.service');

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a, b) {
  const ms = startOfDay(b) - startOfDay(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

async function ensureProgress(userId) {
  let progress = await Progress.findOne({ userId });
  if (!progress) {
    progress = await Progress.create({ userId });
  }
  return progress;
}

function enrichProgress(progress) {
  const doc = progress.toObject ? progress.toObject() : progress;
  return {
    ...doc,
    rank: getRank(doc.currentLevel),
    xpToNext: xpToNextLevel(doc.currentXP),
  };
}

async function getProgress(userId) {
  const progress = await ensureProgress(userId);
  return enrichProgress(progress);
}

async function updateProgress(userId, updates, { ip } = {}) {
  const progress = await ensureProgress(userId);
  const allowed = [
    'totalSolved',
    'easySolved',
    'mediumSolved',
    'hardSolved',
    'codingScore',
    'interviewScore',
    'resumeScore',
    'githubScore',
    'currentXP',
    'weakTopics',
    'strongTopics',
  ];

  const changed = {};
  allowed.forEach((key) => {
    if (updates[key] !== undefined) {
      progress[key] = updates[key];
      changed[key] = updates[key];
    }
  });

  if (updates.currentXP !== undefined) {
    progress.currentLevel = calculateLevel(progress.currentXP);
  }

  // Recalculate totalSolved if difficulty counts provided
  if (
    updates.easySolved !== undefined ||
    updates.mediumSolved !== undefined ||
    updates.hardSolved !== undefined
  ) {
    progress.totalSolved =
      (progress.easySolved || 0) + (progress.mediumSolved || 0) + (progress.hardSolved || 0);
  }

  await touchStreak(progress);
  await progress.save();

  await writeAudit({
    userId,
    action: 'progress_update',
    details: changed,
    ip,
  });

  await createActivity({
    userId,
    type: 'progress_updated',
    title: 'Progress updated',
    description: 'Your progress stats were updated',
    points: 0,
    metadata: changed,
  });

  await achievementService.evaluateAndUnlock(userId, progress);

  return enrichProgress(progress);
}

async function addXp(userId, points, reason = 'XP gained') {
  const progress = await ensureProgress(userId);
  const result = applyXpGain(progress.currentXP, points);
  progress.currentXP = result.currentXP;
  progress.currentLevel = result.currentLevel;
  await touchStreak(progress);
  await progress.save();

  await createActivity({
    userId,
    type: 'xp_gained',
    title: reason,
    description: `+${points} XP`,
    points,
  });

  await achievementService.evaluateAndUnlock(userId, progress);
  return enrichProgress(progress);
}

async function touchStreak(progress) {
  const today = startOfDay();
  const last = progress.lastActiveDate ? startOfDay(progress.lastActiveDate) : null;

  if (!last) {
    progress.currentStreak = 1;
  } else {
    const diff = daysBetween(last, today);
    if (diff === 0) {
      // same day — no change
    } else if (diff === 1) {
      progress.currentStreak += 1;
    } else if (diff > 1) {
      progress.currentStreak = 1;
    }
  }

  progress.longestStreak = Math.max(progress.longestStreak || 0, progress.currentStreak);
  progress.lastActiveDate = today;
}

module.exports = {
  ensureProgress,
  getProgress,
  updateProgress,
  addXp,
  enrichProgress,
  touchStreak,
  startOfDay,
};
