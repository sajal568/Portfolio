const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'admintoken';
const isProd = process.env.NODE_ENV === 'production';

function extractToken(req) {
  const auth = req.headers['authorization'] || req.headers['Authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    return auth.substring('Bearer '.length).trim();
  }
  const tokenFromCookie = req.cookies && req.cookies[COOKIE_NAME];
  return tokenFromCookie || null;
}

function authMiddleware(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    const secret = process.env.JWT_SECRET || 'dev_insecure_secret_change_me';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev_insecure_secret_change_me';
  const ttl = 60 * 60 * 8; // 8h
  return jwt.sign(payload, secret, { expiresIn: ttl });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || 'dev_insecure_secret_change_me';
  return jwt.verify(token, secret);
}

function setAuthCookie(res, token) {
  const ttlMs = 60 * 60 * 8 * 1000;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
    maxAge: ttlMs,
  });
}

module.exports = { authMiddleware, signToken, verifyToken, setAuthCookie, COOKIE_NAME };
