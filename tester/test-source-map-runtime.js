/**
 * KARSA v0.3.1 — Sourcemap & Runtime Mapping Test
 * ----------------------------------------------------------------------------
 * Refinement lvl.4G: source context comments, x_karsaMappings, runtime mapping.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const Karsa = require('../engine/karsa');

console.log('=== RUNNING SOURCE MAP / RUNTIME MAPPING TESTS ===\n');

const source = `
data x = 1
buat h1 -> teks: x
`;
const result = Karsa.compile(source);
assert.strictEqual(result.success, true, 'compile harus sukses');
assert.ok(result.js.includes('@karsa-source'), 'output JS harus punya source context comments');

const markerLine = result.js.split('\n').findIndex(line => line.includes('@karsa-source') && line.includes('DataDeclaration')) + 1;
assert.ok(markerLine > 0, 'harus menemukan marker DataDeclaration');
const mapped = Karsa.mapGeneratedLine(result.js, markerLine + 1);
assert.ok(mapped, 'mapGeneratedLine harus menghasilkan mapping');
assert.strictEqual(mapped.sourceLine, 2, 'DataDeclaration harus map ke source line 2');
assert.strictEqual(mapped.nodeType, 'DataDeclaration');
console.log('✓ compiler source context comments dan mapGeneratedLine');

const fakeError = { stack: 'Error: boom\n    at test (generated.js:' + (markerLine + 1) + ':3)' };
const runtimeMapped = Karsa.mapRuntimeError(fakeError, result.js);
assert.ok(runtimeMapped, 'mapRuntimeError harus menghasilkan mapping');
assert.strictEqual(runtimeMapped.sourceLine, 2);
console.log('✓ mapRuntimeError basic stack mapping');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'karsa-sourcemap-'));
const srcPath = path.join(tmpDir, 'app.ks');
const outPath = path.join(tmpDir, 'app.js');
fs.writeFileSync(srcPath, source, 'utf-8');

const cli = spawnSync(process.execPath, [path.resolve(__dirname, '..', 'engine', 'karsa-cli.js'), 'compile', srcPath, '-o', outPath, '--sourcemap'], { encoding: 'utf-8' });
assert.strictEqual(cli.status, 0, 'CLI compile --sourcemap harus exit 0: ' + cli.stderr);
const mapPath = outPath + '.map';
assert.ok(fs.existsSync(mapPath), 'sourcemap file harus dibuat');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
assert.ok(Array.isArray(map.x_karsaMappings), 'sourcemap harus punya x_karsaMappings');
assert.ok(map.x_karsaMappings.length >= 1, 'x_karsaMappings harus berisi mapping');
assert.ok(map.sourcesContent && map.sourcesContent[0].includes('data x'), 'sourcesContent harus tersedia');
console.log('✓ CLI --sourcemap x_karsaMappings');

console.log('\n✓ Semua source map / runtime mapping tests lulus.');
