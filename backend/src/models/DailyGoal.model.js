/**
 * DailyGoal — source of truth for daily goals.
 * Soft-delete individual goal items via isDeleted.
 */
const mongoose = require('mongoose');

const goalItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    completed: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const dailyGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    goals: { type: [goalItemSchema], default: [] },
    completedGoals: { type: Number, default: 0, min: 0 },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

dailyGoalSchema.index({ userId: 1, date: -1 }, { unique: true });
dailyGoalSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('DailyGoal', dailyGoalSchema);
