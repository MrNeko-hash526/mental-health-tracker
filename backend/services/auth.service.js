const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'very strong dont change it but use it in env very very strong';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function createUser({ name, email, password }) {
  const password_hash = await bcrypt.hash(password, 10);
  const sql = 'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)';
  const [result] = await pool.query(sql, [name, email, password_hash]);
  const userId = result.insertId;
  return findUserById(userId);
}

async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] || null;
}

async function verifyPassword(user, plain) {
  return bcrypt.compare(plain, user.password_hash);
}

function generateJwt(user) {
  const payload = { id: user.id, email: user.email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  generateJwt,
};