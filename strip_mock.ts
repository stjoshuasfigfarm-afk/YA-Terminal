import fs from 'fs';

const data = fs.readFileSync('server/routes/live-vessels.ts', 'utf-8');

let new_data = data.replace(/\/\/ Master Strategic Vessel Fleet Dataset[\s\S]*?\/\/ GET \/api\/live-vessels/, '// GET /api/live-vessels');
new_data = new_data.replace(/    let fleet = \[\n      \.\.\.calculateLivePositions\(\),\n      \.\.\.Array\.from\(liveVessels\.values\(\)\)/g, '    let fleet = [\n      ...Array.from(liveVessels.values())');
new_data = new_data.replace(/  const fleet = calculateLivePositions\(\);\n  const vessel = fleet\.find/g, '  const fleet = Array.from(liveVessels.values());\n  const vessel = fleet.find');

fs.writeFileSync('server/routes/live-vessels.ts', new_data);
console.log('Done');
