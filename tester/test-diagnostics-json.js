/**
 * KARSA v0.3.1 — Diagnostics JSON Test Suite
 * ----------------------------------------------------------------------------
 * Refinement lvl.1: memastikan `karsa check --json` stabil dan valid untuk tooling.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI = path.resolve(__dirname, '..', 'engine', 'karsa-cli.js');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'karsa-diag-'));

function writeTemp(name, content) {
  const file = path.join(TMP_DIR, name);
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

function runCheckJson(file, extraArgs) {
  const args = [CLI, 'check', file, '--json'].concat(extraArgs || []);
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf-8'
  });

  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch (err) {
    console.error('STDOUT tidak valid JSON:');
    console.error(result.stdout);
    console.error('STDERR:');
    console.error(result.stderr);
    throw err;
  }

  return { result, json };
}

function assertDiagnosticShape(diag) {
  assert.ok(diag.code, 'diagnostic.code wajib ada');
  assert.ok(['error', 'warning', 'info'].includes(diag.severity), 'diagnostic.severity tidak valid');
  assert.ok(diag.stage, 'diagnostic.stage wajib ada');
  assert.strictEqual(diag.stage, diag.stage.toLowerCase(), 'diagnostic.stage harus lowercase pada JSON publik');
  assert.ok(typeof diag.message === 'string', 'diagnostic.message wajib string');
  assert.ok(Object.prototype.hasOwnProperty.call(diag, 'suggestion'), 'diagnostic.suggestion wajib ada');
  assert.ok(Object.prototype.hasOwnProperty.call(diag, 'loc'), 'diagnostic.loc wajib ada meski null');
}

console.log('=== RUNNING DIAGNOSTICS JSON TESTS ===\n');

// ---------------------------------------------------------------------------
// Test 1: file valid tanpa diagnostics
// ---------------------------------------------------------------------------
{
  const file = writeTemp('valid.ks', 'buat h1 -> teks: "Halo"\n');
  const { result, json } = runCheckJson(file);

  assert.strictEqual(result.status, 0, 'file valid harus exit 0');
  assert.strictEqual(json.version, '0.3.1');
  assert.strictEqual(json.command, 'check');
  assert.strictEqual(json.file, file);
  assert.strictEqual(json.success, true);
  assert.ok(Array.isArray(json.diagnostics));
  assert.ok(Array.isArray(json.errors));
  assert.ok(Array.isArray(json.warnings));
  assert.strictEqual(json.diagnostics.length, 0);
  assert.strictEqual(json.errors.length, 0);
  assert.strictEqual(json.warnings.length, 0);

  console.log('✓ check --json valid tanpa diagnostics');
}

// ---------------------------------------------------------------------------
// Test 2: warning W4101 dan W4102 tetap success true
// ---------------------------------------------------------------------------
{
  const file = writeTemp('usage-warnings.ks', [
    'data x = 1',
    'ubah y = 0',
    'simpan 2 ke y',
    ''
  ].join('\n'));
  const { result, json } = runCheckJson(file);

  assert.strictEqual(result.status, 0, 'warning saja harus tetap exit 0');
  assert.strictEqual(json.success, true, 'warning saja harus success true');
  assert.ok(json.warnings.length >= 2, 'harus ada minimal dua warning');
  assert.strictEqual(json.errors.length, 0, 'warning saja tidak boleh mengisi errors');

  const codes = json.warnings.map(w => w.code);
  assert.ok(codes.includes('W4101'), 'harus ada W4101');
  assert.ok(codes.includes('W4102'), 'harus ada W4102');
  json.diagnostics.forEach(assertDiagnosticShape);

  console.log('✓ check --json warning W4101/W4102 dan success true');
}

// ---------------------------------------------------------------------------
// Test 3: analyzer error menghasilkan success false dan exit 1
// ---------------------------------------------------------------------------
{
  const file = writeTemp('analyzer-error.ks', 'berhenti\n');
  const { result, json } = runCheckJson(file);

  assert.strictEqual(result.status, 1, 'analyzer error harus exit 1');
  assert.strictEqual(json.success, false, 'analyzer error harus success false');
  assert.ok(json.errors.length >= 1, 'harus ada error');
  assert.ok(json.diagnostics.length >= 1, 'diagnostics harus terisi');
  assert.ok(json.errors.some(e => e.code === 'E4011'), 'harus ada E4011');
  json.diagnostics.forEach(assertDiagnosticShape);

  console.log('✓ check --json analyzer error dan exit 1');
}

// ---------------------------------------------------------------------------
// Test 4: --strict-usage memperingatkan fungsi/komponen yang tidak dipakai
// ---------------------------------------------------------------------------
{
  const file = writeTemp('strict-usage.ks', [
    'fungsi bantu():',
    '  kembalikan 1',
    ''
  ].join('\n'));

  const normal = runCheckJson(file).json;
  const strict = runCheckJson(file, ['--strict-usage']).json;

  assert.strictEqual(normal.success, true, 'normal mode harus tetap success');
  assert.ok(!normal.warnings.some(w => w.code === 'W4101' && /bantu/.test(w.message)), 'normal mode tidak memperingatkan fungsi unused');
  assert.ok(strict.warnings.some(w => w.code === 'W4101' && /bantu/.test(w.message)), 'strict mode harus memperingatkan fungsi unused');

  console.log('✓ check --json --strict-usage untuk fungsi/komponen unused');
}

// ---------------------------------------------------------------------------
// Test 5: file tidak ditemukan tetap menghasilkan JSON valid
// ---------------------------------------------------------------------------
{
  const file = path.join(TMP_DIR, 'tidak-ada.ks');
  const { result, json } = runCheckJson(file);

  assert.strictEqual(result.status, 1, 'file tidak ditemukan harus exit 1');
  assert.strictEqual(json.success, false, 'file tidak ditemukan harus success false');
  assert.ok(json.errors.length >= 1, 'harus ada error file-not-found');
  assert.ok(json.diagnostics.length >= 1, 'diagnostics harus terisi');
  assert.ok(json.errors.some(e => e.code === 'E0000'), 'harus ada E0000');
  json.diagnostics.forEach(assertDiagnosticShape);

  console.log('✓ check --json file-not-found tetap JSON valid');
}

console.log('\n✓ Semua diagnostics JSON tests lulus.');
