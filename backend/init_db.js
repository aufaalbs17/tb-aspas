const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSetup() {
  // Gunakan kredensial default, nanti kita sesuaikan jika gagal
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'aspas',
    password: process.env.DB_PASSWORD || 'sir7wdc', // Gunakan password asli
    port: 5432,
  });

  try {
    console.log('Mencoba terhubung ke database aspas...');
    await client.connect();
    console.log('Berhasil terhubung!');

    const sqlPath = path.join(__dirname, 'db_setup.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('Menjalankan skrip db_setup.sql...');
    await client.query(sqlScript);
    console.log('Berhasil! Ekstensi PostGIS diaktifkan dan tabel halte_transpadang berhasil dibuat & diisi data dummy.');

  } catch (err) {
    console.error('Gagal menjalankan skrip SQL:', err.message);
  } finally {
    await client.end();
  }
}

runSetup();
