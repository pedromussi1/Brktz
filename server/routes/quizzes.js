const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/** Helper: format a quiz row + its items into the shape the frontend expects */
function formatQuiz(row, items, likedByUser = false) {
  const creator = row.creator_id
    ? db.prepare('SELECT username FROM users WHERE id = ?').get(row.creator_id)
    : null;
  const likeCount = db.prepare('SELECT COUNT(*) as cnt FROM likes WHERE quiz_id = ?').get(row.id).cnt;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    creator: creator ? creator.username : 'Anonymous',
    creator_id: row.creator_id,
    type: row.item_type,
    category: row.category,
    thumbnail: row.thumbnail,
    plays: row.plays,
    likes: likeCount,
    liked: likedByUser,
    createdAt: new Date(row.created_at + 'Z').getTime(),
    items: items.map(it => ({
      id: it.id,
      name: it.name,
      image: it.image_url || '',
      video: it.video_url || '',
    })),
  };
}

// GET /api/quizzes — list all public quizzes
router.get('/', optionalAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM quizzes WHERE visibility = 'public' ORDER BY created_at DESC").all();
  const userId = req.user?.id;

  const quizzes = rows.map(row => {
    const items = db.prepare('SELECT * FROM quiz_items WHERE quiz_id = ? ORDER BY position').all(row.id);
    const liked = userId
      ? !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND quiz_id = ?').get(userId, row.id)
      : false;
    return formatQuiz(row, items, liked);
  });

  res.json({ quizzes });
});

// GET /api/quizzes/mine — get current user's quizzes
router.get('/mine', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM quizzes WHERE creator_id = ? ORDER BY created_at DESC').all(req.user.id);
  const quizzes = rows.map(row => {
    const items = db.prepare('SELECT * FROM quiz_items WHERE quiz_id = ? ORDER BY position').all(row.id);
    return formatQuiz(row, items, false);
  });
  res.json({ quizzes });
});

// GET /api/quizzes/:id — get single quiz
router.get('/:id', optionalAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Quiz not found' });

  const items = db.prepare('SELECT * FROM quiz_items WHERE quiz_id = ? ORDER BY position').all(row.id);
  const liked = req.user?.id
    ? !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND quiz_id = ?').get(req.user.id, row.id)
    : false;

  res.json({ quiz: formatQuiz(row, items, liked) });
});

// POST /api/quizzes — create a new quiz
router.post('/', requireAuth, (req, res) => {
  const { title, description, type, category, thumbnail, items, shuffle, visibility, allowComments } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: 'Title must be under 200 characters' });
  }
  if (!Array.isArray(items) || items.length < 4) {
    return res.status(400).json({ error: 'At least 4 items are required' });
  }
  if (items.length > 128) {
    return res.status(400).json({ error: 'Maximum 128 items allowed' });
  }
  const validTypes = ['image', 'video', 'text'];
  const validCategories = ['kpop', 'gaming', 'entertainment', 'food', 'anime', 'other'];
  const safeType = validTypes.includes(type) ? type : 'image';
  const safeCategory = validCategories.includes(category) ? category : 'other';

  for (const item of items) {
    if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
      return res.status(400).json({ error: 'All items must have a name' });
    }
  }

  const id = uuidv4();
  db.prepare(`
    INSERT INTO quizzes (id, title, description, creator_id, item_type, category, thumbnail, shuffle, visibility, allow_comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title.trim(), (description || '').slice(0, 2000), req.user.id, safeType, safeCategory, thumbnail || '', shuffle ? 1 : 0, visibility || 'public', allowComments ? 1 : 0);

  const insertItem = db.prepare('INSERT INTO quiz_items (quiz_id, name, image_url, video_url, position) VALUES (?, ?, ?, ?, ?)');
  items.forEach((item, i) => {
    insertItem.run(id, item.name.trim().slice(0, 200), (item.image || '').slice(0, 500), (item.video || '').slice(0, 500), i);
  });

  const row = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id);
  const dbItems = db.prepare('SELECT * FROM quiz_items WHERE quiz_id = ? ORDER BY position').all(id);
  res.status(201).json({ quiz: formatQuiz(row, dbItems) });
});

// DELETE /api/quizzes/:id — delete a quiz (owner or admin)
router.delete('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Quiz not found' });
  if (row.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not authorized' });

  db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// PATCH /api/quizzes/:id — edit a quiz (owner or admin)
router.patch('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Quiz not found' });
  if (row.creator_id !== req.user.id && !req.user.is_admin) return res.status(403).json({ error: 'Not authorized' });

  const { title, description, type, category, thumbnail, items } = req.body;

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) return res.status(400).json({ error: 'Title is required' });
    if (title.length > 200) return res.status(400).json({ error: 'Title must be under 200 characters' });
  }
  if (items !== undefined) {
    if (!Array.isArray(items) || items.length < 4) return res.status(400).json({ error: 'At least 4 items are required' });
    if (items.length > 128) return res.status(400).json({ error: 'Maximum 128 items allowed' });
    for (const item of items) {
      if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
        return res.status(400).json({ error: 'All items must have a name' });
      }
    }
  }

  const validTypes = ['image', 'video', 'text'];
  const validCategories = ['kpop', 'gaming', 'entertainment', 'food', 'anime', 'other'];

  const updateQuiz = db.transaction(() => {
    db.prepare(`
      UPDATE quizzes SET
        title = ?,
        description = ?,
        item_type = ?,
        category = ?,
        thumbnail = ?
      WHERE id = ?
    `).run(
      (title || row.title).trim(),
      (description !== undefined ? description : row.description || '').slice(0, 2000),
      validTypes.includes(type) ? type : row.item_type,
      validCategories.includes(category) ? category : row.category,
      thumbnail !== undefined ? (thumbnail || '') : row.thumbnail,
      row.id
    );

    if (items) {
      db.prepare('DELETE FROM quiz_items WHERE quiz_id = ?').run(row.id);
      const insertItem = db.prepare('INSERT INTO quiz_items (quiz_id, name, image_url, video_url, position) VALUES (?, ?, ?, ?, ?)');
      items.forEach((item, i) => {
        insertItem.run(row.id, item.name.trim().slice(0, 200), (item.image || '').slice(0, 500), (item.video || '').slice(0, 500), i);
      });
    }
  });

  updateQuiz();

  const updated = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(row.id);
  const dbItems = db.prepare('SELECT * FROM quiz_items WHERE quiz_id = ? ORDER BY position').all(row.id);
  res.json({ quiz: formatQuiz(updated, dbItems) });
});

// POST /api/quizzes/:id/like — toggle like
router.post('/:id/like', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND quiz_id = ?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND quiz_id = ?').run(req.user.id, req.params.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (user_id, quiz_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    res.json({ liked: true });
  }
});

// POST /api/quizzes/:id/play — increment play count
router.post('/:id/play', (req, res) => {
  db.prepare('UPDATE quizzes SET plays = plays + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
