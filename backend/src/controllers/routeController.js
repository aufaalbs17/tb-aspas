const routingService = require('../services/routingService');

// Validasi Bounding Box Kota Padang dan sekitarnya (Lon: 99.8 - 100.7, Lat: -1.3 - -0.5)
const PADANG_BOUNDS = { minLon: 99.8, maxLon: 100.7, minLat: -1.3, maxLat: -0.5 };
const isInBounds = (lon, lat) =>
  lon >= PADANG_BOUNDS.minLon && lon <= PADANG_BOUNDS.maxLon &&
  lat >= PADANG_BOUNDS.minLat && lat <= PADANG_BOUNDS.maxLat;

// Helper untuk fetch OSRM
async function fetchOSRMRoute(lon1, lat1, lon2, lat2, profile) {
  try {
    const url = `http://router.project-osrm.org/route/v1/${profile}/${lon1},${lat1};${lon2},${lat2}?geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return {
        geometry: data.routes[0].geometry,
        distance: data.routes[0].distance,
        duration: data.routes[0].duration / 60 // in minutes
      };
    }
  } catch (e) {
    console.error("OSRM Error:", e.message);
  }
  return null;
}

// Helper untuk fetch OSRM dengan urutan banyak titik (waypoints)
async function fetchOSRMRouteSequence(coords, profile) {
  try {
    const coordsString = coords.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `http://router.project-osrm.org/route/v1/${profile}/${coordsString}?geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return {
        geometry: data.routes[0].geometry,
        distance: data.routes[0].distance,
        duration: data.routes[0].duration / 60 // in minutes
      };
    }
  } catch (e) {
    console.error("OSRM Sequence Error:", e.message);
  }
  return null;
}

// Menghitung rute untuk satu koridor spesifik
async function evaluateCorridor(koridor, startLon, startLat, endLon, endLat, osrmProfile, travelMode) {
  const haltePair = await routingService.findOptimalHaltePair(startLon, startLat, endLon, endLat, koridor);
  if (!haltePair) return null;
  
  const startHalte = haltePair.startHalte;
  const endHalte = haltePair.endHalte;
  
  if (!startHalte || !endHalte) return null;
  if (startHalte.id === endHalte.id) return null; // Jika sama, abaikan rute bus ini

  const h1Coords = JSON.parse(startHalte.geometry).coordinates;
  const h2Coords = JSON.parse(endHalte.geometry).coordinates;

  const leg1 = await fetchOSRMRoute(startLon, startLat, h1Coords[0], h1Coords[1], osrmProfile);
  
  // Ambil titik-titik halte di antara awal dan akhir sesuai urutan loop rute bus
  let busCoordsSequence = await routingService.getHaltesSequence(koridor, startHalte.urutan_halte, endHalte.urutan_halte);

  const leg2 = await fetchOSRMRoute(h2Coords[0], h2Coords[1], endLon, endLat, osrmProfile);

  // Estimasi kasar jarak dan waktu murni berdasarkan jumlah halte
  const busStops = Math.abs(startHalte.urutan_halte - endHalte.urutan_halte) / 10;
  const estimatedBusDist = Math.max(1, busStops) * 600; // 600 meter per halte
  const estimatedBusTime = Math.max(1, busStops) * 2; // 2 menit per halte

  // Paksa rute bus menjadi garis lurus antar halte (LineString) untuk menghindari OSRM muter-muter!
  let legBus = {
    geometry: { type: 'LineString', coordinates: busCoordsSequence },
    properties: { koridor: koridor },
    distance: estimatedBusDist,
    duration: estimatedBusTime
  };

  const walkDist1 = leg1 ? leg1.distance : (startHalte.jarak_meter || 0);
  const busDist = legBus.distance;
  const walkDist2 = leg2 ? leg2.distance : (endHalte.jarak_meter || 0);
  
  const totalDist = walkDist1 + busDist + walkDist2;
  
  const walkTime1 = leg1 ? leg1.duration : (walkDist1 / (travelMode==='walk'?83:500));
  const busTime = legBus.duration;
  const walkTime2 = leg2 ? leg2.duration : (walkDist2 / (travelMode==='walk'?83:500));
  const totalTime = walkTime1 + busTime + walkTime2;

  return {
    type: 'bus_route',
    koridor,
    startHalte,
    endHalte,
    leg1, legBus, leg2,
    walkDist1, busDist, walkDist2,
    walkTime1, busTime, walkTime2,
    totalDist, totalTime,
    h1Coords, h2Coords
  };
}


