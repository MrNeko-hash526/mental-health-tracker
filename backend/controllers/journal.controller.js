const service = require('../services/journal.service');

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
    
    if (!body.text || !body.text.trim()) {
      return res.status(400).json({ message: 'Text content is required' });
    }

    console.log('Creating journal entry with body:', body);
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
    
    console.log('Updating journal entry with changes:', changes);
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

async function generateSummary(req, res) {
  try {
    const userId = req.user.id;
    const entryId = req.params.id;
    
    console.log('Generating summary for entry:', entryId, 'user:', userId);
    const updated = await service.generateSummaryForEntry(entryId, userId);
    return res.json({ entry: updated });
  } catch (err) {
    console.error('generateSummary error:', err);
    return res.status(500).json({ message: err.message || 'Failed to generate summary' });
  }
}

module.exports = {
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  generateSummary
};