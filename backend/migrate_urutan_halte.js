require('dotenv').config();
const db = require('./src/config/database');

async function migrate() {
  try {
    console.log('Adding urutan_halte column if not exists...');
    await db.query(`ALTER TABLE kordinat_k5_k6 ADD COLUMN IF NOT EXISTS urutan_halte INTEGER;`);
    
    console.log('Fetching existing haltes...');
    const result = await db.query('SELECT id_0, koridor FROM kordinat_k5_k6 ORDER BY id_0 ASC');
    const haltes = result.rows;
    
    const koridorCounts = {};
    
    console.log('Updating urutan_halte for existing haltes...');
    for (const halte of haltes) {
      if (!koridorCounts[halte.koridor]) koridorCounts[halte.koridor] = 1;
      
      const urutan = koridorCounts[halte.koridor] * 10;
      
      await db.query('UPDATE kordinat_k5_k6 SET urutan_halte = $1 WHERE id_0 = $2', [urutan, halte.id_0]);
      
      koridorCounts[halte.koridor]++;
    }
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
