require('dotenv').config();
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query('SELECT * FROM trees'))
  .then(r => console.log('Total trees:', r.rows.length, JSON.stringify(r.rows)))
  .catch(e => console.error(e.message))
  .finally(() => c.end());