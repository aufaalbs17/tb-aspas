const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const lines = code.split('\n');
lines[309] = "          { id: 'step-bus', icon: 'fa-bus', text: `Naik bus <b>Trans Padang Koridor ${bestOption.koridor}</b>. Menempuh sejauh ${(busDist/1000).toFixed(1)} km. Bersiaplah untuk turun di <b>Halte ${endHalte.nama_halte}</b>.`, dist: (busDist/1000).toFixed(1)+' km', time: Math.ceil(busTime)+' mnt' },";
lines[316] = "        { type: 'Feature', properties: { id: 'step-bus', type: 'bus_route', koridor: bestOption.koridor, description: `Naik Koridor ${bestOption.koridor}` }, geometry: legBusGeom },";

fs.writeFileSync('src/controllers/routeController.js', lines.join('\n'));
