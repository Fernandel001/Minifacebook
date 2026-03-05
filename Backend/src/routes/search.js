const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// ─── RECHERCHE GLOBALE ────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { q, filter } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Paramètre de recherche manquant' });
  }

  const search = `%${q.trim()}%`;

  try {
    let people = [];
    let posts = [];

    // ── Recherche de personnes ──────────────────────────────────────────────
    if (!filter || filter === 'people') {
      const result = await pool.query(`
        SELECT
          u.id, u.name, u.avatar, u.bio,
          CASE
            WHEN f.status = 'accepted' THEN 'friends'
            WHEN f.status = 'pending' AND f.requester_id = $1 THEN 'pending_sent'
            WHEN f.status = 'pending' AND f.receiver_id = $1 THEN 'pending_received'
            ELSE 'none'
          END AS relation
        FROM users u
        LEFT JOIN friendships f
          ON (f.requester_id = $1 AND f.receiver_id = u.id)
          OR (f.receiver_id = $1 AND f.requester_id = u.id)
        WHERE u.id != $1
          AND u.name ILIKE $2
        ORDER BY
          CASE WHEN f.status = 'accepted' THEN 0 ELSE 1 END,
          u.name ASC
        LIMIT 20
      `, [userId, search]);

      people = result.rows;
    }

    // ── Recherche dans les publications ─────────────────────────────────────
    if (!filter || filter === 'posts') {
      const result = await pool.query(`
        SELECT
          p.id, p.content, p.created_at,
          u.id AS author_id, u.name AS author_name, u.avatar AS author_avatar,
          COUNT(DISTINCT l.id) AS likes_count,
          COUNT(DISTINCT c.id) AS comments_count,
          ARRAY_AGG(DISTINCT pi.url) FILTER (WHERE pi.url IS NOT NULL) AS images
        FROM posts p
        JOIN users u ON u.id = p.author_id
        LEFT JOIN likes l ON l.post_id = p.id
        LEFT JOIN comments c ON c.post_id = p.id
        LEFT JOIN post_images pi ON pi.post_id = p.id
        WHERE p.content ILIKE $2
          AND (
            p.author_id = $1
            OR p.author_id IN (
              SELECT CASE
                WHEN requester_id = $1 THEN receiver_id
                ELSE requester_id
              END
              FROM friendships
              WHERE (requester_id = $1 OR receiver_id = $1)
                AND status = 'accepted'
            )
          )
        GROUP BY p.id, u.id, u.name, u.avatar
        ORDER BY p.created_at DESC
        LIMIT 20
      `, [userId, search]);

      posts = result.rows;
    }

    res.json({
      query: q,
      filter: filter || 'all',
      results: { people, posts }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;