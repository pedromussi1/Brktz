const express = require('express');
const db = require('../db');
const { optionalAuth, requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — admin: list all users
router.get('/', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  const users = db.prepare('SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC').all();
  res.json({ users });
});

// DELETE /api/users/:id — admin: delete a user
router.delete('/:id', requireAuth, (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: 'Forbidden' });
  const targetId = parseInt(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ success: true });
});

// GET /api/users/:username — public profile
router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const quizRows = db.prepare("SELECT * FROM quizzes WHERE creator_id = ? AND visibility = 'public' ORDER BY created_at DESC").all(user.id);

  const totalPlays = db.prepare('SELECT COALESCE(SUM(plays), 0) as total FROM quizzes WHERE creator_id = ?').get(user.id).total;
  const totalLikes = db.prepare(`
    SELECT COUNT(*) as total FROM likes l
    JOIN quizzes q ON l.quiz_id = q.id
    WHERE q.creator_id = ?
  `).get(user.id).total;

  const quizzes = quizRows.map(row => {
    const items = db.prepare('SELECT * FROM quiz_items WHERE quiz_id = ? ORDER BY position').all(row.id);
    const likeCount = db.prepare('SELECT COUNT(*) as cnt FROM likes WHERE quiz_id = ?').get(row.id).cnt;
    const liked = req.user?.id
      ? !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND quiz_id = ?').get(req.user.id, row.id)
      : false;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      creator: user.username,
      creator_id: row.creator_id,
      type: row.item_type,
      category: row.category,
      thumbnail: row.thumbnail,
      plays: row.plays,
      likes: likeCount,
      liked,
      createdAt: new Date(row.created_at + 'Z').getTime(),
      items: items.map(it => ({ id: it.id, name: it.name, image: it.image_url || '', video: it.video_url || '' })),
    };
  });

  res.json({
    username: user.username,
    joinedAt: new Date(user.created_at + 'Z').getTime(),
    quizzesCount: quizRows.length,
    totalPlays,
    totalLikes,
    quizzes,
  });
});

module.exports = router;