async function evaluateTransitCorridor(k1, k2, startLon, startLat, endLon, endLat, osrmProfile, travelMode) {
  try {
    const transitPairs = await routingService.findTransitPairs(k1, k2, 500);
    if (!transitPairs || transitPairs.length === 0) return null;

    let bestTransitOpt = null;
    let bestTransitScore = Infinity;

    for (let pair of transitPairs) {
      const t1 = pair.halte1;
      const t2 = pair.halte2;
      const t1Coords = JSON.parse(t1.geometry).coordinates;
      const t2Coords = JSON.parse(t2.geometry).coordinates;

      // K1 Leg
      const legK1 = await evaluateCorridor(k1, startLon, startLat, t1Coords[0], t1Coords[1], osrmProfile, travelMode);
      if (!legK1) continue;
      // We must force the end halte of legK1 to be t1. evaluateCorridor will naturally pick t1 because its distance to t1 is 0.

      // K2 Leg
      const legK2 = await evaluateCorridor(k2, t2Coords[0], t2Coords[1], endLon, endLat, osrmProfile, travelMode);
      if (!legK2) continue;
      // Similarly, start halte of legK2 is naturally t2.

      // Transit Walk
      const transitWalk = await fetchOSRMRoute(t1Coords[0], t1Coords[1], t2Coords[0], t2Coords[1], 'foot');
      const transitDist = transitWalk ? transitWalk.distance : pair.transitDist;
      const transitWalkTime = transitWalk ? transitWalk.duration : (transitDist / 83);

      const totalTime = legK1.totalTime + transitWalkTime + legK2.totalTime;
      const totalDist = legK1.totalDist + transitDist + legK2.totalDist;

      // Score: heavy penalty on walking
      const walkTime1 = legK1.walkTime1;
      const walkTime2 = legK2.walkTime2;
      const totalWalkTime = walkTime1 + transitWalkTime + walkTime2;
      const totalBusTime = legK1.busTime + legK2.busTime;

      const score = (totalWalkTime * 10) + totalBusTime;
      console.log('Transit score for ' + k1 + '->' + k2 + ' (via ' + t1.nama_halte + '-' + t2.nama_halte + '):', score, 'walkTime1:', walkTime1, 'walkTime2:', walkTime2, 'transitWalk:', transitWalkTime);

      if (score < bestTransitScore) {
        bestTransitScore = score;
        bestTransitOpt = {
          type: 'transit_route',
          koridors: [k1, k2],
          leg1: legK1,
          leg2: legK2,
          transitWalk: transitWalk,
          transitWalkTime,
          transitDist,
          totalTime,
          totalDist,
          score,
          t1, t2
        };
      }
    }
    return bestTransitOpt;
  } catch(e) {
    console.error(e);
    return null;
  }
}

