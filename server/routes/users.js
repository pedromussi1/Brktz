const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

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
