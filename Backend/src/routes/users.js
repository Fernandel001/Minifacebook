const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// ─── VOIR UN PROFIL PUBLIC ────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id);

  try {
    // Infos publiques de l'utilisateur
    const userResult = await pool.query(
      'SELECT id, name, avatar, bio, created_at FROM users WHERE id = $1',
      [targetId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const user = userResult.rows[0];

    // Statut de la relation entre les deux users
    const friendshipResult = await pool.query(`
      SELECT status,
        CASE WHEN requester_id = $1 THEN 'sent' ELSE 'received' END AS direction
      FROM friendships
      WHERE (requester_id = $1 AND receiver_id = $2)
        OR (requester_id = $2 AND receiver_id = $1)
    `, [userId, targetId]);

    let relationStatus = 'none'; // none | pending_sent | pending_received | friends

    if (friendshipResult.rows.length > 0) {
      const { status, direction } = friendshipResult.rows[0];
      if (status === 'accepted') relationStatus = 'friends';
      else if (direction === 'sent') relationStatus = 'pending_sent';
      else relationStatus = 'pending_received';
    }

    // Nombre d'amis
    const friendsCount = await pool.query(`
      SELECT COUNT(*) FROM friendships
      WHERE (requester_id = $1 OR receiver_id = $1)
        AND status = 'accepted'
    `, [targetId]);

    res.json({
      ...user,
      relation: relationStatus,
      friends_count: parseInt(friendsCount.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── MODIFIER SON PROFIL ──────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const targetId = parseInt(req.params.id);

  if (userId !== targetId) {
    return res.status(403).json({ error: 'Non autorisé' });
  }

  const { name, bio, avatar } = req.body;

  try {
    const result = await pool.query(`
      UPDATE users
      SET
        name = COALESCE($1, name),
        bio = COALESCE($2, bio),
        avatar = COALESCE($3, avatar)
      WHERE id = $4
      RETURNING id, name, avatar, bio, created_at
    `, [name, bio, avatar, userId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;