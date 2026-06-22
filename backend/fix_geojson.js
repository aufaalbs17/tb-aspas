const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const geojsonOld = `      if (bestOption.leg1) {
        features.push({
          type: 'Feature',
          properties: { id: 'step-walk-1', type: 'walk', description: legLabel.text, distance: bestOption.leg1.distance },
          geometry: bestOption.leg1.geometry
        });
      }`;

const geojsonNew = `      if (bestOption.type === 'transit_route') {
        const leg1 = bestOption.leg1;
        const leg2 = bestOption.leg2;
        
        // Walk 1
        if (leg1.leg1) {
          features.push({ type: 'Feature', properties: { id: 'step-walk-1', type: 'walk', description: legLabel.text, distance: leg1.leg1.distance }, geometry: leg1.leg1.geometry });
        }
        // Bus 1
        features.push({ type: 'Feature', properties: { id: 'step-bus-1', type: 'bus_route', description: 'Naik Bus K1', distance: leg1.legBus.distance, koridor: bestOption.koridors[0] }, geometry: leg1.legBus.geometry });
        // Walk Transit
        if (bestOption.transitWalk) {
          features.push({ type: 'Feature', properties: { id: 'step-transit', type: 'walk', description: 'Jalan Kaki Transit', distance: bestOption.transitWalk.distance }, geometry: bestOption.transitWalk.geometry });
        } else {
          // Fallback if no OSRM transit walk
          const t1Coords = JSON.parse(bestOption.t1.geometry).coordinates;
          const t2Coords = JSON.parse(bestOption.t2.geometry).coordinates;
          features.push({ type: 'Feature', properties: { id: 'step-transit', type: 'walk', description: 'Jalan Kaki Transit', distance: bestOption.transitDist }, geometry: { type: 'LineString', coordinates: [t1Coords, t2Coords] } });
        }
        // Bus 2
        features.push({ type: 'Feature', properties: { id: 'step-bus-2', type: 'bus_route', description: 'Naik Bus K2', distance: leg2.legBus.distance, koridor: bestOption.koridors[1] }, geometry: leg2.legBus.geometry });
        // Walk 2
        if (leg2.leg2) {
          features.push({ type: 'Feature', properties: { id: 'step-walk-2', type: 'walk', description: legLabel.endText, distance: leg2.leg2.distance }, geometry: leg2.leg2.geometry });
        }
      } else if (bestOption.type === 'bus_route') {
        if (bestOption.leg1) {
          features.push({
            type: 'Feature',
            properties: { id: 'step-walk-1', type: 'walk', description: legLabel.text, distance: bestOption.leg1.distance },
            geometry: bestOption.leg1.geometry
          });
        }
        if (bestOption.legBus && bestOption.legBus.geometry && bestOption.legBus.geometry.coordinates.length > 0) {
          features.push({
            type: 'Feature',
            properties: { id: 'step-bus', type: 'bus_route', description: 'Naik Bus Trans Padang', distance: bestOption.legBus.distance, koridor: bestOption.koridor },
            geometry: bestOption.legBus.geometry
          });
        }
        if (bestOption.leg2) {
          features.push({
            type: 'Feature',
            properties: { id: 'step-walk-2', type: 'walk', description: legLabel.endText, distance: bestOption.leg2.distance },
            geometry: bestOption.leg2.geometry
          });
        }
      }`;

// In routeController, replace the block from "if (bestOption.leg1)" down to "if (bestOption.leg2)"
// Since regex might be tricky, let's just find the exact block.
const blockToReplace = `      if (bestOption.leg1) {
        features.push({
          type: 'Feature',
          properties: { id: 'step-walk-1', type: 'walk', description: legLabel.text, distance: bestOption.leg1.distance },
          geometry: bestOption.leg1.geometry
        });
      }

      if (bestOption.legBus && bestOption.legBus.geometry && bestOption.legBus.geometry.coordinates.length > 0) {
        // ... (this might be slightly different, let's use string manipulation)
      }
`;

// Alternative string manipulation
const startIndex = code.indexOf("if (bestOption.leg1)");
const endIndex = code.indexOf("const steps = features.map(leg => {");
if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + geojsonNew + '\n\n      ' + code.substring(endIndex);
}

const summaryOld = `        if (leg.properties.id === 'step-bus') {
          return { id: leg.properties.id, text: \\\`Naik bus <b>Trans Padang Koridor \${bestOption.koridor}</b>. Menempuh sejauh \${dist}. Bersiaplah untuk turun di <b>Halte \${endHalte.nama_halte}</b>.\\\`, dist: dist };
        }`;

const summaryNew = `        if (leg.properties.id === 'step-bus-1') {
          return { id: leg.properties.id, text: \`Naik bus <b>Trans Padang Koridor \${leg.properties.koridor}</b>. Bersiaplah turun di <b>Halte \${bestOption.t1.nama_halte}</b> untuk transit.\`, dist: dist };
        }
        if (leg.properties.id === 'step-transit') {
          return { id: leg.properties.id, text: \`Jalan kaki sejauh \${dist} menuju <b>Halte \${bestOption.t2.nama_halte}</b>.\`, dist: dist };
        }
        if (leg.properties.id === 'step-bus-2') {
          return { id: leg.properties.id, text: \`Naik bus <b>Trans Padang Koridor \${leg.properties.koridor}</b>. Menempuh sejauh \${dist}. Bersiaplah untuk turun di <b>Halte \${bestOption.leg2.endHalte.nama_halte}</b>.\`, dist: dist };
        }
        if (leg.properties.id === 'step-bus') {
          return { id: leg.properties.id, text: \`Naik bus <b>Trans Padang Koridor \${bestOption.koridor}</b>. Menempuh sejauh \${dist}. Bersiaplah untuk turun di <b>Halte \${bestOption.endHalte.nama_halte}</b>.\`, dist: dist };
        }`;

code = code.replace(/if \(leg\.properties\.id === 'step-bus'\) \{[\s\S]*?\}/, summaryNew);

fs.writeFileSync('src/controllers/routeController.js', code);
