const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const regex = /options\.forEach\(opt => \{[\s\S]*?\}\);/g;
const replacement = `options.forEach(opt => {
        if (opt.type === 'direct') {
            opt.score = opt.totalTime * 10;
        } else if (opt.type === 'transit_route') {
            // Score is already calculated and set in evaluateTransitCorridor
        } else {
            opt.score = ((opt.walkTime1 + opt.walkTime2) * 10) + opt.busTime;
        }
    });`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/controllers/routeController.js', code);
