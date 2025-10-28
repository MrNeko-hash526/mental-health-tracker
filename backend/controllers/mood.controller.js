const service = require('../services/mood.service');

async function listEntries(req, res) {
  try {
    const userId = req.user.id;
    const entries = await service.listEntries(userId);
    return res.json({ entries });
  } catch (err) {
    console.error('listEntries error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function getEntry(req, res) {
  try {
    const userId = req.user.id;
    const entry = await service.getEntry(req.params.id, userId);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });
    return res.json({ entry });
  } catch (err) {
    console.error('getEntry error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function createEntry(req, res) {
  try {
    const userId = req.user.id;
    const body = req.body;
    
    if (!body.score || !body.date) {
      return res.status(400).json({ message: 'Score and date are required' });
    }

    console.log('Creating mood entry with body:', body);
    const created = await service.createEntry(userId, body);
    return res.status(201).json({ entry: created });
  } catch (err) {
    console.error('createEntry error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function updateEntry(req, res) {
  try {
    const userId = req.user.id;
    const changes = req.body;
    
    console.log('Updating mood entry with changes:', changes);
    const updated = await service.updateEntry(req.params.id, userId, changes);
    if (!updated) return res.status(404).json({ message: 'Entry not found' });
    return res.json({ entry: updated });
  } catch (err) {
    console.error('updateEntry error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function deleteEntry(req, res) {
  try {
    const userId = req.user.id;
    const deleted = await service.deleteEntry(req.params.id, userId);
    if (!deleted) return res.status(404).json({ message: 'Entry not found' });
    return res.json({ deleted: true });
  } catch (err) {
    console.error('deleteEntry error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

module.exports = {
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry
};