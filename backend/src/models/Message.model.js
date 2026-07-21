/**
 * Chat message — separate collection (normalized).
 */
const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
  },
  { _id: false }
);

const tokensSchema = new mongoose.Schema(
  {
    prompt: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, default: '' },
    parsed: { type: mongoose.Schema.Types.Mixed, default: null },
    attachments: { type: [attachmentSchema], default: [] },
    tokens: { type: tokensSchema, default: () => ({}) },
    latency: { type: Number, default: null },
    provider: { type: String, default: null },
    model: { type: String, default: null },
    requestId: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ['completed', 'streaming', 'error', 'cancelled', 'stopped'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ content: 'text' });

module.exports = mongoose.model('Message', messageSchema);
