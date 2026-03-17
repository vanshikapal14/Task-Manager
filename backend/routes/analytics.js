const express = require('express');
const Task    = require('../models/Task');
const User    = require('../models/User');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.use(auth);

// GET /api/analytics/stats — overview stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('xp level streak badges');

    const total     = await Task.countDocuments({ user: userId });
    const completed = await Task.countDocuments({ user: userId, status: 'completed' });
    const active    = await Task.countDocuments({ user: userId, status: 'in-progress' });
    const highPri   = await Task.countDocuments({ user: userId, priority: 'high', status: { $ne: 'completed' } });

    res.json({
      total, completed, active, highPriority: highPri,
      xp: user?.xp || 0,
      level: user?.level || 1,
      streak: user?.streak || 0,
      badges: user?.badges || [],
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/weekly — last 7 days breakdown
router.get('/weekly', async (req, res) => {
  try {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayStart = new Date(dateStr + 'T00:00:00Z');
      const dayEnd   = new Date(dateStr + 'T23:59:59Z');

      const total = await Task.countDocuments({
        user: req.user.id,
        deadline: { $gte: dayStart, $lte: dayEnd },
      });

      const done = await Task.countDocuments({
        user: req.user.id,
        deadline: { $gte: dayStart, $lte: dayEnd },
        status: 'completed',
      });

      days.push({
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        total, done,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      });
    }

    res.json(days);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/productivity — which hours/days user completes most tasks
router.get('/productivity', async (req, res) => {
  try {
    const completed = await Task.find({
      user: req.user.id,
      status: 'completed',
      completedAt: { $exists: true, $ne: null },
    }).select('completedAt');

    // Count completions by hour and day of week
    const hourCounts = new Array(24).fill(0);
    const dayCounts  = new Array(7).fill(0);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    completed.forEach(t => {
      if (t.completedAt) {
        const d = new Date(t.completedAt);
        hourCounts[d.getHours()]++;
        dayCounts[d.getDay()]++;
      }
    });

    // Find the best hour and best day
    const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
    const bestDay  = dayCounts.indexOf(Math.max(...dayCounts));

    res.json({
      bestHour,
      bestHourLabel: bestHour > 12 ? `${bestHour - 12} PM` : bestHour === 0 ? '12 AM' : `${bestHour} AM`,
      bestDay: dayNames[bestDay],
      hourDistribution: hourCounts,
      dayDistribution: dayCounts.map((count, i) => ({ day: dayNames[i], count })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
