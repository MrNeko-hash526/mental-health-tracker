const service = require('../services/meditation.service');

async function listSessions(req, res) {
  try {
    // Use authenticated user ID if available, otherwise null for public sessions only
    const userId = req.user?.id || null;
    console.log('Fetching sessions for userId:', userId); // Debug log
    const rows = await service.listSessions(userId);
    console.log(`Found ${rows.length} sessions`); // Debug log
    return res.json({ sessions: rows });
  } catch (err) {
    console.error('listSessions error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function getSession(req, res) {
  try {
    const userId = req.user?.id || null;
    const session = await service.getSession(req.params.id, userId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    return res.json({ session });
  } catch (err) {
    console.error('getSession error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function createSession(req, res) {
  try {
    const userId = req.user.id;
    const { id, title, minutes, description, custom } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    
    console.log('Creating session for userId:', userId, 'with data:', { id, title, minutes, description, custom }); // Debug log
    
    const created = await service.createSession(userId, { id, title, minutes, description, custom });
    return res.status(201).json({ session: created });
  } catch (err) {
    console.error('createSession error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function updateSession(req, res) {
  try {
    const userId = req.user.id;
    const updated = await service.updateSession(req.params.id, userId, req.body);
    if (!updated) return res.status(404).json({ message: 'Session not found' });
    return res.json({ session: updated });
  } catch (err) {
    console.error('updateSession error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function deleteSession(req, res) {
  try {
    const userId = req.user.id;
    const deleted = await service.deleteSession(req.params.id, userId);
    if (!deleted) return res.status(404).json({ message: 'Session not found' });
    return res.json({ deleted: true });
  } catch (err) {
    console.error('deleteSession error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function listRuns(req, res) {
  try {
    const userId = req.user.id;
    const rows = await service.listRuns(userId);
    return res.json({ runs: rows });
  } catch (err) {
    console.error('listRuns error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function getRun(req, res) {
  try {
    const userId = req.user.id;
    const run = await service.getRun(req.params.id, userId);
    if (!run) return res.status(404).json({ message: 'Run not found' });
    return res.json({ run });
  } catch (err) {
    console.error('getRun error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function createRun(req, res) {
  try {
    const userId = req.user.id;
    const payload = req.body;
    if (!payload.started_at) return res.status(400).json({ message: 'started_at is required' });
    const created = await service.createRun(userId, payload);
    return res.status(201).json({ run: created });
  } catch (err) {
    console.error('createRun error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function updateRun(req, res) {
  try {
    const userId = req.user.id;
    const updated = await service.updateRun(req.params.id, userId, req.body);
    if (!updated) return res.status(404).json({ message: 'Run not found' });
    return res.json({ run: updated });
  } catch (err) {
    console.error('updateRun error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

async function deleteRun(req, res) {
  try {
    const userId = req.user.id;
    const deleted = await service.deleteRun(req.params.id, userId);
    if (!deleted) return res.status(404).json({ message: 'Run not found' });
    return res.json({ deleted: true });
  } catch (err) {
    console.error('deleteRun error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
}

module.exports = {
  listSessions, getSession, createSession, updateSession, deleteSession,
  listRuns, getRun, createRun, updateRun, deleteRun
};