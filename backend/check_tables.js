const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'aspas', password: 'sir7wdc', port: 5432 });
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
  .then(res => { console.log(res.rows); pool.end(); });
