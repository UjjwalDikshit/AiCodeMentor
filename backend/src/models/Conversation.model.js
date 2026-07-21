/**
 * Conversation (chat session) — Copilot thread.
 */
const mongoose = require('mongoose');

const usageStatsSchema = new mongoose.Schema(
  {
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    totalLatencyMs: { type: Number, default: 0 },
    providerUsage: { type: Map, of: Number, default: {} },
    modelUsage: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, maxlength: 200, default: 'New Chat' },
    titleSource: { type: String, enum: ['auto', 'manual', 'default'], default: 'default' },
    lastMessage: { type: String, trim: true, maxlength: 500, default: '' },
    provider: { type: String, enum: ['dummy', 'groq', 'ollama'], default: 'dummy' },
    model: { type: String, trim: true, default: 'dummy-echo' },
    systemPrompt: { type: String, trim: true, default: 'chat_general' },
    systemPromptOverride: { type: String, default: '', maxlength: 8000 },
    memoryKind: {
      type: String,
      enum: ['none', 'buffer', 'conversation', 'window', 'summary'],
      default: 'window',
    },
    temperature: { type: Number, min: 0, max: 2, default: 0.2 },
    topP: { type: Number, min: 0, max: 1, default: 1 },
    topK: { type: Number, min: 1, max: 100, default: 40 },
    maxTokens: { type: Number, min: 1, max: 8192, default: 2048 },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatTemplate', default: null },
    isPinned: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    color: { type: String, default: '#6366f1', maxlength: 20 },
    icon: { type: String, default: 'message-square', maxlength: 40 },
    messageCount: { type: Number, default: 0, min: 0 },
    lastOpenedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    usageStats: { type: usageStatsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, isPinned: 1 });
conversationSchema.index({ userId: 1, isFavorite: 1 });
conversationSchema.index({ userId: 1, lastOpenedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
