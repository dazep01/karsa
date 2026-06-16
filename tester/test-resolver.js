/**
 * KARSA v0.3.1 — Resolver Metadata Test Suite
 * ----------------------------------------------------------------------------
 * Refinement lvl.1: memastikan resolver menghasilkan semantic metadata yang
 * dapat dipakai Analyzer dan tooling.
 */

const assert = require('assert');
const KarsaLexer = require('../lexer/karsa-lexer');
const KarsaParser = require('../parser/index');
const KarsaResolver = require('../resolver/karsa-resolver');

function parseAndResolve(source) {
  const lexResult = KarsaLexer.tokenize(source);
  assert.strictEqual(lexResult.errors.length, 0, 'Lexer tidak boleh error');

  const parseResult = KarsaParser.parse(lexResult.tokens);
  assert.strictEqual(parseResult.errors.length, 0, 'Parser tidak boleh error');

  const resolver = new KarsaResolver();
  return resolver.resolve(parseResult.ast);
}

function resolveSource(source) {
  const result = parseAndResolve(source);
  assert.strictEqual(result.errors.length, 0, 'Resolver tidak boleh error');
  return result;
}

function getSymbol(ast, name, kind) {
  const symbols = ast.semantic && ast.semantic.symbols ? ast.semantic.symbols : [];
  return symbols.find(sym => sym.name === name && (!kind || sym.kind === kind));
}

console.log('=== RUNNING RESOLVER METADATA TESTS ===\n');

// ---------------------------------------------------------------------------
// Test 1: semantic container dan symbol metadata dasar
// ---------------------------------------------------------------------------
{
  const result = resolveSource(`
data hitungan = 0
data tidakDipakai = 1
ubah sementara = 0
turunan dobel = hitungan * 2

tambahkan 1 ke hitungan
simpan 3 ke sementara

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
`);

  const ast = result.ast;
  assert.ok(ast.semantic, 'ast.semantic harus ada');
  assert.ok(Array.isArray(ast.semantic.symbols), 'ast.semantic.symbols harus array');
  assert.ok(ast.semantic.globalScope, 'ast.semantic.globalScope harus ada');

  const hitungan = getSymbol(ast, 'hitungan', 'data');
  const sementara = getSymbol(ast, 'sementara', 'ubah');
  const tidakDipakai = getSymbol(ast, 'tidakDipakai', 'data');
  const dobel = getSymbol(ast, 'dobel', 'turunan');

  assert.ok(hitungan, 'symbol data hitungan harus ada');
  assert.strictEqual(hitungan.isReactive, true, 'data harus reactive');
  assert.strictEqual(hitungan.isWritable, true, 'data harus writable');
  assert.ok(hitungan.readCount >= 2, 'hitungan harus punya readCount dari turunan/perbarui');
  assert.strictEqual(hitungan.writeCount, 1, 'hitungan harus punya writeCount dari tambahkan');
  assert.ok(hitungan.references.length >= 2, 'hitungan harus punya references');

  assert.ok(sementara, 'symbol ubah sementara harus ada');
  assert.strictEqual(sementara.isReactive, false, 'ubah bukan reactive');
  assert.strictEqual(sementara.isWritable, true, 'ubah harus writable');
  assert.strictEqual(sementara.writeCount, 1, 'sementara harus tercatat ditulis oleh simpan');

  assert.ok(tidakDipakai, 'symbol tidakDipakai harus ada');
  assert.strictEqual(tidakDipakai.readCount, 0, 'tidakDipakai belum dibaca');
  assert.strictEqual(tidakDipakai.writeCount, 0, 'tidakDipakai belum ditulis setelah deklarasi');

  assert.ok(dobel, 'symbol turunan dobel harus ada');
  assert.strictEqual(dobel.isComputed, true, 'turunan harus computed');
  assert.strictEqual(dobel.isReactive, true, 'turunan harus reactive');
  assert.strictEqual(dobel.isWritable, false, 'turunan harus read-only/writable false');

  console.log('✓ semantic container, read/write count, references, reactive/writable/computed metadata');
}

// ---------------------------------------------------------------------------
// Test 2: shadowing metadata
// ---------------------------------------------------------------------------
{
  const result = resolveSource(`
data nilai = 1

fungsi pakai(nilai: angka):
  kembalikan nilai
`);

  const paramNilai = result.ast.semantic.symbols.find(sym => sym.name === 'nilai' && sym.kind === 'parameter');
  assert.ok(paramNilai, 'parameter nilai harus ada');
  assert.ok(paramNilai.shadowedSymbol, 'parameter nilai harus menyimpan shadowedSymbol');
  assert.strictEqual(paramNilai.shadowedSymbol.kind, 'data', 'parameter harus shadow data global');
  assert.ok(result.warnings.some(w => (w.code || w.kode) === 'W3002'), 'shadowing harus menghasilkan W3002');

  console.log('✓ shadowing metadata dan W3002');
}

// ---------------------------------------------------------------------------
// Test 3: targetSymbol pada statement mutasi
// ---------------------------------------------------------------------------
{
  const result = resolveSource(`
data hitungan = 0
ubah biasa = 1

tambahkan 1 ke hitungan
simpan 2 ke biasa
`);

  const mutations = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'TambahkanStatement' || node.type === 'SimpanStatement') {
      mutations.push(node);
    }
    Object.keys(node).forEach(key => {
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object' && key !== 'symbol' && key !== 'resolved' && key !== 'semantic' && key !== 'targetSymbol') walk(value);
    });
  }
  walk(result.ast);

  const tambah = mutations.find(node => node.type === 'TambahkanStatement');
  const simpan = mutations.find(node => node.type === 'SimpanStatement');
  assert.ok(tambah && tambah.targetSymbol, 'TambahkanStatement harus punya targetSymbol');
  assert.strictEqual(tambah.targetSymbol.name, 'hitungan');
  assert.strictEqual(tambah.targetSymbol.isReactive, true);
  assert.ok(simpan && simpan.targetSymbol, 'SimpanStatement harus punya targetSymbol');
  assert.strictEqual(simpan.targetSymbol.name, 'biasa');
  assert.strictEqual(simpan.targetSymbol.isReactive, false);

  console.log('✓ targetSymbol pada statement mutasi');
}

// ---------------------------------------------------------------------------
// Test 4: undefined identifier menghasilkan E3001
// ---------------------------------------------------------------------------
{
  const result = parseAndResolve(`
data x = belumAda
`);
  assert.ok(result.errors.some(err => (err.code || err.kode) === 'E3001'), 'undefined identifier harus menghasilkan E3001');
  console.log('✓ undefined identifier E3001');
}

// ---------------------------------------------------------------------------
// Test 5: write ke tetap menghasilkan E3003
// ---------------------------------------------------------------------------
{
  const result = parseAndResolve(`
tetap batas = 10
simpan 20 ke batas
`);
  assert.ok(result.errors.some(err => (err.code || err.kode) === 'E3003'), 'write ke tetap harus menghasilkan E3003');
  console.log('✓ write ke tetap E3003');
}

console.log('\n✓ Semua resolver metadata tests lulus.');
