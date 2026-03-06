const mongoose = require('mongoose');
 
const TaskSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['todo', 'in-progress', 'completed'], default: 'todo' },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline:    { type: Date },
  reminder:    { type: Date },
}, { timestamps: true });
 
module.exports = mongoose.model('Task', TaskSchema);
