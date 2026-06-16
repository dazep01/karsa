/**
 * KARSA v0.3.1 — Semantic Graph Test Suite
 * ----------------------------------------------------------------------------
 * Refinement lvl.2: symbol table API, dependency graph, inspect/graph API.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const Karsa = require('../engine/karsa');

const CLI = path.resolve(__dirname, '..', 'engine', 'karsa-cli.js');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'karsa-graph-'));

function writeTemp(name, content) {
  const file = path.join(TMP_DIR, name);
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

function runJson(args) {
  const result = spawnSync(process.execPath, [CLI].concat(args), { encoding: 'utf-8' });
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch (err) {
    console.error('STDOUT tidak valid JSON:', result.stdout);
    console.error('STDERR:', result.stderr);
    throw err;
  }
  return { result, json };
}

console.log('=== RUNNING SEMANTIC GRAPH TESTS ===\n');

// ---------------------------------------------------------------------------
// Test 1: Karsa.inspect menghasilkan normalized semantic symbols/references
// ---------------------------------------------------------------------------
{
  const source = `
data harga = 10
data jumlah = 2
turunan total = harga * jumlah

buat p#total -> teks: total
`;
  const result = Karsa.inspect(source);
  assert.strictEqual(result.success, true, 'inspect harus sukses');
  assert.ok(result.semantic, 'inspect harus punya semantic');
  assert.ok(Array.isArray(result.semantic.symbols), 'symbols harus array');
  assert.ok(Array.isArray(result.semantic.references), 'references harus array');

  const total = result.semantic.symbols.find(sym => sym.name === 'total');
  assert.ok(total, 'symbol total harus ada');
  assert.ok(total.id, 'symbol harus punya id');
  assert.ok(total.scopeId, 'symbol harus punya scopeId');
  assert.strictEqual(total.isComputed, true, 'total harus computed');

  console.log('✓ Karsa.inspect normalized semantic symbols/references');
}

// ---------------------------------------------------------------------------
// Test 2: dependency graph untuk turunan
// ---------------------------------------------------------------------------
{
  const source = `
data harga = 10
data jumlah = 2
turunan total = harga * jumlah
`;
  const result = Karsa.graph(source);
  const edges = result.dependencies.filter(dep => dep.kind === 'computed');
  assert.strictEqual(result.success, true, 'graph acyclic harus sukses');
  assert.ok(edges.some(dep => dep.from === 'total' && dep.to === 'harga'), 'total harus depend ke harga');
  assert.ok(edges.some(dep => dep.from === 'total' && dep.to === 'jumlah'), 'total harus depend ke jumlah');

  console.log('✓ dependency graph computed edges');
}

// ---------------------------------------------------------------------------
// Test 3: cycle detection E4201
// ---------------------------------------------------------------------------
{
  const source = `
turunan a = b + 1
turunan b = a + 1
`;
  const result = Karsa.inspect(source);
  assert.strictEqual(result.success, false, 'cycle harus membuat inspect success false');
  assert.ok(result.diagnostics.some(d => (d.code || d.kode) === 'E4201'), 'cycle harus menghasilkan E4201');
  assert.ok(result.semantic.cycles.length >= 1, 'semantic cycles harus terisi');

  console.log('✓ dependency cycle detection E4201');
}

// ---------------------------------------------------------------------------
// Test 4: cycle tiga node
// ---------------------------------------------------------------------------
{
  const source = `
turunan a = b + 1
turunan b = c + 1
turunan c = a + 1
`;
  const result = Karsa.inspect(source);
  assert.strictEqual(result.success, false, 'cycle tiga node harus membuat inspect success false');
  assert.ok(result.diagnostics.some(d => (d.code || d.kode) === 'E4201'), 'cycle tiga node harus menghasilkan E4201');
  assert.ok(result.semantic.cycles.length >= 1, 'semantic cycles tiga node harus terisi');

  console.log('✓ dependency cycle tiga node E4201');
}

// ---------------------------------------------------------------------------
// Test 5: CLI inspect --json
// ---------------------------------------------------------------------------
{
  const file = writeTemp('inspect.ks', 'data nama = "Karsa"\nbuat h1 -> teks: nama\n');
  const { result, json } = runJson(['inspect', file, '--json']);
  assert.strictEqual(result.status, 0, 'inspect --json harus exit 0');
  assert.strictEqual(json.command, 'inspect');
  assert.ok(json.semantic.symbols.some(sym => sym.name === 'nama'), 'inspect JSON harus memuat symbol nama');

  console.log('✓ CLI inspect --json');
}

// ---------------------------------------------------------------------------
// Test 6: CLI graph --json
// ---------------------------------------------------------------------------
{
  const file = writeTemp('graph.ks', 'data x = 1\nturunan y = x + 1\n');
  const { result, json } = runJson(['graph', file, '--json']);
  assert.strictEqual(result.status, 0, 'graph --json harus exit 0');
  assert.strictEqual(json.command, 'graph');
  assert.ok(json.dependencies.some(dep => dep.from === 'y' && dep.to === 'x'), 'graph JSON harus memuat y -> x');

  console.log('✓ CLI graph --json');
}

console.log('\n✓ Semua semantic graph tests lulus.');
