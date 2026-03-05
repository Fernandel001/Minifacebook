const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// ─── ENVOYER UNE DEMANDE D'AMI ────────────────────────────────────────────────
router.post('/request/:id', auth, async (req, res) => {
  const requesterId = req.user.id;
  const receiverId = parseInt(req.params.id);

  if (requesterId === receiverId) {
    return res.status(400).json({ error: 'Vous ne pouvez pas vous ajouter vous-même' });
  }

  try {
    // Vérifie si une demande existe déjà dans un sens ou dans l'autre
    const existing = await pool.query(`
      SELECT id FROM friendships
      WHERE (requester_id = $1 AND receiver_id = $2)
        OR (requester_id = $2 AND receiver_id = $1)
    `, [requesterId, receiverId]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Une demande existe déjà' });
    }

    const result = await pool.query(
      'INSERT INTO friendships (requester_id, receiver_id, status) VALUES ($1, $2, $3) RETURNING *',
      [requesterId, receiverId, 'pending']
    );

    res.status(201).json({ message: 'Demande envoyée', friendship: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── ACCEPTER UNE DEMANDE D'AMI ───────────────────────────────────────────────
router.put('/accept/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const requesterId = parseInt(req.params.id);

  try {
    const result = await pool.query(`
      UPDATE friendships
      SET status = 'accepted'
      WHERE requester_id = $1 AND receiver_id = $2 AND status = 'pending'
      RETURNING *
    `, [requesterId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    res.json({ message: 'Demande acceptée', friendship: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── REJETER OU SUPPRIMER UN AMI ─────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id);

  try {
    const result = await pool.query(`
      DELETE FROM friendships
      WHERE (requester_id = $1 AND receiver_id = $2)
        OR (requester_id = $2 AND receiver_id = $1)
      RETURNING *
    `, [userId, targetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relation introuvable' });
    }

    res.json({ message: 'Relation supprimée' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── LISTE DES AMIS + DEMANDES REÇUES ────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;

  try {
    // Amis confirmés
    const friends = await pool.query(`
      SELECT 
        u.id, u.name, u.avatar,
        f.created_at AS friends_since
      FROM friendships f
      JOIN users u ON u.id = CASE 
        WHEN f.requester_id = $1 THEN f.receiver_id 
        ELSE f.requester_id 
      END
      WHERE (f.requester_id = $1 OR f.receiver_id = $1)
        AND f.status = 'accepted'
      ORDER BY f.created_at DESC
    `, [userId]);

    // Demandes reçues en attente
    const received = await pool.query(`
      SELECT 
        u.id, u.name, u.avatar,
        f.id AS friendship_id,
        f.created_at
      FROM friendships f
      JOIN users u ON u.id = f.requester_id
      WHERE f.receiver_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [userId]);

    // Demandes envoyées en attente
    const sent = await pool.query(`
      SELECT 
        u.id, u.name, u.avatar,
        f.id AS friendship_id,
        f.created_at
      FROM friendships f
      JOIN users u ON u.id = f.receiver_id
      WHERE f.requester_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json({
      friends: friends.rows,
      received: received.rows,
      sent: sent.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;