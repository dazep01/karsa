/**
 * KARSA v0.3.1 — Compiler Snapshot Safety Net
 * ----------------------------------------------------------------------------
 * Refinement lvl.4A: baseline output JS sebelum modularisasi compiler.
 *
 * Update snapshots:
 *   UPDATE_SNAPSHOTS=1 node tester/test-compiler-snapshots.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Karsa = require('../engine/karsa');

const SNAP_DIR = path.resolve(__dirname, 'snapshots', 'compiler');
const UPDATE = process.env.UPDATE_SNAPSHOTS === '1';

const cases = [
  {
    name: 'data-declaration',
    source: `
data hitungan = 0
`
  },
  {
    name: 'turunan-computed',
    source: `
data harga = 10
data jumlah = 2
turunan total = harga * jumlah
`
  },
  {
    name: 'dom-buat',
    source: `
buat div#app
  buat h1 -> teks: "Halo"
  buat p#info -> teks: "KARSA"
`
  },
  {
    name: 'event-handler',
    source: `
data hitungan = 0
buat tombol#tambah -> teks: "+"

ketika tombol#tambah diklik:
  tambahkan 1 ke hitungan
`
  },
  {
    name: 'watcher',
    source: `
data hitungan = 0
saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
`
  },
  {
    name: 'component',
    source: `
komponen Kartu(nama: teks):
  buat div#kartu
    buat h1 -> teks: nama

gunakan Kartu dengan nama: "KARSA"
`
  },
  {
    name: 'function-return',
    source: `
fungsi tambah(a: angka, b: angka):
  kembalikan a + b

data hasil = tambah(1, 2)
`
  },
  {
    name: 'counter-full',
    source: `
data hitungan = 0

buat div#app
  buat p#angka -> teks: hitungan
  buat tombol#tambah -> teks: "+"

ketika tombol#tambah diklik:
  tambahkan 1 ke hitungan

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
`
  }
];

function normalize(js) {
  return String(js || '').replace(/\r\n/g, '\n').trim() + '\n';
}

console.log('=== RUNNING COMPILER SNAPSHOT TESTS ===\n');

fs.mkdirSync(SNAP_DIR, { recursive: true });

cases.forEach(testCase => {
  const result = Karsa.compile(testCase.source);
  assert.strictEqual(result.success, true, testCase.name + ' harus compile sukses: ' + JSON.stringify(result.errors || result.diagnostics || []));
  const actual = normalize(result.js);
  const snapPath = path.join(SNAP_DIR, testCase.name + '.snap.js');

  if (UPDATE || !fs.existsSync(snapPath)) {
    fs.writeFileSync(snapPath, actual, 'utf-8');
    console.log('↻ snapshot updated: ' + testCase.name);
    return;
  }

  const expected = normalize(fs.readFileSync(snapPath, 'utf-8'));
  assert.strictEqual(actual, expected, 'Snapshot mismatch: ' + testCase.name);
  console.log('✓ snapshot match: ' + testCase.name);
});

console.log('\n✓ Semua compiler snapshot tests lulus.');
