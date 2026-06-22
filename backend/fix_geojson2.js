const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const anchor1 = "if (bestOption.type === 'direct') {";
const anchor2 = "res.json({";

const startIndex = code.indexOf(anchor1);
const endIndex = code.indexOf(anchor2, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `if (bestOption.type === 'direct') {
      summary = {
        totalDistance: (directDist / 1000).toFixed(2) + ' km',
        totalTime: Math.ceil(directTime) + ' mnt',
        steps: [
          { id: 'step-direct', icon: legLabel.icon, text: \`Jarak dekat atau lebih efisien tanpa bus. Langsung \${legLabel.text.toLowerCase()} sejauh \${(directDist > 1000 ? (directDist/1000).toFixed(1)+' km' : Math.round(directDist)+' meter')} ke tujuan Anda.\`, dist: (directDist > 1000 ? (directDist/1000).toFixed(1)+' km' : Math.round(directDist)+' m'), time: Math.ceil(directTime)+' mnt' }
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
          { id: 'step-first', icon: legLabel.icon, text: \`\${legLabel.text} sejauh \${(leg1.walkDist1 > 1000 ? (leg1.walkDist1/1000).toFixed(1)+' km' : Math.round(leg1.walkDist1)+' meter')} menuju <b>Halte \${leg1.startHalte.nama_halte}</b>.\`, dist: Math.round(leg1.walkDist1)+' m', time: Math.ceil(leg1.walkTime1)+' mnt' },
          { id: 'step-bus-1', icon: 'fa-bus', text: \`Naik bus <b>Trans Padang Koridor \${bestOption.koridors[0]}</b> sejauh \${(leg1.busDist/1000).toFixed(1)} km. Turun di <b>Halte \${bestOption.t1.nama_halte}</b>.\`, dist: (leg1.busDist/1000).toFixed(1)+' km', time: Math.ceil(leg1.busTime)+' mnt' },
          { id: 'step-transit', icon: 'fa-exchange-alt', text: \`Jalan kaki transit sejauh \${Math.round(bestOption.transitDist)} meter menuju <b>Halte \${bestOption.t2.nama_halte}</b>.\`, dist: Math.round(bestOption.transitDist)+' m', time: Math.ceil(bestOption.transitWalkTime)+' mnt' },
          { id: 'step-bus-2', icon: 'fa-bus', text: \`Pindah ke bus <b>Trans Padang Koridor \${bestOption.koridors[1]}</b>. Menempuh \${(leg2.busDist/1000).toFixed(1)} km. Turun di <b>Halte \${leg2.endHalte.nama_halte}</b>.\`, dist: (leg2.busDist/1000).toFixed(1)+' km', time: Math.ceil(leg2.busTime)+' mnt' },
          { id: 'step-last', icon: legLabel.icon, text: \`Setelah turun, \${legLabel.endText.toLowerCase()} sejauh \${(leg2.walkDist2 > 1000 ? (leg2.walkDist2/1000).toFixed(1)+' km' : Math.round(leg2.walkDist2)+' meter')} ke tujuan.\`, dist: Math.round(leg2.walkDist2)+' m', time: Math.ceil(leg2.walkTime2)+' mnt' }
        ]
      };
      
      features = [
        { type: 'Feature', properties: { id: 'step-first', type: travelMode, description: \`\${legLabel.text} ke halte\` }, geometry: leg1Geom },
        { type: 'Feature', properties: { id: 'step-bus-1', type: 'bus_route', koridor: bestOption.koridors[0], description: \`Naik Koridor \${bestOption.koridors[0]}\` }, geometry: legBus1Geom },
        { type: 'Feature', properties: { id: 'step-transit', type: travelMode, description: 'Jalan Kaki Transit' }, geometry: transitWalkGeom },
        { type: 'Feature', properties: { id: 'step-bus-2', type: 'bus_route', koridor: bestOption.koridors[1], description: \`Naik Koridor \${bestOption.koridors[1]}\` }, geometry: legBus2Geom },
        { type: 'Feature', properties: { id: 'step-last', type: travelMode, description: \`\${legLabel.endText} ke tujuan\` }, geometry: leg2Geom }
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
          { id: 'step-first', icon: legLabel.icon, text: \`\${legLabel.text} sejauh \${(walkDist1 > 1000 ? (walkDist1/1000).toFixed(1)+' km' : Math.round(walkDist1)+' meter')} menuju <b>Halte \${startHalte.nama_halte}</b>.\`, dist: (walkDist1 > 1000 ? (walkDist1/1000).toFixed(1)+' km' : Math.round(walkDist1)+' m'), time: Math.ceil(walkTime1)+' mnt' },
          { id: 'step-bus', icon: 'fa-bus', text: \`Naik bus <b>Trans Padang Koridor \${startHalte.koridor}</b>. Menempuh sejauh \${(busDist/1000).toFixed(1)} km. Bersiaplah untuk turun di <b>Halte \${endHalte.nama_halte}</b>.\`, dist: (busDist/1000).toFixed(1)+' km', time: Math.ceil(busTime)+' mnt' },
          { id: 'step-last', icon: legLabel.icon, text: \`Setelah turun, \${legLabel.endText.toLowerCase()} sejauh \${(walkDist2 > 1000 ? (walkDist2/1000).toFixed(1)+' km' : Math.round(walkDist2)+' meter')} ke titik tujuan akhir Anda.\`, dist: (walkDist2 > 1000 ? (walkDist2/1000).toFixed(1)+' km' : Math.round(walkDist2)+' m'), time: Math.ceil(walkTime2)+' mnt' }
        ]
      };
      
      features = [
        { type: 'Feature', properties: { id: 'step-first', type: travelMode, description: \`\${legLabel.text} ke halte\` }, geometry: leg1Geom },
        { type: 'Feature', properties: { id: 'step-bus', type: 'bus_route', koridor: startHalte.koridor, description: \`Naik Koridor \${startHalte.koridor}\` }, geometry: legBusGeom },
        { type: 'Feature', properties: { id: 'step-last', type: travelMode, description: \`\${legLabel.endText} ke tujuan\` }, geometry: leg2Geom }
      ];
    }

    `;
  
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/controllers/routeController.js', code);
  console.log('GeoJSON logic updated.');
} else {
  console.log('Anchors not found.');
}
