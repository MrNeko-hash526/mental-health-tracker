const goalsService = require('../services/goals.service');

function parseTagsValue(raw) {
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    // Try parse JSON first
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) || typeof parsed === 'object') return parsed;
    } catch (e) {
      // not JSON, continue
    }
    // fallback: comma-separated string or single tag
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    return parts.length ? parts : null;
  }
  return null;
}

async function list(req, res) {
  try {
    const userId = req.user.id;
    const rows = await goalsService.getGoalsByUser(userId);
    const data = rows.map(r => {
      const tags = parseTagsValue(r.tags);
      return { ...r, tags };
    });
    return res.json({ goals: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function getOne(req, res) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const goal = await goalsService.getGoalById(id, userId);
    if (!goal) return res.status(404).json({ message: 'Not found' });
    goal.tags = parseTagsValue(goal.tags);
    return res.json({ goal });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function create(req, res) {
  try {
    const userId = req.user.id;
    const { title, note, due_at, priority, tags: rawTags } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const tags = parseTagsValue(rawTags);
    const created = await goalsService.createGoal(userId, { title, note, due_at, priority, tags });
    created.tags = parseTagsValue(created.tags);
    return res.status(201).json({ goal: created });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function update(req, res) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const payload = { ...req.body };
    if (payload.tags !== undefined) payload.tags = parseTagsValue(payload.tags);
    const updated = await goalsService.updateGoal(id, userId, payload);
    if (!updated) return res.status(404).json({ message: 'Not found or not allowed' });
    updated.tags = parseTagsValue(updated.tags);
    return res.json({ goal: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function remove(req, res) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const ok = await goalsService.deleteGoal(id, userId);
    if (!ok) return res.status(404).json({ message: 'Not found' });
    return res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

module.exports = { list, getOne, create, update, remove };