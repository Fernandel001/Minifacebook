const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    proxy:true,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const { id, displayName, photos } = profile;
      const avatar = photos?.[0]?.value || null;

      // Vérifie si l'user existe déjà
      let result = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [id]
      );

      let user;

      if (result.rows.length === 0) {
        // Nouvel utilisateur → on le crée
        const insert = await pool.query(
          'INSERT INTO users (google_id, name, avatar) VALUES ($1, $2, $3) RETURNING *',
          [id, displayName, avatar]
        );
        user = insert.rows[0];
        console.log('✅ Nouvel utilisateur créé :', user.name);
      } else {
        // Utilisateur existant
        user = result.rows[0];
        console.log('✅ Utilisateur connecté :', user.name);
      }

      return done(null, user);
    } catch (err) {
      console.error('❌ Erreur Passport :', err);
      return done(err, null);
    }
  }
));

module.exports = passport;