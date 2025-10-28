const pool = require('../config/db');

async function getGoalsByUser(userId) {
  const [rows] = await pool.query('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return rows;
}

async function getGoalById(id, userId) {
  const [rows] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ? LIMIT 1', [id, userId]);
  return rows[0] || null;
}

async function createGoal(userId, { title, note, due_at, priority = 'medium', tags = null }) {
  const tagsJson = tags ? JSON.stringify(tags) : null;
  const sql = `INSERT INTO goals (user_id, title, note, due_at, priority, tags)
               VALUES (?, ?, ?, ?, ?, ?)`;
  const [result] = await pool.query(sql, [userId, title, note || null, due_at || null, priority, tagsJson]);
  return getGoalById(result.insertId, userId);
}

async function updateGoal(id, userId, { title, note, due_at, completed, completed_at, priority, tags }) {
  const fields = [];
  const params = [];

  if (title !== undefined) { fields.push('title = ?'); params.push(title); }
  if (note !== undefined) { fields.push('note = ?'); params.push(note); }
  if (due_at !== undefined) { fields.push('due_at = ?'); params.push(due_at); }
  if (completed !== undefined) { fields.push('completed = ?'); params.push(completed ? 1 : 0); }
  if (completed_at !== undefined) { fields.push('completed_at = ?'); params.push(completed_at); }
  if (priority !== undefined) { fields.push('priority = ?'); params.push(priority); }
  if (tags !== undefined) { fields.push('tags = ?'); params.push(tags ? JSON.stringify(tags) : null); }

  if (fields.length === 0) return getGoalById(id, userId);

  const sql = `UPDATE goals SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
  params.push(id, userId);
  await pool.query(sql, params);
  return getGoalById(id, userId);
}

async function deleteGoal(id, userId) {
  const [result] = await pool.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [id, userId]);
  return result.affectedRows > 0;
}

module.exports = {
  getGoalsByUser,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
};