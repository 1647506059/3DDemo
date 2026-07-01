const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../assets/resources/prod-13-json');
const types = new Set();

for (let i = 1; i <= 1000; i++) {
    const f = path.join(dir, `Level${i}.json`);
    if (!fs.existsSync(f)) continue;
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const stage of data.stages || []) {
        for (const obj of stage.objects || []) types.add(obj.type);
    }
}

function inferMesh(type) {
    if (type >= 1 && type <= 9) return 'can_1x1';
    if (type >= 11 && type <= 19) return 'box_1x1';
    if (type >= 21 && type <= 29) return 'stone_1x1';
    if (type >= 31 && type <= 39) return 'jar_1x1';
    if (type === 41) return 'log_1x3';
    if (type === 42) return 'log_1x1';
    if (type >= 61 && type <= 69) return 'ice_1x1';
    return 'box_1x1';
}

function inferMass(type) {
    if (type === 41) return 2.5;
    if (type === 42) return 1.5;
    if (type >= 21 && type <= 29) return 2.0;
    if (type >= 61 && type <= 69) return 1.2;
    return 1.0;
}

const map = {};
for (const t of [...types].sort((a, b) => a - b)) {
    map[String(t)] = { mesh: inferMesh(t), collider: 'box', mass: inferMass(t) };
}

const outDir = path.join(__dirname, '../assets/resources/config');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'object-type-map.json'), JSON.stringify(map, null, 2));
console.log('Types:', [...types].sort((a, b) => a - b).join(','));
console.log('Written', Object.keys(map).length, 'entries');
