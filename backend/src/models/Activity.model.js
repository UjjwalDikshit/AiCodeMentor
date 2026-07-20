/**
 * Activity feed entries — gamification + audit trail for user actions.
 */
const mongoose = require('mongoose');

const ACTIVITY_TYPES = [
  'login',
  'problem_solved',
  'goal_completed',
  'goal_created',
  'interview',
  'resume_reviewed',
  'github_review',
  'achievement_unlocked',
  'xp_gained',
  'streak_updated',
  'progress_updated',
  'other',
];

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: ACTIVITY_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    points: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
