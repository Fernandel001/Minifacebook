const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log('✅ PostgreSQL connecté'))
  .catch((err) => console.error('❌ Erreur PostgreSQL :', err));

module.exports = pool;