const { io } = require('socket.io-client');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IlfDqXJpIEJvbmkiLCJhdmF0YXIiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJSUVkNllFSGtnLWRDZmxLTHhEQ1hIZmpFcHVkdE4tc3ZjbzBVZ0oydXp3NXNreENOSj1zOTYtYyIsImlhdCI6MTc3MjgxMjUxNCwiZXhwIjoxNzczNDE3MzE0fQ.-45xCD-1eii-dFDi6MkhOilO4Fk2kmZYSFZj6fgLj_Q';

const socket = io('https://minifacebook-backend-production.up.railway.app', {
  auth: { token: TOKEN }
});

socket.on('connect', () => {
  console.log('✅ Socket connecté en prod :', socket.id);
  socket.emit('join_conversation', 1);

  setTimeout(() => {
    socket.emit('send_message', {
      conversationId: 1,
      content: 'Test socket en production !'
    });
  }, 1000);
});

socket.on('new_message', (msg) => {
  console.log('📨 Message reçu en prod :', msg);
});

socket.on('connect_error', (err) => {
  console.error('❌ Erreur :', err.message);
});