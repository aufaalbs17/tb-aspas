const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: 'localhost', database: 'aspas', password: 'sir7wdc', port: 5432 });
pool.query("SELECT id_0, nama_halte, urutan_halte FROM kordinat_k5_k6 WHERE koridor='K6' ORDER BY urutan_halte ASC LIMIT 10")
  .then(res => { console.log(res.rows); pool.end(); });
