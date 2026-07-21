/**
 * Resume Intelligence — user-owned resume with version history + KB metadata.
 */
const mongoose = require('mongoose');

const fileMetaSchema = new mongoose.Schema(
  {
    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,
    ext: String,
    path: String,
    virusScan: {
      scanned: { type: Boolean, default: false },
      clean: { type: Boolean, default: true },
      engine: { type: String, default: 'placeholder' },
    },
  },
  { _id: false }
);

const versionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    label: { type: String, default: '', maxlength: 120 },
    file: fileMetaSchema,
    rawText: { type: String, default: '' },
    structured: { type: mongoose.Schema.Types.Mixed, default: {} },
    chunkIds: { type: [String], default: [] },
    chunkCount: { type: Number, default: 0 },
    collectionName: { type: String, default: '' },
    embeddingModel: { type: String, default: '' },
    indexStatus: {
      type: String,
      enum: ['pending', 'indexing', 'ready', 'failed'],
      default: 'pending',
    },
    indexError: { type: String, default: '' },
    ats: { type: mongoose.Schema.Types.Mixed, default: null },
    bullets: { type: mongoose.Schema.Types.Mixed, default: null },
    skills: { type: mongoose.Schema.Types.Mixed, default: null },
    report: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 200, default: 'Untitled Resume' },
    targetRole: { type: String, trim: true, maxlength: 120, default: 'Software Engineer' },
    currentVersion: { type: Number, default: 1 },
    versions: { type: [versionSchema], default: [] },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'active',
    },
    atsHistory: [
      {
        version: Number,
        overallScore: Number,
        sectionScores: mongoose.Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

resumeSchema.index({ userId: 1, updatedAt: -1 });
resumeSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Resume', resumeSchema);
