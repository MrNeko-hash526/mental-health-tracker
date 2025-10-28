const authService = require('../services/auth.service');

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const existing = await authService.findUserByEmail(email);
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const user = await authService.createUser({ name, email, password });
    const jwt = authService.generateJwt(user);

    // user is auto-verified (is_verified = 1)
    return res.status(201).json({ message: 'registered', token: jwt, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : (err && err.message) || 'Server error';
    return res.status(500).json({ message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const user = await authService.findUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await authService.verifyPassword(user, password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const jwt = authService.generateJwt(user);
    return res.json({ token: jwt, user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : (err && err.message) || 'Server error';
    return res.status(500).json({ message });
  }
}

async function verify(_req, res) {
  // verification disabled (no verification_tokens table)
  return res.status(400).json({ message: 'Email verification is disabled on this server' });
}

async function resendVerification(_req, res) {
  // verification disabled (no verification_tokens table)
  return res.status(400).json({ message: 'Email verification is disabled on this server' });
}

async function me(req, res) {
  try {
    const user = await authService.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    const message = process.env.NODE_ENV === 'production' ? 'Server error' : (err && err.message) || 'Server error';
    return res.status(500).json({ message });
  }
}

module.exports = { register, login, verify, resendVerification, me };