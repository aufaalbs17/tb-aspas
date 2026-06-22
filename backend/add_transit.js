const fs = require('fs');
let code = fs.readFileSync('src/services/routingService.js', 'utf8');

const newFunc = `exports.findTransitPairs = async (k1, k2, maxDist = 500) => {
  try {
    const query = \`
      SELECT 
        h1.id_0 as id1, h1.nama_halte as nama1, h1.urutan_halte as urutan1, ST_AsGeoJSON(h1.geom) as geom1,
        h2.id_0 as id2, h2.nama_halte as nama2, h2.urutan_halte as urutan2, ST_AsGeoJSON(h2.geom) as geom2,
        ST_Distance(h1.geom::geography, h2.geom::geography) as dist
      FROM kordinat_k5_k6 h1
      CROSS JOIN kordinat_k5_k6 h2
      WHERE h1.koridor = $1 AND h2.koridor = $2
      AND ST_Distance(h1.geom::geography, h2.geom::geography) <= $3
      ORDER BY dist ASC;
    \`;
    const result = await db.query(query, [k1, k2, maxDist]);
    return result.rows.map(r => ({
      halte1: { id: r.id1, nama_halte: r.nama1, urutan_halte: r.urutan1, geometry: r.geom1, koridor: k1 },
      halte2: { id: r.id2, nama_halte: r.nama2, urutan_halte: r.urutan2, geometry: r.geom2, koridor: k2 },
      transitDist: r.dist
    }));
  } catch (error) {
    console.error('DB Error findTransitPairs:', error.message);
    return [];
  }
};
`;

code += '\n' + newFunc;
fs.writeFileSync('src/services/routingService.js', code);