exports.getInteractiveRoute = async (req, res) => {
  try {
    const { startLon, startLat, endLon, endLat } = req.body;

    if (!startLon || !startLat || !endLon || !endLat) {
      return res.status(400).json({ error: 'Koordinat awal dan tujuan harus diisi' });
    }

    if (!isInBounds(startLon, startLat) || !isInBounds(endLon, endLat)) {
      return res.status(400).json({ error: 'Titik awal atau tujuan berada di luar wilayah layanan Trans Padang.' });
    }

    const travelMode = 'walk'; 
    const osrmProfile = travelMode === 'walk' ? 'foot' : 'driving';

    const modeLabels = {
      walk: { text: 'Jalan kaki', icon: 'fa-person-walking', endText: 'Jalan kaki' }
    };
    const legLabel = modeLabels[travelMode] || modeLabels.walk;

    // 1. Cek rute langsung (Direct Route)
    const directRoute = await fetchOSRMRoute(startLon, startLat, endLon, endLat, osrmProfile);
    const directDist = directRoute ? directRoute.distance : 999999;
    const directTime = directRoute ? (directDist / 83) : 9999;

    // 2. Evaluasi rute Koridor K5 dan K6 (sesuai nilai di database)
    const routeK5 = await evaluateCorridor('K5', startLon, startLat, endLon, endLat, osrmProfile, travelMode);
    const routeK6 = await evaluateCorridor('K6', startLon, startLat, endLon, endLat, osrmProfile, travelMode);

    // 3. Evaluasi Transit K5 -> K6 dan K6 -> K5
    const transitK5K6 = await evaluateTransitCorridor('K5', 'K6', startLon, startLat, endLon, endLat, osrmProfile, travelMode);
    const transitK6K5 = await evaluateTransitCorridor('K6', 'K5', startLon, startLat, endLon, endLat, osrmProfile, travelMode);

    // Kumpulkan opsi rute yang valid
    const options = [];
    if (directRoute) options.push({ type: 'direct', totalDist: directDist, totalTime: directTime, route: directRoute });
    if (routeK5) options.push(routeK5);
    if (routeK6) options.push(routeK6);
    if (transitK5K6) options.push(transitK5K6);
    if (transitK6K5) options.push(transitK6K5);

    if (options.length === 0) {
       return res.status(404).json({ error: 'Rute tidak dapat ditemukan.' });
    }

    // Orang sangat tidak suka jalan kaki jauh, jadi waktu jalan kaki diberi penalti 10x lipat.
    options.forEach(opt => {
        if (opt.type === 'direct') {
            opt.score = opt.totalTime * 10;
        } else if (opt.type === 'transit_route') {
            // Score is already calculated and set in evaluateTransitCorridor
        } else {
            opt.score = ((opt.walkTime1 + opt.walkTime2) * 10) + opt.busTime;
        }
    });

    // Pilih rute dengan score terendah
    let bestOption = options[0];
    for (let opt of options) {
       if (opt.type === 'bus_route' || opt.type === 'transit_route') {
           if (directDist > 1000 && opt.totalTime < directTime * 1.5) {
               if (bestOption.type === 'direct' || opt.score < bestOption.score) {
                   bestOption = opt;
               }
           } else {
               if (opt.score < bestOption.score) {
                   bestOption = opt;
               }
           }
       } else if (opt.type === 'direct') {
           if (directDist <= 1000 && opt.score < bestOption.score) {
               bestOption = opt;
           }
       }
    }

    let summary, features;

    if (bestOption.type === 'direct') {
      summary = {
        totalDistance: (directDist / 1000).toFixed(2) + ' km',
        totalTime: Math.ceil(directTime) + ' mnt',
        steps: [
          { id: 'step-direct', icon: legLabel.icon, text: `Jarak dekat atau lebih efisien tanpa bus. Langsung ${legLabel.text.toLowerCase()} sejauh ${(directDist > 1000 ? (directDist/1000).toFixed(1)+' km' : Math.round(directDist)+' meter')} ke tujuan Anda.`, dist: (directDist > 1000 ? (directDist/1000).toFixed(1)+' km' : Math.round(directDist)+' m'), time: Math.ceil(directTime)+' mnt' }
        ]
      };
      features = [
        {
          type: 'Feature',
          properties: { id: 'step-direct', type: travelMode, description: 'Rute Langsung' },
          geometry: directRoute.geometry
        }
      ];
    } else if (bestOption.type === 'transit_route') {
      const leg1 = bestOption.leg1;
      const leg2 = bestOption.leg2;
      
      const t1Coords = JSON.parse(bestOption.t1.geometry).coordinates;
      const t2Coords = JSON.parse(bestOption.t2.geometry).coordinates;
      const leg1Geom = leg1.leg1 ? leg1.leg1.geometry : { type: 'LineString', coordinates: [[startLon, startLat], leg1.h1Coords] };
      const legBus1Geom = leg1.legBus ? leg1.legBus.geometry : { type: 'LineString', coordinates: [leg1.h1Coords, t1Coords] };
      const transitWalkGeom = bestOption.transitWalk ? bestOption.transitWalk.geometry : { type: 'LineString', coordinates: [t1Coords, t2Coords] };
      const legBus2Geom = leg2.legBus ? leg2.legBus.geometry : { type: 'LineString', coordinates: [t2Coords, leg2.h2Coords] };
      const leg2Geom = leg2.leg2 ? leg2.leg2.geometry : { type: 'LineString', coordinates: [leg2.h2Coords, [endLon, endLat]] };

      summary = {
        totalDistance: (bestOption.totalDist / 1000).toFixed(2) + ' km',
        totalTime: Math.ceil(bestOption.totalTime) + ' mnt',
        steps: [
          { id: 'step-first', icon: legLabel.icon, text: `${legLabel.text} sejauh ${(leg1.walkDist1 > 1000 ? (leg1.walkDist1/1000).toFixed(1)+' km' : Math.round(leg1.walkDist1)+' meter')} menuju <b>Halte ${leg1.startHalte.nama_halte}</b>.`, dist: Math.round(leg1.walkDist1)+' m', time: Math.ceil(leg1.walkTime1)+' mnt' },
          { id: 'step-bus-1', icon: 'fa-bus', text: `Naik bus <b>Trans Padang Koridor ${bestOption.koridors[0]}</b> sejauh ${(leg1.busDist/1000).toFixed(1)} km. Turun di <b>Halte ${bestOption.t1.nama_halte}</b>.`, dist: (leg1.busDist/1000).toFixed(1)+' km', time: Math.ceil(leg1.busTime)+' mnt' },
          { id: 'step-transit', icon: 'fa-exchange-alt', text: `Jalan kaki transit sejauh ${Math.round(bestOption.transitDist)} meter menuju <b>Halte ${bestOption.t2.nama_halte}</b>.`, dist: Math.round(bestOption.transitDist)+' m', time: Math.ceil(bestOption.transitWalkTime)+' mnt' },
          { id: 'step-bus-2', icon: 'fa-bus', text: `Pindah ke bus <b>Trans Padang Koridor ${bestOption.koridors[1]}</b>. Menempuh ${(leg2.busDist/1000).toFixed(1)} km. Turun di <b>Halte ${leg2.endHalte.nama_halte}</b>.`, dist: (leg2.busDist/1000).toFixed(1)+' km', time: Math.ceil(leg2.busTime)+' mnt' },
          { id: 'step-last', icon: legLabel.icon, text: `Setelah turun, ${legLabel.endText.toLowerCase()} sejauh ${(leg2.walkDist2 > 1000 ? (leg2.walkDist2/1000).toFixed(1)+' km' : Math.round(leg2.walkDist2)+' meter')} ke tujuan.`, dist: Math.round(leg2.walkDist2)+' m', time: Math.ceil(leg2.walkTime2)+' mnt' }
        ]
      };
      
      features = [
        { type: 'Feature', properties: { id: 'step-first', type: travelMode, description: `${legLabel.text} ke halte` }, geometry: leg1Geom },
        { type: 'Feature', properties: { id: 'step-bus-1', type: 'bus_route', koridor: bestOption.koridors[0], description: `Naik Koridor ${bestOption.koridors[0]}` }, geometry: legBus1Geom },
        { type: 'Feature', properties: { id: 'step-transit', type: travelMode, description: 'Jalan Kaki Transit' }, geometry: transitWalkGeom },
        { type: 'Feature', properties: { id: 'step-bus-2', type: 'bus_route', koridor: bestOption.koridors[1], description: `Naik Koridor ${bestOption.koridors[1]}` }, geometry: legBus2Geom },
        { type: 'Feature', properties: { id: 'step-last', type: travelMode, description: `${legLabel.endText} ke tujuan` }, geometry: leg2Geom }
      ];
    } else {
      const { startHalte, endHalte, walkDist1, busDist, walkDist2, walkTime1, busTime, walkTime2, totalDist, totalTime, leg1, legBus, leg2, h1Coords, h2Coords } = bestOption;
      
      const leg1Geom = leg1 ? leg1.geometry : { type: 'LineString', coordinates: [[startLon, startLat], h1Coords] };
      const legBusGeom = legBus ? legBus.geometry : { type: 'LineString', coordinates: [h1Coords, h2Coords] };
      const leg2Geom = leg2 ? leg2.geometry : { type: 'LineString', coordinates: [h2Coords, [endLon, endLat]] };

      summary = {
        totalDistance: (totalDist / 1000).toFixed(2) + ' km',
        totalTime: Math.ceil(totalTime) + ' mnt',
        steps: [
          { id: 'step-first', icon: legLabel.icon, text: `${legLabel.text} sejauh ${(walkDist1 > 1000 ? (walkDist1/1000).toFixed(1)+' km' : Math.round(walkDist1)+' meter')} menuju <b>Halte ${startHalte.nama_halte}</b>.`, dist: (walkDist1 > 1000 ? (walkDist1/1000).toFixed(1)+' km' : Math.round(walkDist1)+' m'), time: Math.ceil(walkTime1)+' mnt' },
          { id: 'step-bus', icon: 'fa-bus', text: `Naik bus <b>Trans Padang Koridor ${startHalte.koridor}</b>. Menempuh sejauh ${(busDist/1000).toFixed(1)} km. Bersiaplah untuk turun di <b>Halte ${endHalte.nama_halte}</b>.`, dist: (busDist/1000).toFixed(1)+' km', time: Math.ceil(busTime)+' mnt' },
          { id: 'step-last', icon: legLabel.icon, text: `Setelah turun, ${legLabel.endText.toLowerCase()} sejauh ${(walkDist2 > 1000 ? (walkDist2/1000).toFixed(1)+' km' : Math.round(walkDist2)+' meter')} ke titik tujuan akhir Anda.`, dist: (walkDist2 > 1000 ? (walkDist2/1000).toFixed(1)+' km' : Math.round(walkDist2)+' m'), time: Math.ceil(walkTime2)+' mnt' }
        ]
      };
      
      features = [
        { type: 'Feature', properties: { id: 'step-first', type: travelMode, description: `${legLabel.text} ke halte` }, geometry: leg1Geom },
        { type: 'Feature', properties: { id: 'step-bus', type: 'bus_route', koridor: startHalte.koridor, description: `Naik Koridor ${startHalte.koridor}` }, geometry: legBusGeom },
        { type: 'Feature', properties: { id: 'step-last', type: travelMode, description: `${legLabel.endText} ke tujuan` }, geometry: leg2Geom }
      ];
    }

    res.json({
      type: 'FeatureCollection',
      summary: summary,
      features: features
    });
  } catch (err) {
    console.error('Routing Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
};

exports.getHaltes = async (req, res) => {
  try {
    const haltes = await routingService.getAllHaltes();
    const geojson = {
      type: 'FeatureCollection',
      features: haltes.map(h => ({
        type: 'Feature',
        properties: { id: h.id, nama_halte: h.nama_halte, koridor: h.koridor },
        geometry: JSON.parse(h.geometry)
      }))
    };
    res.json(geojson);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data halte' });
  }
};

exports.createHalte = async (req, res) => {
  try {
    const { nama_halte, koridor, lon, lat } = req.body;
    if (!nama_halte || !koridor || !lon || !lat) {
      return res.status(400).json({ error: 'Semua field (nama_halte, koridor, lon, lat) harus diisi' });
    }
    if (!isInBounds(lon, lat)) {
      return res.status(400).json({ error: 'Koordinat halte berada di luar wilayah layanan Trans Padang.' });
    }
    const newHalte = await routingService.createHalte(nama_halte, koridor, lon, lat);
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
      return res.status(400).json({ error: 'Semua field (nama_halte, koridor, lon, lat) harus diisi' });
    }
    if (!isInBounds(lon, lat)) {
      return res.status(400).json({ error: 'Koordinat halte berada di luar wilayah layanan Trans Padang.' });
    }
    const updatedHalte = await routingService.updateHalte(id, nama_halte, koridor, lon, lat);
    res.json(updatedHalte);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengupdate halte' });
  }
};

exports.deleteHalte = async (req, res) => {
  try {
    const { id } = req.params;
    await routingService.deleteHalte(id);
    res.json({ message: 'Halte berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus halte' });
  }
};
