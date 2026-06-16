/**
 * KARSA v0.3.1 — Standalone Bundle Smoke Test
 * ----------------------------------------------------------------------------
 * Refinement lvl.1: memastikan engine/karsa.standalone.js dapat dimuat dalam
 * konteks browser-like tanpa CommonJS dan mengekspos Karsa.compile().
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const bundlePath = path.resolve(__dirname, '..', 'engine', 'karsa.standalone.js');
const code = fs.readFileSync(bundlePath, 'utf-8');

const sandbox = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
sandbox.self = sandbox;

vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: 'karsa.standalone.js' });

console.log('=== RUNNING STANDALONE SMOKE TEST ===\n');

assert.ok(sandbox.KarsaLexer, 'KarsaLexer harus tersedia di standalone context');
assert.ok(sandbox.KarsaParser, 'KarsaParser harus tersedia di standalone context');
assert.ok(sandbox.KarsaResolver, 'KarsaResolver harus tersedia di standalone context');
assert.ok(sandbox.KarsaAnalyzer, 'KarsaAnalyzer harus tersedia di standalone context');
assert.ok(sandbox.KarsaCompiler, 'KarsaCompiler harus tersedia di standalone context');
assert.ok(sandbox.Karsa, 'Karsa harus tersedia di standalone context');
assert.strictEqual(sandbox.Karsa.version, '0.3.1');
assert.strictEqual(typeof sandbox.Karsa.compile, 'function');

const result = sandbox.Karsa.compile('buat h1 -> teks: "Halo"\n');
assert.strictEqual(result.success, true, 'Standalone Karsa.compile harus sukses');
assert.ok(result.js && result.js.indexOf('document.createElement("h1")') !== -1, 'Output JS harus membuat elemen h1');
assert.ok(Array.isArray(result.diagnostics), 'Result harus punya diagnostics array');

console.log('✓ standalone bundle expose Karsa dan compile source sederhana');
console.log('\n✓ Standalone smoke test lulus.');
