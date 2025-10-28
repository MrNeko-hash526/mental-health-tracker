const pool = require('../config/db');
const crypto = require('crypto');

function genId(prefix = 'm') {
  return `${prefix}${crypto.randomBytes(8).toString('hex')}`;
}

// Convert ISO datetime to MySQL format (remove 'Z' and milliseconds if needed)
function toMySQLDateTime(isoString) {
  if (!isoString) return null;
  // Convert '2025-10-27T16:38:42.277Z' to '2025-10-27 16:38:42'
  return new Date(isoString).toISOString().slice(0, 19).replace('T', ' ');
}

// Convert MySQL datetime back to ISO string for frontend
function fromMySQLDateTime(mysqlDateTime) {
  if (!mysqlDateTime) return null;
  // Convert '2025-10-27 16:38:42' to '2025-10-27T16:38:42.000Z'
  return new Date(mysqlDateTime).toISOString();
}

// Convert database row to frontend format
function sanitizeSession(session) {
  if (!session) return null;
  return {
    id: session.id,
    title: session.title,
    minutes: parseInt(session.minutes) || 0,
    description: session.description,
    custom: Boolean(session.custom),
    userId: session.user_id, // Add userId for debugging
    createdAt: fromMySQLDateTime(session.created_at),
    updatedAt: fromMySQLDateTime(session.updated_at)
  };
}

function sanitizeRun(run) {
  if (!run) return null;
  return {
    id: run.id,
    sessionId: run.session_id,
    sessionTitle: run.session_title,
    startedAt: fromMySQLDateTime(run.started_at),
    endedAt: fromMySQLDateTime(run.ended_at),
    plannedMinutes: parseInt(run.planned_minutes) || 0,
    actualSeconds: parseInt(run.actual_seconds) || 0,
    completed: Boolean(run.completed),
    note: run.note,
    createdAt: fromMySQLDateTime(run.created_at)
  };
}

async function listSessions(userId) {
  console.log('listSessions called with userId:', userId);
  
  // Get default sessions (user_id IS NULL) AND user-specific sessions (user_id = userId)
  let sql, params;
  
  if (userId) {
    // For authenticated users: show default sessions + their custom sessions
    sql = 'SELECT * FROM meditation_sessions WHERE user_id IS NULL OR user_id = ? ORDER BY custom ASC, created_at DESC';
    params = [userId];
    console.log('SQL for authenticated user:', sql, 'params:', params);
  } else {
    // For unauthenticated users: only show default sessions
    sql = 'SELECT * FROM meditation_sessions WHERE user_id IS NULL ORDER BY created_at DESC';
    params = [];
    console.log('SQL for anonymous user:', sql);
  }
  
  const [rows] = await pool.query(sql, params);
  console.log(`Found ${rows.length} raw sessions:`, rows.map(r => ({ id: r.id, title: r.title, user_id: r.user_id, custom: r.custom })));
  
  const sanitized = rows.map(sanitizeSession);
  console.log(`Returning ${sanitized.length} sanitized sessions`);
  return sanitized;
}

async function getSession(id, userId) {
  console.log('getSession called with id:', id, 'userId:', userId);
  const [rows] = await pool.query(
    'SELECT * FROM meditation_sessions WHERE id = ? AND (user_id IS NULL OR user_id = ?) LIMIT 1',
    [id, userId]
  );
  console.log('getSession found:', rows.length, 'sessions');
  return sanitizeSession(rows[0]);
}

