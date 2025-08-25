const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const router = express.Router();

const COOKIE_NAME = 'admintoken';
const JWT_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const isProd = process.env.NODE_ENV === 'production';

function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev_insecure_secret_change_me';
  return jwt.sign(payload, secret, { expiresIn: JWT_TTL_SECONDS });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'dev_insecure_secret_change_me';
  return jwt.verify(token, secret);
}

// Middleware to authenticate admin via cookie
function authMiddleware(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const decoded = verifyToken(token);
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

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
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
      maxAge: JWT_TTL_SECONDS * 1000
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// GET /api/admin/me
router.get('/me', authMiddleware, async (req, res) => {
  return res.json({ success: true, admin: { username: req.admin.username } });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: isProd ? 'none' : 'lax', secure: isProd });
  return res.json({ success: true });
});

module.exports = { router, authMiddleware, verifyToken };
