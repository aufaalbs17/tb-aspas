const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const anchor = '    const directTime = directRoute ? (directDist / 83) : 9999;';
const replaceWith = `    const directTime = directRoute ? (directDist / 83) : 9999;

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

    // Orang sangat tidak suka jalan kaki jauh, jadi waktu jalan kaki diberi penalti 10x lipat.`;

code = code.replace(anchor, replaceWith);
fs.writeFileSync('src/controllers/routeController.js', code);
