const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { authMiddleware, signToken, setAuthCookie, verifyToken, COOKIE_NAME } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /ping
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'router ok' });
});

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = signToken({ id: admin._id.toString(), username: admin.username });
    // Set httpOnly cookie for backward compatibility
    setAuthCookie(res, token);
    // Also return token in body for SPA Authorization headers
    return res.json({ success: true, token });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// GET /api/admin/ping (no auth) - quick mount check
router.get('/ping', (req, res) => {
  res.json({ success: true, message: 'admin router ok' });
});

// GET /api/admin/me
router.get('/me', authMiddleware, async (req, res) => {
  const user = req.user || req.admin;
  return res.json({ success: true, admin: { username: user.username } });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: true });
  return res.json({ success: true });
});

module.exports = router;
// Also expose named export for compatibility with old import style `{ router } = require('./routes/admin')`
module.exports.router = router;