async function createSession(userId, { id, title, minutes = 10, description = null, custom = 1 }) {
  const sessionId = id || genId('s');
  const numMinutes = parseInt(minutes) || 10;
  
  console.log('Creating session with:', {
    sessionId,
    userId,
    title,
    numMinutes,
    description,
    custom: custom ? 1 : 0
  });
  
  const sql = 'INSERT INTO meditation_sessions (id, user_id, title, minutes, description, custom) VALUES (?, ?, ?, ?, ?, ?)';
  const params = [sessionId, userId, title, numMinutes, description, custom ? 1 : 0];
  
  console.log('Insert SQL:', sql, 'params:', params);
  
  try {
    const [result] = await pool.query(sql, params);
    console.log('Insert result:', result);
    
    // Verify the session was created
    const created = await getSession(sessionId, userId);
    console.log('Created session:', created);
    return created;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

async function updateSession(id, userId, changes) {
  console.log('updateSession called with:', { id, userId, changes });
  const fields = [];
  const params = [];

  if (changes.title !== undefined) { fields.push('title = ?'); params.push(changes.title); }
  if (changes.minutes !== undefined) { fields.push('minutes = ?'); params.push(parseInt(changes.minutes) || 0); }
  if (changes.description !== undefined) { fields.push('description = ?'); params.push(changes.description); }
  if (changes.custom !== undefined) { fields.push('custom = ?'); params.push(changes.custom ? 1 : 0); }

  if (!fields.length) return getSession(id, userId);

  const sql = `UPDATE meditation_sessions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
  params.push(id, userId);
  console.log('Update SQL:', sql, 'params:', params);
  
  const [result] = await pool.query(sql, params);
  console.log('Update result:', result);
  return result.affectedRows > 0 ? getSession(id, userId) : null;
}

async function deleteSession(id, userId) {
  console.log('deleteSession called with:', { id, userId });
  const sql = 'DELETE FROM meditation_sessions WHERE id = ? AND user_id = ?';
  const params = [id, userId]; // Add this line
  console.log('Delete SQL:', sql, 'params:', params);
  
  const [result] = await pool.query(sql, params);
  console.log('Delete result:', result);
  return result.affectedRows > 0;
}

async function listRuns(userId) {
  console.log('listRuns called with userId:', userId);
  const [rows] = await pool.query('SELECT * FROM meditation_runs WHERE user_id = ? ORDER BY started_at DESC', [userId]);
  console.log(`Found ${rows.length} runs for user ${userId}`);
  return rows.map(sanitizeRun);
}

async function getRun(id, userId) {
  const [rows] = await pool.query('SELECT * FROM meditation_runs WHERE id = ? AND user_id = ? LIMIT 1', [id, userId]);
  return sanitizeRun(rows[0]);
}

async function createRun(userId, payload) {
  const runId = payload.id || genId('r');
  console.log('Creating run with:', { runId, userId, payload });
  
  const sql = `INSERT INTO meditation_runs 
    (id, user_id, session_id, session_title, started_at, ended_at, planned_minutes, actual_seconds, completed, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    runId,
    userId,
    payload.session_id || null,
    payload.session_title || null,
    toMySQLDateTime(payload.started_at),
    toMySQLDateTime(payload.ended_at),
    parseInt(payload.planned_minutes) || 0,
    parseInt(payload.actual_seconds) || 0,
    payload.completed ? 1 : 0,
    payload.note || null
  ];
  
  console.log('Insert run SQL:', sql, 'params:', params);
  await pool.query(sql, params);
  return getRun(runId, userId);
}

async function updateRun(id, userId, changes) {
  const fields = [];
  const params = [];

  if (changes.session_id !== undefined) { fields.push('session_id = ?'); params.push(changes.session_id); }
  if (changes.session_title !== undefined) { fields.push('session_title = ?'); params.push(changes.session_title); }
  if (changes.started_at !== undefined) { fields.push('started_at = ?'); params.push(toMySQLDateTime(changes.started_at)); }
  if (changes.ended_at !== undefined) { fields.push('ended_at = ?'); params.push(toMySQLDateTime(changes.ended_at)); }
  if (changes.planned_minutes !== undefined) { fields.push('planned_minutes = ?'); params.push(parseInt(changes.planned_minutes) || 0); }
  if (changes.actual_seconds !== undefined) { fields.push('actual_seconds = ?'); params.push(parseInt(changes.actual_seconds) || 0); }
  if (changes.completed !== undefined) { fields.push('completed = ?'); params.push(changes.completed ? 1 : 0); }
  if (changes.note !== undefined) { fields.push('note = ?'); params.push(changes.note); }

  if (!fields.length) return getRun(id, userId);

  const sql = `UPDATE meditation_runs SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
  params.push(id, userId);
  const [result] = await pool.query(sql, params);
  return result.affectedRows > 0 ? getRun(id, userId) : null;
}

async function deleteRun(id, userId) {
  const [result] = await pool.query('DELETE FROM meditation_runs WHERE id = ? AND user_id = ?', [id, userId]);
  return result.affectedRows > 0;
}

module.exports = {
  listSessions, getSession, createSession, updateSession, deleteSession,
  listRuns, getRun, createRun, updateRun, deleteRun
};