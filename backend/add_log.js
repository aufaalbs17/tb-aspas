const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const regex = /const score = \(totalWalkTime \* 10\) \+ totalBusTime;/g;
code = code.replace(regex, `const score = (totalWalkTime * 10) + totalBusTime;
      console.log('Transit score for ' + k1 + '->' + k2 + ' (via ' + t1.nama_halte + '-' + t2.nama_halte + '):', score, 'walkTime1:', walkTime1, 'walkTime2:', walkTime2, 'transitWalk:', transitWalkTime);`);
fs.writeFileSync('src/controllers/routeController.js', code);
