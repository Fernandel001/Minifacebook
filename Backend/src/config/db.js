const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => console.log("✅ PostgreSQL connecté"))
  .catch(err => console.error("❌ Erreur PostgreSQL :", err));

module.exports = pool;