/**
 * User prompt library entries — map to Prompt Registry YAML keys + custom overrides.
 */
const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    version: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const promptLibrarySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: {
      type: String,
      enum: ['Coding', 'Interview', 'Resume', 'Career', 'System Design', 'Debugging', 'Architecture', 'Other'],
      default: 'Coding',
    },
    registryKey: { type: String, default: 'chat_general', trim: true },
    body: { type: String, default: '', maxlength: 20000 },
    description: { type: String, default: '', maxlength: 500 },
    isFavorite: { type: Boolean, default: false },
    versions: { type: [versionSchema], default: [] },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

promptLibrarySchema.index({ userId: 1, category: 1 });
promptLibrarySchema.index({ userId: 1, title: 1 });

module.exports = mongoose.model('PromptLibrary', promptLibrarySchema);
