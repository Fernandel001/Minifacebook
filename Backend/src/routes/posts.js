const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { upload } = require('../config/cloudinary');

// ─── CRÉER UNE PUBLICATION ───────────────────────────────────────────────────
router.post('/', auth, upload.array('images', 5), async (req, res) => {
  const { content } = req.body;
  const authorId = req.user.id;

  if (!content && (!req.files || req.files.length === 0)) {
    return res.status(400).json({ error: 'Une publication ne peut pas être vide' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO posts (author_id, content) VALUES ($1, $2) RETURNING *',
      [authorId, content || null]
    );
    const post = result.rows[0];

    // Sauvegarde les images si présentes
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await pool.query(
          'INSERT INTO post_images (post_id, url) VALUES ($1, $2)',
          [post.id, file.path]
        );
      }
    }

    // Retourne le post avec ses images
    const images = await pool.query(
      'SELECT url FROM post_images WHERE post_id = $1',
      [post.id]
    );

    res.status(201).json({ ...post, images: images.rows.map(i => i.url) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── FIL D'ACTUALITÉ ─────────────────────────────────────────────────────────
router.get('/feed', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        u.name AS author_name,
        u.avatar AS author_avatar,
        COUNT(DISTINCT l.id) AS likes_count,
        COUNT(DISTINCT c.id) AS comments_count,
        ARRAY_AGG(DISTINCT pi.url) FILTER (WHERE pi.url IS NOT NULL) AS images,
        EXISTS (
          SELECT 1 FROM likes 
          WHERE post_id = p.id AND user_id = $1
        ) AS liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.author_id
      LEFT JOIN likes l ON l.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN post_images pi ON pi.post_id = p.id
      WHERE p.author_id = $1
        OR p.author_id IN (
          SELECT CASE 
            WHEN requester_id = $1 THEN receiver_id 
            ELSE requester_id 
          END
          FROM friendships
          WHERE (requester_id = $1 OR receiver_id = $1)
            AND status = 'accepted'
        )
      GROUP BY p.id, u.name, u.avatar
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── VOIR LES POSTS D'UN PROFIL ──────────────────────────────────────────────
router.get('/user/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id);

  try {
    // Vérifie si les deux users sont amis
    const friendship = await pool.query(`
      SELECT id FROM friendships
      WHERE ((requester_id = $1 AND receiver_id = $2)
        OR (requester_id = $2 AND receiver_id = $1))
        AND status = 'accepted'
    `, [userId, targetId]);

    const isFriend = friendship.rows.length > 0 || userId === targetId;

    if (!isFriend) {
      return res.status(403).json({ error: 'Vous devez être ami pour voir les publications' });
    }

    const result = await pool.query(`
      SELECT 
        p.*,
        u.name AS author_name,
        u.avatar AS author_avatar,
        COUNT(DISTINCT l.id) AS likes_count,
        COUNT(DISTINCT c.id) AS comments_count,
        ARRAY_AGG(DISTINCT pi.url) FILTER (WHERE pi.url IS NOT NULL) AS images,
        EXISTS (
          SELECT 1 FROM likes 
          WHERE post_id = p.id AND user_id = $1
        ) AS liked_by_me
      FROM posts p
      JOIN users u ON u.id = p.author_id
      LEFT JOIN likes l ON l.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      LEFT JOIN post_images pi ON pi.post_id = p.id
      WHERE p.author_id = $2
      GROUP BY p.id, u.name, u.avatar
      ORDER BY p.created_at DESC
    `, [userId, targetId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── MODIFIER UNE PUBLICATION ─────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;
  const postId = req.params.id;

  try {
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);

    if (post.rows.length === 0) return res.status(404).json({ error: 'Post introuvable' });
    if (post.rows[0].author_id !== userId) return res.status(403).json({ error: 'Non autorisé' });

    const result = await pool.query(
      'UPDATE posts SET content = $1 WHERE id = $2 RETURNING *',
      [content, postId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── SUPPRIMER UNE PUBLICATION ────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const postId = req.params.id;

  try {
    const post = await pool.query('SELECT * FROM posts WHERE id = $1', [postId]);

    if (post.rows.length === 0) return res.status(404).json({ error: 'Post introuvable' });
    if (post.rows[0].author_id !== userId) return res.status(403).json({ error: 'Non autorisé' });

    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

    res.json({ message: 'Publication supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── LIKER / UNLIKER ──────────────────────────────────────────────────────────
router.post('/:id/like', auth, async (req, res) => {
  const userId = req.user.id;
  const postId = req.params.id;

  try {
    const existing = await pool.query(
      'SELECT id FROM likes WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
      return res.json({ liked: false, message: 'Like retiré' });
    }

    await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
    res.json({ liked: true, message: 'Post liké' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── COMMENTAIRES ─────────────────────────────────────────────────────────────
router.get('/:id/comments', auth, async (req, res) => {
  const postId = req.params.id;

  try {
    const result = await pool.query(`
      SELECT c.*, u.name AS author_name, u.avatar AS author_avatar
      FROM comments c
      JOIN users u ON u.id = c.author_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC
    `, [postId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:id/comments', auth, async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;
  const postId = req.params.id;

  if (!content) return res.status(400).json({ error: 'Le commentaire est vide' });

  try {
    const result = await pool.query(
      'INSERT INTO comments (post_id, author_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/comments/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const commentId = req.params.id;

  try {
    const comment = await pool.query('SELECT * FROM comments WHERE id = $1', [commentId]);

    if (comment.rows.length === 0) return res.status(404).json({ error: 'Commentaire introuvable' });
    if (comment.rows[0].author_id !== userId) return res.status(403).json({ error: 'Non autorisé' });

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ message: 'Commentaire supprimé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;