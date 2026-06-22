const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

// 1. Fix startHalte.koridor -> bestOption.koridor
code = code.replace(/Trans Padang Koridor \$\{startHalte\.koridor\}/g, 'Trans Padang Koridor ${bestOption.koridor}');
code = code.replace(/Naik Koridor \$\{startHalte\.koridor\}/g, 'Naik Koridor ${bestOption.koridor}');

// 2. Short circuit fetchOSRMRoute
const fetchMatch = /async function fetchOSRMRoute\(lon1, lat1, lon2, lat2, profile\) \{\n  try \{/g;
code = code.replace(fetchMatch, `async function fetchOSRMRoute(lon1, lat1, lon2, lat2, profile) {
  if (Math.abs(lon1 - lon2) < 0.00005 && Math.abs(lat1 - lat2) < 0.00005) {
    return {
      geometry: { type: 'LineString', coordinates: [[lon1, lat1], [lon2, lat2]] },
      distance: 0,
      duration: 0
    };
  }
  try {`);

// 3. Optimize getInteractiveRoute
const directRouteMatch = /\/\/ 1\. Cek rute langsung \(Direct Route\)[\s\S]*?\/\/ 3\. Evaluasi Transit K5 -> K6 dan K6 -> K5\n    const transitK5K6 = await evaluateTransitCorridor\('K5', 'K6', startLon, startLat, endLon, endLat, osrmProfile, travelMode\);\n    const transitK6K5 = await evaluateTransitCorridor\('K6', 'K5', startLon, startLat, endLon, endLat, osrmProfile, travelMode\);/g;
const newTopLevel = `// 1. Eksekusi semua secara paralel
    const [directRoute, routeK5, routeK6, transitK5K6, transitK6K5] = await Promise.all([
      fetchOSRMRoute(startLon, startLat, endLon, endLat, osrmProfile),
      evaluateCorridor('K5', startLon, startLat, endLon, endLat, osrmProfile, travelMode),
      evaluateCorridor('K6', startLon, startLat, endLon, endLat, osrmProfile, travelMode),
      evaluateTransitCorridor('K5', 'K6', startLon, startLat, endLon, endLat, osrmProfile, travelMode),
      evaluateTransitCorridor('K6', 'K5', startLon, startLat, endLon, endLat, osrmProfile, travelMode)
    ]);
    const directDist = directRoute ? directRoute.distance : 999999;
    const directTime = directRoute ? (directDist / 83) : 9999;`;
code = code.replace(directRouteMatch, newTopLevel);

// 4. Optimize evaluateTransitCorridor
const transitLoopMatch = /for \(let pair of transitPairs\) \{[\s\S]*?return bestTransitOpt;/g;
const newTransitLoop = `const transitResults = await Promise.all(transitPairs.map(async (pair) => {
      const t1 = pair.halte1;
      const t2 = pair.halte2;
      const t1Coords = JSON.parse(t1.geometry).coordinates;
      const t2Coords = JSON.parse(t2.geometry).coordinates;

      const [legK1, legK2] = await Promise.all([
        evaluateCorridor(k1, startLon, startLat, t1Coords[0], t1Coords[1], osrmProfile, travelMode),
        evaluateCorridor(k2, t2Coords[0], t2Coords[1], endLon, endLat, osrmProfile, travelMode)
      ]);

      if (!legK1 || !legK2) return null;

      const transitDist = pair.transitDist;
      const transitWalkTime = transitDist / 83;
      const transitWalk = {
         distance: transitDist,
         duration: transitWalkTime,
         geometry: { type: 'LineString', coordinates: [t1Coords, t2Coords] }
      };

      const totalTime = legK1.totalTime + transitWalkTime + legK2.totalTime;
      const totalDist = legK1.totalDist + transitDist + legK2.totalDist;

      const walkTime1 = legK1.walkTime1;
      const walkTime2 = legK2.walkTime2;
      const totalWalkTime = walkTime1 + transitWalkTime + walkTime2;
      const totalBusTime = legK1.busTime + legK2.busTime;

      const score = (totalWalkTime * 10) + totalBusTime;

      return {
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
    }));

    for (let res of transitResults) {
      if (res && res.score < bestTransitScore) {
        bestTransitScore = res.score;
        bestTransitOpt = res;
      }
    }

    return bestTransitOpt;`;
code = code.replace(transitLoopMatch, newTransitLoop);

// 5. Fix createHalte
const createHalteMatch = /exports\.createHalte = async \(req, res\) => \{\n  try \{\n    const \{ nama_halte, koridor, lon, lat \} = req\.body;\n    if \(!nama_halte \|\| !koridor \|\| !lon \|\| !lat\) \{\n      return res\.status\(400\)\.json\(\{ error: 'Semua field \(nama_halte, koridor, lon, lat\) harus diisi' \}\);\n    \}\n    if \(!isInBounds\(lon, lat\)\) \{\n      return res\.status\(400\)\.json\(\{ error: 'Koordinat halte berada di luar wilayah layanan Trans Padang\.' \}\);\n    \}\n    const newHalte = await routingService\.createHalte\(nama_halte, koridor, lon, lat\);/g;

const newCreateHalte = `exports.createHalte = async (req, res) => {
  try {
    const { nama_halte, koridor, lon, lat, position } = req.body;
    if (!nama_halte || !koridor || !lon || !lat) {
      return res.status(400).json({ error: 'Semua field (nama_halte, koridor, lon, lat) harus diisi' });
    }
    if (!isInBounds(lon, lat)) {
      return res.status(400).json({ error: 'Koordinat halte berada di luar wilayah layanan Trans Padang.' });
    }
    const newHalte = await routingService.createHalte(nama_halte, koridor, lon, lat, position);`;

code = code.replace(createHalteMatch, newCreateHalte);

fs.writeFileSync('src/controllers/routeController.js', code);
