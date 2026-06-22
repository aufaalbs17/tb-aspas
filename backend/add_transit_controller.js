const fs = require('fs');
let code = fs.readFileSync('src/controllers/routeController.js', 'utf8');

const newFunc = `
async function evaluateTransitCorridor(k1, k2, startLon, startLat, endLon, endLat, osrmProfile, travelMode) {
  try {
    const transitPairs = await routingService.findTransitPairs(k1, k2, 500);
    if (!transitPairs || transitPairs.length === 0) return null;

    let bestTransitOpt = null;
    let bestTransitScore = Infinity;

    for (let pair of transitPairs) {
      const t1 = pair.halte1;
      const t2 = pair.halte2;
      const t1Coords = JSON.parse(t1.geometry);
      const t2Coords = JSON.parse(t2.geometry);

      // K1 Leg
      const legK1 = await evaluateCorridor(k1, startLon, startLat, t1Coords[0], t1Coords[1], osrmProfile, travelMode);
      if (!legK1) continue;
      // We must force the end halte of legK1 to be t1. evaluateCorridor will naturally pick t1 because its distance to t1 is 0.

      // K2 Leg
      const legK2 = await evaluateCorridor(k2, t2Coords[0], t2Coords[1], endLon, endLat, osrmProfile, travelMode);
      if (!legK2) continue;
      // Similarly, start halte of legK2 is naturally t2.

      // Transit Walk
      const transitWalk = await fetchOSRMRoute(t1Coords[0], t1Coords[1], t2Coords[0], t2Coords[1], 'foot');
      const transitDist = transitWalk ? transitWalk.distance : pair.transitDist;
      const transitWalkTime = transitWalk ? transitWalk.duration : (transitDist / 83);

      const totalTime = legK1.totalTime + transitWalkTime + legK2.totalTime;
      const totalDist = legK1.totalDist + transitDist + legK2.totalDist;

      // Score: heavy penalty on walking
      const walkTime1 = legK1.walkTime1;
      const walkTime2 = legK2.walkTime2;
      const totalWalkTime = walkTime1 + transitWalkTime + walkTime2;
      const totalBusTime = legK1.busTime + legK2.busTime;

      const score = (totalWalkTime * 10) + totalBusTime;

      if (score < bestTransitScore) {
        bestTransitScore = score;
        bestTransitOpt = {
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
      }
    }
    return bestTransitOpt;
  } catch(e) {
    console.error(e);
    return null;
  }
}
`;

code = code.replace('exports.getInteractiveRoute = async', newFunc + '\nexports.getInteractiveRoute = async');
fs.writeFileSync('src/controllers/routeController.js', code);
