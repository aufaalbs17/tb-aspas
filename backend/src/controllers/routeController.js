const routingService = require('../services/routingService');

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

// Menghitung rute untuk satu koridor spesifik
async function evaluateCorridor(koridor, startLon, startLat, endLon, endLat, osrmProfile, travelMode) {
  const startHalte = await routingService.findNearestHalte(startLon, startLat, koridor);
  const endHalte = await routingService.findNearestHalte(endLon, endLat, koridor);
  
  if (!startHalte || !endHalte) return null;
  if (startHalte.id === endHalte.id) return null; // Jika sama, abaikan rute bus ini

  const h1Coords = JSON.parse(startHalte.geometry).coordinates;
  const h2Coords = JSON.parse(endHalte.geometry).coordinates;

  const leg1 = await fetchOSRMRoute(startLon, startLat, h1Coords[0], h1Coords[1], osrmProfile);
  const legBus = await fetchOSRMRoute(h1Coords[0], h1Coords[1], h2Coords[0], h2Coords[1], 'driving');
  const leg2 = await fetchOSRMRoute(h2Coords[0], h2Coords[1], endLon, endLat, osrmProfile);

  const walkDist1 = leg1 ? leg1.distance : (startHalte.jarak_meter || 0);
  const busDist = legBus ? legBus.distance : 5000;
  const walkDist2 = leg2 ? leg2.distance : (endHalte.jarak_meter || 0);
  
  const totalDist = walkDist1 + busDist + walkDist2;
  
  const walkTime1 = leg1 ? leg1.duration : (walkDist1 / (travelMode==='walk'?83:500));
  const busTime = legBus ? legBus.duration : (busDist / 500);
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

exports.getInteractiveRoute = async (req, res) => {
  try {
    const { startLon, startLat, endLon, endLat, mode } = req.body;

    if (!startLon || !startLat || !endLon || !endLat) {
      return res.status(400).json({ error: 'Koordinat awal dan tujuan harus diisi' });
    }

    const travelMode = mode || 'walk'; 
    const osrmProfile = travelMode === 'walk' ? 'foot' : 'driving';

    const modeLabels = {
      walk: { text: 'Jalan kaki', icon: 'fa-person-walking', endText: 'Jalan kaki' },
      motor: { text: 'Naik Ojek/Motor', icon: 'fa-motorcycle', endText: 'Lanjut naik Ojek' },
      car: { text: 'Naik Taksi/Mobil', icon: 'fa-car', endText: 'Lanjut naik Taksi' }
    };
    const legLabel = modeLabels[travelMode] || modeLabels.walk;

    // 1. Cek rute langsung (Direct Route)
    const directRoute = await fetchOSRMRoute(startLon, startLat, endLon, endLat, osrmProfile);
    const directDist = directRoute ? directRoute.distance : 999999;
    const directTime = directRoute ? directRoute.duration : 9999;

    // 2. Evaluasi rute Koridor 5 dan 6
    const routeK5 = await evaluateCorridor('5', startLon, startLat, endLon, endLat, osrmProfile, travelMode);
    const routeK6 = await evaluateCorridor('6', startLon, startLat, endLon, endLat, osrmProfile, travelMode);

    // Kumpulkan opsi rute yang valid
    const options = [];
    if (directRoute) options.push({ type: 'direct', totalDist: directDist, totalTime: directTime, route: directRoute });
    if (routeK5) options.push(routeK5);
    if (routeK6) options.push(routeK6);

    if (options.length === 0) {
       return res.status(404).json({ error: 'Rute tidak dapat ditemukan.' });
    }

    // Pilih yang terbaik: 
    // Prioritaskan bus jika jarak A ke B cukup jauh (>1.5km), kecuali rute bus JAUH lebih muter.
    let bestOption = options[0];
    for (let opt of options) {
       if (opt.type === 'bus_route') {
           // Bus route lebih disenangi jika rute langsung lebih dari 1.5km
           // tapi total bus_route tidak boleh lebih dari 2x lipat rute langsung
           if (directDist > 1500 && opt.totalDist < directDist * 2) {
               if (bestOption.type === 'direct' || opt.totalDist < bestOption.totalDist) {
                   bestOption = opt;
               }
           }
       } else if (opt.type === 'direct') {
           if (directDist <= 1500) {
               // Selalu paksa rute langsung jika jarak kurang dari 1.5km
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
        { type: 'Feature', properties: { id: 'step-bus', type: 'bus', koridor: startHalte.koridor, description: `Naik Koridor ${startHalte.koridor}` }, geometry: legBusGeom },
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
