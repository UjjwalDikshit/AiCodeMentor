/**
 * Daily chat usage rollup for analytics charts.
 */
const mongoose = require('mongoose');

const chatUsageDailySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    requests: { type: Number, default: 0 },
    latencySumMs: { type: Number, default: 0 },
    providers: { type: Map, of: Number, default: {} },
    models: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

chatUsageDailySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ChatUsageDaily', chatUsageDailySchema);
