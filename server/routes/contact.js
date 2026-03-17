const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/contact — submit a contact message
router.post('/', optionalAuth, (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (name.length > 100) return res.status(400).json({ error: 'Name too long' });
  if (email.length > 200) return res.status(400).json({ error: 'Email too long' });
  if (subject.length > 200) return res.status(400).json({ error: 'Subject too long' });
  if (message.length > 5000) return res.status(400).json({ error: 'Message too long (max 5000 chars)' });

  const userId = req.user?.id || null;
  db.prepare('INSERT INTO contact_messages (name, email, subject, message, user_id) VALUES (?, ?, ?, ?, ?)')
    .run(name.trim(), email.trim(), subject.trim(), message.trim(), userId);

  res.json({ success: true });
});

module.exports = router;
