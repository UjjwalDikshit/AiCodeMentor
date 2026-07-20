/**
 * Achievement unlocks per user — no duplicated profile fields.
 */
const mongoose = require('mongoose');

const ACHIEVEMENT_KEYS = {
  FIRST_LOGIN: 'FIRST_LOGIN',
  PROBLEMS_10: 'PROBLEMS_10',
  PROBLEMS_50: 'PROBLEMS_50',
  PROBLEMS_100: 'PROBLEMS_100',
  STREAK_7: 'STREAK_7',
  STREAK_30: 'STREAK_30',
  FIRST_MOCK_INTERVIEW: 'FIRST_MOCK_INTERVIEW',
  RESUME_REVIEWED: 'RESUME_REVIEWED',
};

const ACHIEVEMENT_DEFINITIONS = {
  FIRST_LOGIN: {
    title: 'First Login',
    description: 'Signed in to CodeMentor AI for the first time',
    badge: 'welcome',
    xpReward: 50,
  },
  PROBLEMS_10: {
    title: '10 Problems Solved',
    description: 'Solved your first 10 coding problems',
    badge: 'bronze-coder',
    xpReward: 100,
  },
  PROBLEMS_50: {
    title: '50 Problems Solved',
    description: 'Solved 50 coding problems',
    badge: 'silver-coder',
    xpReward: 250,
  },
  PROBLEMS_100: {
    title: '100 Problems Solved',
    description: 'Solved 100 coding problems',
    badge: 'gold-coder',
    xpReward: 500,
  },
  STREAK_7: {
    title: '7 Day Streak',
    description: 'Maintained a 7-day activity streak',
    badge: 'streak-week',
    xpReward: 150,
  },
  STREAK_30: {
    title: '30 Day Streak',
    description: 'Maintained a 30-day activity streak',
    badge: 'streak-month',
    xpReward: 400,
  },
  FIRST_MOCK_INTERVIEW: {
    title: 'First Mock Interview',
    description: 'Completed your first mock interview',
    badge: 'interviewer',
    xpReward: 200,
  },
  RESUME_REVIEWED: {
    title: 'Resume Reviewed',
    description: 'Completed a resume review session',
    badge: 'resume-pro',
    xpReward: 150,
  },
};

const achievementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    key: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    badge: { type: String, required: true },
    xpReward: { type: Number, default: 0, min: 0 },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

achievementSchema.index({ userId: 1, key: 1 }, { unique: true });
achievementSchema.index({ userId: 1, unlockedAt: -1 });

module.exports = mongoose.model('Achievement', achievementSchema);
module.exports.ACHIEVEMENT_KEYS = ACHIEVEMENT_KEYS;
module.exports.ACHIEVEMENT_DEFINITIONS = ACHIEVEMENT_DEFINITIONS;
