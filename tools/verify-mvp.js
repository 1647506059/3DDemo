const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function loadLevel(n) {
    const f = path.join(root, 'assets/resources/prod-13-json', `Level${n}.json`);
    return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function checkLevel(n) {
    const data = loadLevel(n);
    const stage = data.stages[0];
    const types = new Set(stage.objects.map((o) => o.type));
    return {
        level: n,
        moveCount: data.moveCount,
        tables: stage.tables.length,
        objects: stage.objects.length,
        types: [...types].sort((a, b) => a - b),
    };
}

const mapPath = path.join(root, 'assets/resources/config/object-type-map.json');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

console.log('=== object-type-map ===');
console.log('entries:', Object.keys(map).length);

for (const n of [1, 4, 100]) {
    const info = checkLevel(n);
    console.log(`\n=== Level ${n} ===`);
    console.log(JSON.stringify(info, null, 2));
    for (const t of info.types) {
        const entry = map[String(t)];
        console.log(`  type ${t} -> ${entry?.mesh ?? 'MISSING'}`);
    }
}

console.log('\n=== scripts ===');
const scripts = [
    'assets/script/Main.ts',
    'assets/script/game/GameManager.ts',
    'assets/script/game/LevelLoader.ts',
    'assets/script/game/CannonController.ts',
    'assets/script/ui/GameUI.ts',
];
for (const s of scripts) {
    console.log(s, fs.existsSync(path.join(root, s)) ? 'OK' : 'MISSING');
}
