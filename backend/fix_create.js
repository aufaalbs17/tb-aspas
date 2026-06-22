const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const targetCode = `    if (!nama_halte || !koridor || !lon || !lat) {
      return res.status(400).json({ error: 'Semua field (nama_halte, koridor, lon, lat) harus diisi' });`;

const newCode = `  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data halte' });
  }
};

exports.createHalte = async (req, res) => {
  try {
    const { nama_halte, koridor, lon, lat, position } = req.body;
    if (!nama_halte || !koridor || !lon || !lat) {
      return res.status(400).json({ error: 'Semua field (nama_halte, koridor, lon, lat) harus diisi' });
    }
    if (!isInBounds(lon, lat)) {
      return res.status(400).json({ error: 'Koordinat halte berada di luar wilayah layanan Trans Padang.' });
    }
    const newHalte = await routingService.createHalte(nama_halte, koridor, lon, lat, position);
    res.status(201).json(newHalte);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menambahkan halte' });
  }
};

exports.updateHalte = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_halte, koridor, lon, lat } = req.body;
    if (!nama_halte || !koridor || !lon || !lat) {
      return res.status(400).json({ error: 'Semua field (nama_halte, koridor, lon, lat) harus diisi' });`;

code = code.replace(targetCode, newCode);
fs.writeFileSync('src/controllers/routeController.js', code);
