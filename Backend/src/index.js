const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const jwt = require('jsonwebtoken');
require('dotenv').config();
require('./config/db');
require('./config/passport');
const pool = require('./config/db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  }
});
app.set('io', io);

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/posts', require('./routes/posts'));
app.use('/friends', require('./routes/friends'));
app.use('/search', require('./routes/search'));
app.use('/messages', require('./routes/messages'));

app.get('/', (req, res) => {
  res.json({ message: '🚀 API MiniFacebook en ligne' });
});

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────
const onlineUsers = new Map(); // userId → socketId

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Token manquant'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Token invalide'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  onlineUsers.set(userId, socket.id);
  console.log(`✅ User ${userId} connecté (socket: ${socket.id})`);

  // Notifie tout le monde que ce user est en ligne
  io.emit('user_online', { userId });

  // ── Rejoindre une conversation ──────────────────────────────────────────
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });

  // ── Envoyer un message ──────────────────────────────────────────────────
  socket.on('send_message', async ({ conversationId, content }) => {

    try {
      // Vérifie que le user fait partie de la conversation
      const participant = await pool.query(
        'SELECT * FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (participant.rows.length === 0) return;

      // Sauvegarde le message en DB
      const result = await pool.query(
        'INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
        [conversationId, userId, content]
      );

      const message = result.rows[0];

      // Envoie le message à tous les membres de la conversation
      io.to(`conversation_${conversationId}`).emit('new_message', {
        ...message,
        sender_id: userId,
      });

      // Met à jour le last_message de la conversation
      await pool.query(
        'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
        [conversationId]
      );
    } catch (err) {
      console.error('Erreur send_message:', err);
    }
  });

  // ── Marquer les messages comme lus ─────────────────────────────────────
  socket.on('mark_read', async ({ conversationId }) => {

    try {
      await pool.query(`
        UPDATE messages
        SET is_read = TRUE
        WHERE conversation_id = $1
          AND sender_id != $2
          AND is_read = FALSE
      `, [conversationId, userId]);

      io.to(`conversation_${conversationId}`).emit('message_read', {
        conversationId,
        readBy: userId,
      });
    } catch (err) {
      console.error('Erreur mark_read:', err);
    }
  });

  // ── Déconnexion ─────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('user_offline', { userId });
    console.log(`❌ User ${userId} déconnecté`);
  });
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});