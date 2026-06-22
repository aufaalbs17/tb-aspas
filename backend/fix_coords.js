const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const regex = /const t1Coords = JSON\.parse\(t1\.geometry\);\s*const t2Coords = JSON\.parse\(t2\.geometry\);/g;
code = code.replace(regex, `const t1Coords = JSON.parse(t1.geometry).coordinates;
      const t2Coords = JSON.parse(t2.geometry).coordinates;`);
fs.writeFileSync('src/controllers/routeController.js', code);
