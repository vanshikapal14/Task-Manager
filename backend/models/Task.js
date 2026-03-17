const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['todo', 'in-progress', 'completed'], default: 'todo' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  category:    { type: String, default: 'general', trim: true },
  tags:        [{ type: String, trim: true }],
  deadline:    { type: Date },
  reminder:    { type: Date },
  completedAt: { type: Date },
  xpEarned:    { type: Number, default: 0 },
}, { timestamps: true });

// Index for common queries
TaskSchema.index({ user: 1, status: 1 });
TaskSchema.index({ user: 1, deadline: 1 });

module.exports = mongoose.model('Task', TaskSchema);
