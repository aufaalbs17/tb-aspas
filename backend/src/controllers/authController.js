const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'transpd_secret_key_2024';

// Inisialisasi tabel admin_users jika belum ada
async function initAdminTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Buat user default "admin" jika tabel masih kosong
  const check = await db.query('SELECT COUNT(*) FROM admin_users');
  if (parseInt(check.rows[0].count) === 0) {
    const defaultPass = await bcrypt.hash('admin123', 10);
    await db.query(
      'INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)',
      ['admin', defaultPass]
    );
    console.log('[Auth] Default admin user created: username=admin, password=admin123');
  }
}

initAdminTable().catch(err => console.error('[Auth] Error initializing admin table:', err));

// POST /api/auth/login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password diperlukan' });
  }

  try {
    const result = await db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Middleware untuk verifikasi JWT
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Akses ditolak: token tidak ditemukan' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token tidak valid atau sudah expired' });
  }
};
