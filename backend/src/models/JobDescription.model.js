/**
 * Job description for resume matching (separate vector collection on AI side).
 */
const mongoose = require('mongoose');

const jobDescriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
    title: { type: String, trim: true, maxlength: 200, default: 'Job Description' },
    company: { type: String, trim: true, maxlength: 120, default: '' },
    text: { type: String, required: true, maxlength: 100000 },
    indexed: { type: Boolean, default: false },
    chunkCount: { type: Number, default: 0 },
    lastMatch: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

jobDescriptionSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('JobDescription', jobDescriptionSchema);
