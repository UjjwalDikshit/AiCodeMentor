/**
 * Progress — single source of truth for streak, XP, scores, topics.
 * Does not duplicate user profile fields.
 */
const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalSolved: { type: Number, default: 0, min: 0 },
    easySolved: { type: Number, default: 0, min: 0 },
    mediumSolved: { type: Number, default: 0, min: 0 },
    hardSolved: { type: Number, default: 0, min: 0 },
    codingScore: { type: Number, default: 0, min: 0, max: 100 },
    interviewScore: { type: Number, default: 0, min: 0, max: 100 },
    resumeScore: { type: Number, default: 0, min: 0, max: 100 },
    githubScore: { type: Number, default: 0, min: 0, max: 100 },
    currentXP: { type: Number, default: 0, min: 0 },
    currentLevel: { type: Number, default: 1, min: 1 },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastActiveDate: { type: Date, default: null, index: true },
    weakTopics: { type: [String], default: [] },
    strongTopics: { type: [String], default: [] },
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, lastActiveDate: -1 });
progressSchema.index({ currentXP: -1 });

module.exports = mongoose.model('Progress', progressSchema);
