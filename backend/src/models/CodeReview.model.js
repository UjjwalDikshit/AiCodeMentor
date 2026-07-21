/**
 * Code Intelligence — review sessions with deterministic + AI results history.
 */
const mongoose = require('mongoose');

const fileStatSchema = new mongoose.Schema(
  {
    filename: String,
    language: String,
    lineCount: Number,
    qualityScore: Number,
    complexity: Number,
    securityIssues: Number,
    staticIssues: Number,
  },
  { _id: false }
);

const codeReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 200, default: 'Code Review' },
    sourceType: {
      type: String,
      enum: ['snippet', 'files', 'zip', 'github_url', 'diff', 'pr_diff'],
      default: 'snippet',
    },
    language: { type: String, default: 'unknown' },
    languageConfidence: { type: Number, default: 0 },
    filename: { type: String, default: '' },
    code: { type: String, default: '', maxlength: 500000 },
    oldCode: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'ready', 'failed'],
      default: 'pending',
    },
    error: { type: String, default: '' },
    deterministic: { type: mongoose.Schema.Types.Mixed, default: null },
    aiReview: { type: mongoose.Schema.Types.Mixed, default: null },
    refactor: { type: mongoose.Schema.Types.Mixed, default: null },
    interviewCoach: { type: mongoose.Schema.Types.Mixed, default: null },
    diffResult: { type: mongoose.Schema.Types.Mixed, default: null },
    qualityScore: { type: Number, default: null },
    securityScore: { type: Number, default: null },
    cyclomatic: { type: Number, default: null },
    fileStats: { type: [fileStatSchema], default: [] },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    reviewHistory: [
      {
        at: { type: Date, default: Date.now },
        qualityScore: Number,
        securityIssues: Number,
        summary: String,
      },
    ],
  },
  { timestamps: true }
);

codeReviewSchema.index({ userId: 1, updatedAt: -1 });
codeReviewSchema.index({ userId: 1, language: 1 });

module.exports = mongoose.model('CodeReview', codeReviewSchema);
