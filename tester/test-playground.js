/**
 * KARSA v0.3.1 — Playground / Visualizer Test
 * ----------------------------------------------------------------------------
 * Refinement lvl.3D: validasi static playground visualizer.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'tooling', 'playground', 'index.html');
const html = fs.readFileSync(file, 'utf-8');

console.log('=== RUNNING PLAYGROUND VISUALIZER TEST ===\n');

assert.ok(/KARSA Playground & Semantic Visualizer/.test(html), 'title harus ada');
assert.ok(html.includes('../../engine/karsa.standalone.js'), 'harus memuat standalone runtime lokal');
assert.ok(html.includes('Karsa.inspect'), 'harus memakai Karsa.inspect');
assert.ok(html.includes('Karsa.compile'), 'harus memakai Karsa.compile');
assert.ok(html.includes('tab-diagnostics'), 'harus punya diagnostics panel');
assert.ok(html.includes('tab-symbols'), 'harus punya symbols panel');
assert.ok(html.includes('tab-graph'), 'harus punya graph panel');
assert.ok(html.includes('tab-ast'), 'harus punya AST panel');
assert.ok(html.includes('btnExport'), 'harus punya export JSON button');
assert.ok(html.includes('safeAst'), 'harus punya AST sanitizer agar aman dari circular reference');

console.log('✓ playground panels dan runtime integration valid');
console.log('\n✓ Playground visualizer test lulus.');
