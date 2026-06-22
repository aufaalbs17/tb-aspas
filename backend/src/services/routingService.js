const db = require('../config/database');

exports.findNearestHalte = async (lon, lat, koridor = null) => {
  let query = `
    SELECT id_0 as id, nama_halte, koridor, urutan_halte, ST_AsGeoJSON(geom) as geometry,
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
    return null;
  } catch (error) {
    console.error('DB Error findNearestHalte:', error.message);
    throw error;
  }
};

exports.findOptimalHaltePair = async (startLon, startLat, endLon, endLat, koridor) => {
  // Cari 5 halte terdekat dari start dan 5 dari end
  // Lalu evaluasi kombinasi yang h1.urutan_halte <= h2.urutan_halte
  // dan meminimalkan (walk * 5 + busStops * 200)
  
  const queryStart = `
    SELECT id_0 as id, nama_halte, urutan_halte, ST_AsGeoJSON(geom) as geometry,
    ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS jarak_meter
    FROM kordinat_k5_k6 WHERE koridor = $3
    ORDER BY jarak_meter ASC LIMIT 20;
  `;
  const queryEnd = `
    SELECT id_0 as id, nama_halte, urutan_halte, ST_AsGeoJSON(geom) as geometry,
    ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS jarak_meter
    FROM kordinat_k5_k6 WHERE koridor = $3
    ORDER BY jarak_meter ASC LIMIT 20;
  `;

  try {
    const resStart = await db.query(queryStart, [startLon, startLat, koridor]);
    const resEnd = await db.query(queryEnd, [endLon, endLat, koridor]);

    let bestPair = null;
    let bestScore = Infinity;

    const minMaxRes = await db.query('SELECT MIN(urutan_halte) as min_u, MAX(urutan_halte) as max_u FROM kordinat_k5_k6 WHERE koridor = $1', [koridor]);
    const min_u = minMaxRes.rows[0].min_u || 10;
    const max_u = minMaxRes.rows[0].max_u || 500;

    for (let h1 of resStart.rows) {
      for (let h2 of resEnd.rows) {
        let busStops = 0;
        if (h1.urutan_halte <= h2.urutan_halte) {
          busStops = (h2.urutan_halte - h1.urutan_halte) / 10;
        } else {
          // Wrap around: dari h1 ke ujung akhir (max_u), lalu dari ujung awal (min_u) ke h2
          busStops = ((max_u - h1.urutan_halte) / 10) + ((h2.urutan_halte - min_u) / 10) + 1;
        }
        
        // Score = penalty jalan kaki ekstrim (10x) + perkiraan waktu bus ringan (100)
        const score = (h1.jarak_meter + h2.jarak_meter) * 10 + (busStops * 100);
        if (score < bestScore) {
          bestScore = score;
          bestPair = { startHalte: h1, endHalte: h2 };
        }
      }
    }
    return bestPair;
  } catch (error) {
    console.error('DB Error findOptimalHaltePair:', error.message);
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
    SELECT id_0 as id, nama_halte, koridor, urutan_halte, ST_AsGeoJSON(geom) as geometry
    FROM kordinat_k5_k6
    ORDER BY koridor ASC, urutan_halte ASC;
  `;
  const result = await db.query(query);
  return result.rows;
};

exports.getHaltesSequence = async (koridor, startUrutan, endUrutan) => {
  if (startUrutan <= endUrutan) {
    const query = `
      SELECT ST_AsGeoJSON(geom) as geometry
      FROM kordinat_k5_k6
      WHERE koridor = $1 AND urutan_halte >= $2 AND urutan_halte <= $3
      ORDER BY urutan_halte ASC;
    `;
    const result = await db.query(query, [koridor, startUrutan, endUrutan]);
    return result.rows.map(row => JSON.parse(row.geometry).coordinates);
  } else {
    // Bus berputar di rute sirkular (start > end)
    // Ambil dari start sampai ujung maksimum, lalu disambung dari ujung minimum sampai end.
    const query1 = `
      SELECT ST_AsGeoJSON(geom) as geometry, urutan_halte
      FROM kordinat_k5_k6
      WHERE koridor = $1 AND urutan_halte >= $2
      ORDER BY urutan_halte ASC;
    `;
    const query2 = `
      SELECT ST_AsGeoJSON(geom) as geometry, urutan_halte
      FROM kordinat_k5_k6
      WHERE koridor = $1 AND urutan_halte <= $2
      ORDER BY urutan_halte ASC;
    `;
    const res1 = await db.query(query1, [koridor, startUrutan]);
    const res2 = await db.query(query2, [koridor, endUrutan]);
    
    // Gabungkan urutan: maju sampai mentok, lalu maju lagi dari awal
    const rows = res1.rows.concat(res2.rows);
    return rows.map(row => JSON.parse(row.geometry).coordinates);
  }
};

