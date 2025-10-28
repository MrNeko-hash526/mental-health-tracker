const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');

module.exports = async function auth(req, res, next) {
  try {
    console.log('🔐 Auth middleware - Headers:', req.headers.authorization?.substring(0, 20) + '...');
    console.log('🔐 Auth middleware - Cookies:', req.cookies?.token?.substring(0, 20) + '...');
    
    // Accept Bearer token OR httpOnly cookie named 'token'
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('🔐 Got Bearer token:', token?.substring(0, 20) + '...');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('🔐 Got cookie token:', token?.substring(0, 20) + '...');
    }

    if (!token) {
      console.log('🚫 No token found');
      return res.status(401).json({ message: 'Missing auth token' });
    }

    const secret = process.env.JWT_SECRET || 'very strong dont change it but use it in env very very strong';
    console.log('🔐 Verifying token with secret length:', secret?.length);
    const payload = jwt.verify(token, secret);
    console.log('🔐 JWT payload:', payload);
    
    const user = await authService.findUserById(payload.id);
    if (!user) {
      console.log('🚫 User not found for id:', payload.id);
      return res.status(401).json({ message: 'Invalid token' });
    }

    console.log('✅ Auth success for user:', user.id);
    req.user = user;
    next();
  } catch (err) {
    console.error('🚨 Auth middleware error:', err.message || err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};