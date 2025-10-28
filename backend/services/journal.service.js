const pool = require('../config/db');
const crypto = require('crypto');
const deepseekService = require('./deepseek.service'); // Use DeepSeek directly

function genId(prefix = 'j') {
  return `${prefix}${crypto.randomBytes(8).toString('hex')}`;
}

// Convert between frontend emoji and database string
const MOOD_MAP = {
  '😊': 'happy',
  '😐': 'neutral', 
  '😔': 'sad'
};

const MOOD_REVERSE_MAP = {
  'happy': '😊',
  'neutral': '😐',
  'sad': '😔'
};

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
    mood: MOOD_REVERSE_MAP[entry.mood] || '😊', // Convert back to emoji
    text: entry.text,
    tags: Array.isArray(tags) ? tags : [],
    summary: entry.summary,
    sentiment: entry.sentiment,
    createdAt: fromMySQLDateTime(entry.created_at),
    updatedAt: fromMySQLDateTime(entry.updated_at)
  };
}

async function listEntries(userId) {
  console.log('listEntries called with userId:', userId);
  const [rows] = await pool.query(
    'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  console.log(`Found ${rows.length} journal entries for user ${userId}`);
  return rows.map(sanitizeEntry);
}

async function getEntry(id, userId) {
  console.log('getEntry called with id:', id, 'userId:', userId);
  const [rows] = await pool.query(
    'SELECT * FROM journal_entries WHERE id = ? AND user_id = ? LIMIT 1',
    [id, userId]
  );
  return sanitizeEntry(rows[0]);
}

async function createEntry(userId, payload) {
  const entryId = payload.id || genId('journal');
  
  console.log('Creating journal entry with:', {
    entryId,
    userId,
    payload
  });
  
  const sql = `INSERT INTO journal_entries 
    (id, user_id, mood, text, tags)
    VALUES (?, ?, ?, ?, ?)`;
    
  const tags = Array.isArray(payload.tags) ? JSON.stringify(payload.tags) : null;
  const dbMood = MOOD_MAP[payload.mood] || 'happy'; // Convert emoji to string
  
  const params = [
    entryId,
    userId,
    dbMood,
    payload.text,
    tags
  ];
  
  console.log('Insert journal SQL:', sql, 'params:', params);
  
  try {
    await pool.query(sql, params);
    const created = await getEntry(entryId, userId);
    console.log('Created journal entry:', created);
    return created;
  } catch (error) {
    console.error('Error creating journal entry:', error);
    throw error;
  }
}

async function updateEntry(id, userId, changes) {
  console.log('updateEntry called with:', { id, userId, changes });
  
  const fields = [];
  const params = [];

  if (changes.mood !== undefined) { 
    fields.push('mood = ?'); 
    params.push(MOOD_MAP[changes.mood] || 'happy'); // Convert emoji to string
  }
  if (changes.text !== undefined) { 
    fields.push('text = ?'); 
    params.push(changes.text); 
  }
  if (changes.tags !== undefined) { 
    fields.push('tags = ?'); 
    params.push(Array.isArray(changes.tags) ? JSON.stringify(changes.tags) : null); 
  }
  if (changes.summary !== undefined) { 
    fields.push('summary = ?'); 
    params.push(changes.summary || null); 
  }
  if (changes.sentiment !== undefined) { 
    fields.push('sentiment = ?'); 
    params.push(changes.sentiment || null); 
  }

  if (!fields.length) return getEntry(id, userId);

  const sql = `UPDATE journal_entries SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
  params.push(id, userId);
  
  console.log('Update journal SQL:', sql, 'params:', params);
  
  const [result] = await pool.query(sql, params);
  console.log('Update result:', result);
  
  return result.affectedRows > 0 ? getEntry(id, userId) : null;
}

async function deleteEntry(id, userId) {
  console.log('deleteEntry called with:', { id, userId });
  
  const sql = 'DELETE FROM journal_entries WHERE id = ? AND user_id = ?';
  const params = [id, userId];
  
  console.log('Delete journal SQL:', sql, 'params:', params);
  
  const [result] = await pool.query(sql, params);
  console.log('Delete result:', result);
  
  return result.affectedRows > 0;
}

async function generateSummaryForEntry(id, userId, options = {}) {
  console.log('generateSummaryForEntry called with:', { id, userId, options });
  
  const entry = await getEntry(id, userId);
  if (!entry) {
    throw new Error('Entry not found');
  }
  
  console.log('Generating DeepSeek summary for entry:', entry.id, 'text length:', entry.text.length);
  
  // Use DeepSeek service directly
  const result = await deepseekService.generateSummary(entry.text, options);
  
  if (result.error && !result.fallback) {
    console.error('DeepSeek summary generation failed:', result.error);
    throw new Error('Failed to generate AI summary');
  }
  
  // Update the entry with the generated summary and sentiment
  const updated = await updateEntry(id, userId, {
    summary: result.summary,
    sentiment: result.sentiment
  });
  
  console.log('Updated entry with DeepSeek summary:', {
    id: updated.id,
    provider: 'deepseek',
    hasSummary: !!updated.summary,
    sentiment: updated.sentiment
  });
  
  return {
    ...updated,
    aiProvider: 'deepseek',
    aiAnalysis: result.analysis || null
  };
}

module.exports = {
  listEntries,
  getEntry, 
  createEntry,
  updateEntry,
  deleteEntry,
  generateSummaryForEntry
};