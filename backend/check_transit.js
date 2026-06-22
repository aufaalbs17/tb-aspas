const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'aspas',
  password: 'sir7wdc',
  port: 5432,
});

async function run() {
  const query = `
    SELECT k5.nama_halte as h5, k6.nama_halte as h6, ST_Distance(k5.geom::geography, k6.geom::geography) as dist
    FROM kordinat_k5_k6 k5
    CROSS JOIN kordinat_k5_k6 k6
    WHERE k5.koridor = 'K5' AND k6.koridor = 'K6'
    ORDER BY dist ASC
    LIMIT 5;
  `;
  const res = await pool.query(query);
  console.log(res.rows);
  pool.end();
}
run().catch(console.error);
