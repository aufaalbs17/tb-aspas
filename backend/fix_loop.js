const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const regex = /if \(opt\.type === 'bus_route'\)/g;
code = code.replace(regex, "if (opt.type === 'bus_route' || opt.type === 'transit_route')");

fs.writeFileSync('src/controllers/routeController.js', code);