exports.createHalte = async (nama_halte, koridor, lon, lat, position) => {
  let newUrutan = 10;
  
  // Ambil semua halte di koridor terkait untuk menentukan urutan
  const resHaltes = await db.query('SELECT id_0, urutan_halte FROM kordinat_k5_k6 WHERE koridor = $1 ORDER BY urutan_halte ASC', [koridor]);
  const haltes = resHaltes.rows;
  
  if (haltes.length > 0) {
    if (position === 'first') {
      // Geser semua halte ke atas
      await db.query('UPDATE kordinat_k5_k6 SET urutan_halte = urutan_halte + 10 WHERE koridor = $1', [koridor]);
      newUrutan = 10;
    } else if (position && position.startsWith('after_')) {
      const refId = parseInt(position.split('_')[1]);
      const refHalte = haltes.find(h => h.id_0 === refId);
      if (refHalte) {
        // Geser halte-halte setelahnya
        await db.query('UPDATE kordinat_k5_k6 SET urutan_halte = urutan_halte + 10 WHERE koridor = $1 AND urutan_halte > $2', [koridor, refHalte.urutan_halte]);
        newUrutan = refHalte.urutan_halte + 10;
      } else {
        newUrutan = haltes[haltes.length - 1].urutan_halte + 10;
      }
    } else {
      newUrutan = haltes[haltes.length - 1].urutan_halte + 10;
    }
  }

  const query = `
    INSERT INTO kordinat_k5_k6 (nama_halte, koridor, geom, urutan_halte) 
    VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5)
    RETURNING id_0 as id, nama_halte, koridor, urutan_halte, ST_AsGeoJSON(geom) as geometry;
  `;
  const result = await db.query(query, [nama_halte, koridor, lon, lat, newUrutan]);
  return result.rows[0];
};

exports.updateHalte = async (id, nama_halte, koridor, lon, lat) => {
  const query = `
    UPDATE kordinat_k5_k6 
    SET nama_halte = $1, koridor = $2, geom = ST_SetSRID(ST_MakePoint($3, $4), 4326)
    WHERE id_0 = $5
    RETURNING id_0 as id, nama_halte, koridor, ST_AsGeoJSON(geom) as geometry;
  `;
  const result = await db.query(query, [nama_halte, koridor, lon, lat, id]);
  return result.rows[0];
};

exports.deleteHalte = async (id) => {
  const query = `
    DELETE FROM kordinat_k5_k6 
    WHERE id_0 = $1
    RETURNING id_0 as id;
  `;
  const result = await db.query(query, [id]);
  return result.rows[0];
};

exports.findTransitPairs = async (k1, k2, maxDist = 500) => {
  try {
    const query = `
      SELECT 
        h1.id_0 as id1, h1.nama_halte as nama1, h1.urutan_halte as urutan1, ST_AsGeoJSON(h1.geom) as geom1,
        h2.id_0 as id2, h2.nama_halte as nama2, h2.urutan_halte as urutan2, ST_AsGeoJSON(h2.geom) as geom2,
        ST_Distance(h1.geom::geography, h2.geom::geography) as dist
      FROM kordinat_k5_k6 h1
      CROSS JOIN kordinat_k5_k6 h2
      WHERE h1.koridor = $1 AND h2.koridor = $2
      AND ST_Distance(h1.geom::geography, h2.geom::geography) <= $3
      ORDER BY dist ASC;
    `;
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
