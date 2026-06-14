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
} else {
    console.error(`\n✗ GAGAL di tahap ${result.stage}:`);
    result.errors.forEach(err => {
        // Tampilkan kode error jika ada
        const kode = err.kode ? `[${err.kode}] ` : '[Error] ';
        
        // Tampilkan pesan
        const pesan = err.pesan || 'Kesalahan tidak diketahui';
        
        // Tampilkan lokasi jika ada (dukung berbagai format)
        let posisi = '';
        if (err.loc) {
            if (typeof err.loc.baris === 'number') {
                posisi = ` (Baris ${err.loc.baris})`;
            } else if (err.loc.start && typeof err.loc.start.line === 'number') {
                posisi = ` (Baris ${err.loc.start.line})`;
            }
        }
        
        console.error(`${kode}${pesan}${posisi}`);
        
        // Tampilkan saran jika ada
        if (err.saran) {
            console.error(`   💡 Saran: ${err.saran}`);
        }
    });
    
    // Tampilkan warnings jika ada
    if (result.warnings && result.warnings.length > 0) {
        console.error(`\n⚠ PERINGATAN:`);
        result.warnings.forEach(w => {
            console.error(`   [${w.kode}] ${w.pesan}`);
        });
    }
    
    process.exit(1);
}
