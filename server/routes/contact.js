const express = require('express');
const db = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/contact — admin: list all messages
router.get('/', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  res.json({ messages });
});

// PATCH /api/contact/:id/read — admin: toggle read/unread
router.patch('/:id/read', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  const msg = db.prepare('SELECT id, status FROM contact_messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const newStatus = msg.status === 'read' ? 'unread' : 'read';
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(newStatus, msg.id);
  res.json({ status: newStatus });
});

// DELETE /api/contact/:id — admin: delete message
router.delete('/:id', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

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
