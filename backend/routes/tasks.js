const express = require('express');
const Task    = require('../models/Task');
const User    = require('../models/User');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.use(auth);

// Helper: calculate XP for completing a task
function calcXP(task) {
  let xp = 10;
  if (task.priority === 'high') xp += 5;
  if (task.priority === 'medium') xp += 2;
  return xp;
}

// Helper: check and update streak + level
async function updateGamification(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  const today = new Date().toISOString().split('T')[0];

  // Streak logic
  if (user.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (user.lastActiveDate === yesterdayStr) {
      user.streak += 1;
    } else if (user.lastActiveDate !== today) {
      user.streak = 1;
    }
    user.lastActiveDate = today;
  }

  // Level up every 100 XP
  const newLevel = Math.floor(user.xp / 100) + 1;
  user.level = newLevel;

  // Badge checks
  const badges = new Set(user.badges || []);
  const totalDone = await Task.countDocuments({ user: userId, status: 'completed' });

  if (totalDone >= 1) badges.add('first_task');
  if (totalDone >= 10) badges.add('ten_tasks');
  if (totalDone >= 50) badges.add('fifty_tasks');
  if (totalDone >= 100) badges.add('century');
  if (user.streak >= 3) badges.add('streak_3');
  if (user.streak >= 7) badges.add('streak_7');
  if (user.streak >= 14) badges.add('streak_14');
  if (user.streak >= 30) badges.add('streak_30');
  if (user.level >= 5) badges.add('level_5');
  if (user.level >= 10) badges.add('level_10');

  user.badges = Array.from(badges);
  await user.save();
}

// GET /api/tasks — with optional filters
router.get('/', async (req, res) => {
  try {
    const query = { user: req.user.id };

    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.category) query.category = req.query.category;

    // Text search across title and description
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks — create task
router.post('/', async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, user: req.user.id });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/tasks/:id — update task, handle XP on completion
router.put('/:id', async (req, res) => {
  try {
    const existing = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!existing) return res.status(404).json({ message: 'Task not found' });

    const wasCompleted = existing.status === 'completed';
    const willComplete = req.body.status === 'completed';

    // Award XP when completing a task for the first time
    if (willComplete && !wasCompleted) {
      const xp = calcXP(existing);
      req.body.completedAt = new Date();
      req.body.xpEarned = xp;
      await User.findByIdAndUpdate(req.user.id, { $inc: { xp } });
      await updateGamification(req.user.id);
    }

    // Remove XP if un-completing
    if (!willComplete && wasCompleted && existing.xpEarned) {
      await User.findByIdAndUpdate(req.user.id, { $inc: { xp: -existing.xpEarned } });
      req.body.completedAt = null;
      req.body.xpEarned = 0;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Remove earned XP if the task was completed
    if (task.xpEarned && task.status === 'completed') {
      await User.findByIdAndUpdate(req.user.id, { $inc: { xp: -task.xpEarned } });
    }

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
