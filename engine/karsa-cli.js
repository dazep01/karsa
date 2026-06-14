#!/usr/bin/env node
/**
 * KARSA v0.3.1 — Command Line Interface
 * ----------------------------------------------------------------------------
 * Menjalankan file .ks langsung dari terminal menggunakan Node.js
 */

const fs = require('fs');
const path = require('path');
const Karsa = require('./karsa');

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("Penggunaan: karsa <file.ks>");
    process.exit(1);
}

const filePath = path.resolve(args[0]);
if (!fs.existsSync(filePath)) {
    console.error(`Error: File tidak ditemukan: ${filePath}`);
    process.exit(1);
}

const source = fs.readFileSync(filePath, 'utf-8');
const result = Karsa.compile(source, { source: path.basename(filePath) });

if (result.success) {
    console.log("// --- Hasil Kompilasi JavaScript ---");
    console.log(result.js);
    // Jika ingin langsung dijalankan di Node (butuh DOM emulator seperti JSDOM)
    // console.log("\n// Catatan: Untuk menjalankan ini di Node, gunakan JSDOM.");
} else {
    console.error(`\n✗ GAGAL di tahap ${result.stage}:`);
    result.errors.forEach(err => {
        console.error(`[${err.kode || 'Error'}] ${err.pesan} ${err.loc ? `(Baris ${err.loc.start.line})` : ''}`);
    });
    process.exit(1);
}
