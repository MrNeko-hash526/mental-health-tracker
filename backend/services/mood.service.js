const pool = require('../config/db');
const crypto = require('crypto');

function genId(prefix = 'm') {
  return `${prefix}${crypto.randomBytes(8).toString('hex')}`;
}

// Convert ISO datetime to MySQL format
function toMySQLDateTime(isoString) {
  if (!isoString) return null;
  return new Date(isoString).toISOString().slice(0, 19).replace('T', ' ');
}

// Convert MySQL datetime back to ISO string
function fromMySQLDateTime(mysqlDateTime) {
  if (!mysqlDateTime) return null;
  return new Date(mysqlDateTime).toISOString();
}

// Convert database row to frontend format
function sanitizeEntry(entry) {
  if (!entry) return null;
  
  let tags = [];
  if (entry.tags) {
    try {
      tags = typeof entry.tags === 'string' ? JSON.parse(entry.tags) : entry.tags;
    } catch {
      tags = [];
    }
  }
  
  return {
    id: entry.id,
    score: parseInt(entry.score) || 1,
    energy: parseInt(entry.energy) || 3,
    intensity: parseInt(entry.intensity) || 3,
    emoji: entry.emoji,
    note: entry.note,
    date: fromMySQLDateTime(entry.date),
    tags: Array.isArray(tags) ? tags : [],
    createdAt: fromMySQLDateTime(entry.created_at),
    updatedAt: fromMySQLDateTime(entry.updated_at)
  };
}

async function listEntries(userId) {
  console.log('listEntries called with userId:', userId);
  const [rows] = await pool.query(
    'SELECT * FROM mood_entries WHERE user_id = ? ORDER BY date DESC',
    [userId]
  );
  console.log(`Found ${rows.length} mood entries for user ${userId}`);
  return rows.map(sanitizeEntry);
}

async function getEntry(id, userId) {
  console.log('getEntry called with id:', id, 'userId:', userId);
  const [rows] = await pool.query(
    'SELECT * FROM mood_entries WHERE id = ? AND user_id = ? LIMIT 1',
    [id, userId]
  );
  return sanitizeEntry(rows[0]);
}

async function createEntry(userId, payload) {
  const entryId = payload.id || genId('mood');
  
  console.log('Creating mood entry with:', {
    entryId,
    userId,
    payload
  });
  
  const sql = `INSERT INTO mood_entries 
    (id, user_id, score, energy, intensity, emoji, note, date, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
  const tags = Array.isArray(payload.tags) ? JSON.stringify(payload.tags) : null;
  
  const params = [
    entryId,
    userId,
    parseInt(payload.score) || 1,
    parseInt(payload.energy) || 3,
    parseInt(payload.intensity) || 3,
    payload.emoji || '😐',
    payload.note || null,
    toMySQLDateTime(payload.date),
    tags
  ];
  
  console.log('Insert mood SQL:', sql, 'params:', params);
  
  try {
    await pool.query(sql, params);
    const created = await getEntry(entryId, userId);
    console.log('Created mood entry:', created);
    return created;
  } catch (error) {
    console.error('Error creating mood entry:', error);
    throw error;
  }
}

async function updateEntry(id, userId, changes) {
  console.log('updateEntry called with:', { id, userId, changes });
  
  const fields = [];
  const params = [];

  if (changes.score !== undefined) { 
    fields.push('score = ?'); 
    params.push(parseInt(changes.score) || 1); 
  }
  if (changes.energy !== undefined) { 
    fields.push('energy = ?'); 
    params.push(parseInt(changes.energy) || 3); 
  }
  if (changes.intensity !== undefined) { 
    fields.push('intensity = ?'); 
    params.push(parseInt(changes.intensity) || 3); 
  }
  if (changes.emoji !== undefined) { 
    fields.push('emoji = ?'); 
    params.push(changes.emoji); 
  }
  if (changes.note !== undefined) { 
    fields.push('note = ?'); 
    params.push(changes.note || null); 
  }
  if (changes.date !== undefined) { 
    fields.push('date = ?'); 
    params.push(toMySQLDateTime(changes.date)); 
  }
  if (changes.tags !== undefined) { 
    fields.push('tags = ?'); 
    params.push(Array.isArray(changes.tags) ? JSON.stringify(changes.tags) : null); 
  }

  if (!fields.length) return getEntry(id, userId);

  const sql = `UPDATE mood_entries SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
  params.push(id, userId);
  
  console.log('Update mood SQL:', sql, 'params:', params);
  
  const [result] = await pool.query(sql, params);
  console.log('Update result:', result);
  
  return result.affectedRows > 0 ? getEntry(id, userId) : null;
}

async function deleteEntry(id, userId) {
  console.log('deleteEntry called with:', { id, userId });
  
  const sql = 'DELETE FROM mood_entries WHERE id = ? AND user_id = ?';
  const params = [id, userId];
  
  console.log('Delete mood SQL:', sql, 'params:', params);
  
  const [result] = await pool.query(sql, params);
  console.log('Delete result:', result);
  
  return result.affectedRows > 0;
}

module.exports = {
  listEntries,
  getEntry, 
  createEntry,
  updateEntry,
  deleteEntry
};