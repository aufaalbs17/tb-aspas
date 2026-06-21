const db = require('../config/database');

exports.findNearestHalte = async (lon, lat, koridor = null) => {
  let query = `
    SELECT 
      id_0 as id, 
      nama_halte, 
      koridor,
      ST_AsGeoJSON(geom) as geometry,
      ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS jarak_meter
    FROM kordinat_k5_k6
  `;
  
  const params = [lon, lat];

  if (koridor) {
    query += ` WHERE koridor = $3 `;
    params.push(koridor);
  }

  query += `
    ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)
    LIMIT 1;
  `;
  
  try {
    const result = await db.query(query, params);
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Fallback if table is somehow empty
    return null;
  } catch (error) {
    console.error('DB Error:', error.message);
    throw error;
  }
};

exports.getBusRoute = async (startHalteId, endHalteId) => {
  // Ambil koordinat halte awal dan akhir beserta jarak di antara keduanya
  const query = `
    SELECT 
      ST_AsGeoJSON(geom1) as geom1,
      ST_AsGeoJSON(geom2) as geom2,
      ST_Distance(geom1::geography, geom2::geography) as jarak_meter
    FROM (
      SELECT 
        (SELECT geom FROM kordinat_k5_k6 WHERE id_0 = $1 LIMIT 1) as geom1,
        (SELECT geom FROM kordinat_k5_k6 WHERE id_0 = $2 LIMIT 1) as geom2
    ) as subquery
  `;
  const result = await db.query(query, [startHalteId, endHalteId]);
  
  let coords = [];
  let dist = 0;
  if (result.rows.length > 0 && result.rows[0].geom1 && result.rows[0].geom2) {
    const startCoord = JSON.parse(result.rows[0].geom1).coordinates;
    const endCoord = JSON.parse(result.rows[0].geom2).coordinates;
    coords = [startCoord, endCoord];
    dist = result.rows[0].jarak_meter;
  } else {
    coords = [[100.3658, -0.9471], [100.3700, -0.9420]]; // dummy
    dist = 5000;
  }

  // Tarik garis lurus (sebagai simulasi) dari halte awal ke halte akhir
  return {
    koridor: '5/6',
    jarak_meter: dist,
    geometry: JSON.stringify({
      type: 'LineString',
      coordinates: coords
    })
  };
};

exports.getAllHaltes = async () => {
  const query = `
    SELECT id_0 as id, nama_halte, koridor, ST_AsGeoJSON(geom) as geometry
    FROM kordinat_k5_k6;
  `;
  const result = await db.query(query);
  return result.rows;
};
