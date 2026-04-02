const { Pool } = require('pg');
const { dbUrl } = require('../config/env');
const pool = new Pool({
  connectionString: dbUrl,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 2000, 
});

module.exports = pool;

if (process.env.NODE_ENV !== 'test') {
  pool.connect()
    .then(() => console.log('DB connected'))
    .catch((err) => {
      console.error('DB connection error:', err.message);
      process.exit(1);
    });
}
