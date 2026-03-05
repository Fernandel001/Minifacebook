const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// ─── LISTE DES CONVERSATIONS ──────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(`
      SELECT
        c.id AS conversation_id,
        c.updated_at,
        u.id AS other_user_id,
        u.name AS other_user_name,
        u.avatar AS other_user_avatar,
        m.content AS last_message,
        m.created_at AS last_message_at,
        m.is_read,
        m.sender_id AS last_sender_id,
        COUNT(unread.id) AS unread_count
      FROM conversations c
      JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = $1
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id != $1
      JOIN users u ON u.id = cp2.user_id
      LEFT JOIN LATERAL (
        SELECT * FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON TRUE
      LEFT JOIN messages unread ON unread.conversation_id = c.id
        AND unread.sender_id != $1
        AND unread.is_read = FALSE
      GROUP BY c.id, c.updated_at, u.id, u.name, u.avatar,
               m.content, m.created_at, m.is_read, m.sender_id
      ORDER BY c.updated_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── DÉMARRER OU RÉCUPÉRER UNE CONVERSATION ───────────────────────────────────
router.post('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { targetId } = req.body;

  if (!targetId) return res.status(400).json({ error: 'targetId manquant' });
  if (userId === parseInt(targetId)) return res.status(400).json({ error: 'Impossible de vous écrire à vous-même' });

  try {
    // Vérifie si une conversation existe déjà entre les deux
    const existing = await pool.query(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = $1
      JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = $2
    `, [userId, targetId]);

    if (existing.rows.length > 0) {
      return res.json({ conversation_id: existing.rows[0].id, existing: true });
    }

    // Crée la conversation
    const conv = await pool.query(
      'INSERT INTO conversations DEFAULT VALUES RETURNING *'
    );
    const conversationId = conv.rows[0].id;

    // Ajoute les deux participants
    await pool.query(
      'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
      [conversationId, userId, targetId]
    );

    res.status(201).json({ conversation_id: conversationId, existing: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── MESSAGES D'UNE CONVERSATION ─────────────────────────────────────────────
router.get('/:conversationId', auth, async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;

  try {
    // Vérifie que le user fait partie de la conversation
    const participant = await pool.query(
      'SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const messages = await pool.query(`
      SELECT
        m.*,
        u.name AS sender_name,
        u.avatar AS sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [conversationId]);

    res.json(messages.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;