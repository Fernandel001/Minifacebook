const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth'); // 👈 Import remonté ici
require('dotenv').config();

// ─── LANCER LE FLOW OAUTH GOOGLE ─────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// ─── CALLBACK APRÈS AUTHENTIFICATION GOOGLE ──────────────────────────────
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failed', session: false }),
  (req, res) => {
    // Création du token
    const token = jwt.sign(
      { id: req.user.id, name: req.user.name, avatar: req.user.avatar },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // On envoie le token dans un cookie sécurisé
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
      sameSite: 'lax',
    });

    // Redirige vers le frontend avec token + user dans l'URL
    const userData = encodeURIComponent(JSON.stringify({
      id: req.user.id,
      name: req.user.name,
      avatar: req.user.avatar,
    }));

    res.redirect(`${process.env.CLIENT_URL}/login?token=${token}&user=${userData}`);
    
  }
);

// ─── GESTION DES ÉCHECS ──────────────────────────────────────────────────
router.get('/failed', (req, res) => {
  res.status(401).json({ error: 'Échec de la connexion Google' });
});

// ─── DÉCONNEXION ──────────────────
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Déconnecté avec succès' });
});

// ─── RÉCUPÉRER L'UTILISATEUR CONNECTÉ 
router.get('/me', auth, (req, res) => {
  // Le middleware 'auth' a déjà vérifié le token et mis l'utilisateur dans req.user
  res.json(req.user);
});

module.exports = router;