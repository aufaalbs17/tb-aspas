const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'aspas',
  password: 'sir7wdc',
  port: 5432,
});

async function checkDb() {
  try {
    await client.connect();
    
    // Check tables
    const resTables = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';
    `);
    
    console.log("=== TABLES IN 'aspas' ===");
    resTables.rows.forEach(r => console.log(r.tablename));
    console.log("\n");

    // Check haltes
    const resHaltes = await client.query(`SELECT id, nama_halte, koridor, ST_AsText(geom) as coord FROM halte_transpadang`);
    console.log("=== DATA IN 'halte_transpadang' ===");
    console.log(`Total data: ${resHaltes.rowCount} halte\n`);
    resHaltes.rows.forEach(r => {
      console.log(`- [Koridor ${r.koridor}] ${r.nama_halte} (${r.coord})`);
    });

  } catch (err) {
    console.error("Error connecting or querying:", err.message);
  } finally {
    await client.end();
  }
}

checkDb();
