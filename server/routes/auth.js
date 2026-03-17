const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { signToken, requireAuth, isAdminEmail } = require('../middleware/auth');
const { generateCode, sendVerificationEmail, isSmtpConfigured } = require('../email');

const router = express.Router();

// ── POST /api/auth/signup ── validate + send verification code (or create directly if no SMTP)
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // If SMTP is not configured, skip MFA and create account directly
    if (!isSmtpConfigured()) {
      const admin = isAdminEmail(email) ? 1 : 0;
      const result = db.prepare('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)').run(username, email, passwordHash, admin);
      const user = { id: result.lastInsertRowid, username, email, is_admin: admin };
      const token = signToken(user);
      return res.status(201).json({ user, token });
    }

    // MFA flow: send verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare("UPDATE verification_codes SET used = 1 WHERE email = ? AND purpose = 'signup' AND used = 0").run(email);

    const payload = JSON.stringify({ username, email, passwordHash });
    db.prepare('INSERT INTO verification_codes (email, code, purpose, payload, expires_at) VALUES (?, ?, ?, ?, ?)').run(email, code, 'signup', payload, expiresAt);

    await sendVerificationEmail(email, code);
    res.json({ needsVerification: true, email });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── POST /api/auth/verify-signup ── verify code + create account
router.post('/verify-signup', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const row = db.prepare(
      "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND purpose = 'signup' AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
    ).get(email, code);

    if (!row) return res.status(400).json({ error: 'Invalid or expired code' });

    db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(row.id);

    const { username, passwordHash } = JSON.parse(row.payload);

    const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existing) return res.status(409).json({ error: 'Username or email already taken' });

    const admin = isAdminEmail(email) ? 1 : 0;
    const result = db.prepare('INSERT INTO users (username, email, password_hash, is_admin) VALUES (?, ?, ?, ?)').run(username, email, passwordHash, admin);

    const user = { id: result.lastInsertRowid, username, email, is_admin: admin };
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Verify signup error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── POST /api/auth/signin ── validate credentials + send code (or return token if no SMTP)
router.post('/signin', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(usernameOrEmail, usernameOrEmail);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Auto-upgrade to admin if email matches ADMIN_EMAILS
    if (!user.is_admin && isAdminEmail(user.email)) {
      db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
      user.is_admin = 1;
    }

    // If SMTP is not configured, skip MFA and return token directly
    if (!isSmtpConfigured()) {
      const token = signToken(user);
      return res.json({ user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin }, token });
    }

    // MFA flow: send verification code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare("UPDATE verification_codes SET used = 1 WHERE email = ? AND purpose = 'signin' AND used = 0").run(user.email);
    db.prepare('INSERT INTO verification_codes (email, code, purpose, payload, expires_at) VALUES (?, ?, ?, ?, ?)').run(user.email, code, 'signin', String(user.id), expiresAt);

    await sendVerificationEmail(user.email, code);
    res.json({ needsVerification: true, email: user.email });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ── POST /api/auth/verify-signin ── verify code + return token
router.post('/verify-signin', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const row = db.prepare(
      "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND purpose = 'signin' AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
    ).get(email, code);

    if (!row) return res.status(400).json({ error: 'Invalid or expired code' });

    db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(row.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(parseInt(row.payload));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = signToken(user);
    res.json({ user: { id: user.id, username: user.username, email: user.email, is_admin: user.is_admin }, token });
  } catch (err) {
    console.error('Verify signin error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// GET /api/auth/me — get current user from token
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, email, is_admin, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
