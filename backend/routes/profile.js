const express = require('express');
const User    = require('../models/User');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.use(auth);

// GET /api/profile — full profile with gamification data
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/profile/settings — update theme and preferences
router.put('/settings', async (req, res) => {
  try {
    const { theme } = req.body;
    const update = {};
    if (theme) update['settings.theme'] = theme;

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
