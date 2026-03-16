const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/** Creates a JWT token for a user */
function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin || 0 }, JWT_SECRET, { expiresIn: '7d' });
}

/** Middleware: requires valid JWT in Authorization header. Sets req.user. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Middleware: optional auth — sets req.user if token present, otherwise continues. */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch {
      // ignore invalid token
    }
  }
  next();
}

/** Check if an email should be granted admin on signup */
function isAdminEmail(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

module.exports = { signToken, requireAuth, optionalAuth, isAdminEmail };
