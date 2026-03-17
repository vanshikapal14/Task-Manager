const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },

  // Gamification
  xp:             { type: Number, default: 0 },
  level:          { type: Number, default: 1 },
  streak:         { type: Number, default: 0 },
  lastActiveDate: { type: String, default: '' },
  badges:         [{ type: String }],

  // Preferences
  settings: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
