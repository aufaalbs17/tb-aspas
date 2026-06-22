const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'aspas',
  password: 'sir7wdc',
  port: 5432,
});

async function run() {
  const res = await pool.query("SELECT id_0 FROM kordinat_k5_k6 WHERE koridor = 'K6' ORDER BY id_0 ASC");
  const haltes = res.rows;
  
  let urutan = 10;
  
  for (let halte of haltes.filter(h => h.id_0 >= 31 && h.id_0 <= 44)) {
    await pool.query('UPDATE kordinat_k5_k6 SET urutan_halte = $1 WHERE id_0 = $2', [urutan, halte.id_0]);
    urutan += 10;
  }
  for (let halte of haltes.filter(h => h.id_0 >= 59 && h.id_0 <= 75)) {
    await pool.query('UPDATE kordinat_k5_k6 SET urutan_halte = $1 WHERE id_0 = $2', [urutan, halte.id_0]);
    urutan += 10;
  }
  for (let halte of haltes.filter(h => h.id_0 >= 45 && h.id_0 <= 58)) {
    await pool.query('UPDATE kordinat_k5_k6 SET urutan_halte = $1 WHERE id_0 = $2', [urutan, halte.id_0]);
    urutan += 10;
  }
  
  console.log('Fixed K6 urutan_halte');
  pool.end();
}
run().catch(console.error);
