/**
 * Reusable conversation templates (Copilot presets).
 */
const mongoose = require('mongoose');

const chatTemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    systemPrompt: { type: String, required: true, trim: true, default: 'chat_general' },
    memoryKind: {
      type: String,
      enum: ['none', 'buffer', 'conversation', 'window', 'summary'],
      default: 'window',
    },
    temperature: { type: Number, min: 0, max: 2, default: 0.2 },
    provider: { type: String, enum: ['dummy', 'groq', 'ollama'], default: 'dummy' },
    model: { type: String, default: 'dummy-echo' },
    suggestions: { type: [String], default: [] },
    color: { type: String, default: '#6366f1' },
    icon: { type: String, default: 'sparkles' },
    isSystem: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatTemplateSchema.index({ userId: 1, name: 1 });

module.exports = mongoose.model('ChatTemplate', chatTemplateSchema);
