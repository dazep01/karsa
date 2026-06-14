/*!
 * Verifikasi contoh spesifikasi 15.2 & 15.3 + demo visual token stream.
 * Jalankan:  node demo-spec.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { tokenize, TT, formatError } = require("./karsa-lexer.js");

/* ----- Contoh 15.2 (Form Login + fetch bersarang) ----- */
const contoh152 =
'data sedangMemuat = salah\n' +
'\n' +
'--? Form utama untuk login pengguna\n' +
'buat div#halaman-login.terpusat\n' +
'  buat h2 -> teks: "Masuk ke Akun"\n' +
'  buat form#login\n' +
'    buat div.kolom\n' +
'      buat label -> teks: "Email"\n' +
'      buat input#email[tipe="email"][placeholder="contoh@email.com"]\n' +
'    buat div.kolom\n' +
'      buat label -> teks: "Kata Sandi"\n' +
'      buat input#sandi[tipe="password"][placeholder="Minimal 8 karakter"]\n' +
'    buat tombol#btn-masuk[tipe="submit"] -> teks: "Masuk"\n' +
'  buat p#pesan-error.tersembunyi\n' +
'\n' +
'ketika form#login disubmit:\n' +
'  ambil nilai dari input#email -> simpan ke emailKu\n' +
'  ambil nilai dari input#sandi -> simpan ke sandiKu\n' +
'\n' +
'  jika emailKu kosong:\n' +
'    tampilkan pesan-error "Email tidak boleh kosong"\n' +
'    berhenti\n' +
'\n' +
'  jika sandiKu kosong:\n' +
'    tampilkan pesan-error "Kata sandi tidak boleh kosong"\n' +
'    berhenti\n' +
'\n' +
'  jika sandiKu kurang dari 8:\n' +
'    tampilkan pesan-error "Kata sandi minimal 8 karakter"\n' +
'    berhenti\n' +
'\n' +
'  simpan benar ke sedangMemuat\n' +
'  perbarui teks tombol#btn-masuk -> "Memuat..."\n' +
'\n' +
'  ambil dari "/api/login"\n' +
'    dengan metode: "POST", data: { emailKu, sandiKu }:\n' +
'      berhasil:\n' +
'        simpan hasilnya.token ke tokenSaya\n' +
'        tampilkan notifikasi "Selamat datang!"\n' +
'        arahkan ke "/dashboard"\n' +
'      gagal:\n' +
'        tampilkan pesan-error errornya\n' +
'      selalu:\n' +
'        simpan salah ke sedangMemuat\n' +
'        perbarui teks tombol#btn-masuk -> "Masuk"\n' +
'\n' +
'saat sedangMemuat berubah:\n' +
'  jika sedangMemuat:\n' +
'    perbarui kelas tombol#btn-masuk -> "memuat"\n' +
'  jika tidak:\n' +
'    perbarui kelas tombol#btn-masuk -> ""\n';

/* ----- Contoh 15.3 (Komponen + raw JS) ----- */
const contoh153 =
'data daftarBelanja = []\n' +
'data inputBaru = ""\n' +
'\n' +
'--? Komponen satu item dalam daftar belanja\n' +
'komponen ItemBelanja(nama: teks, indeks: angka):\n' +
'  buat li.item-belanja\n' +
'    buat span -> teks: nama\n' +
'    buat tombol.hapus-item -> teks: "×"\n' +
'      ketika diklik -> hapusItem(indeks)\n' +
'\n' +
'fungsi hapusItem(i: angka):\n' +
'  ubah daftarBaru = []\n' +
'  ulangi item dari daftarBelanja:\n' +
'    jika item.indeks tidak sama dengan i:\n' +
'      tambahkan item ke daftarBaru\n' +
'  simpan daftarBaru ke daftarBelanja\n' +
'\n' +
'buat div#app\n' +
'  buat h1 -> teks: "Daftar Belanja"\n' +
'  buat div.tambah-item\n' +
'    buat input#input-item[placeholder="Nama barang..."]\n' +
'    buat tombol#btn-tambah -> teks: "Tambah"\n' +
'  buat ul#daftar-belanja\n' +
'  buat p#pesan-kosong -> teks: "Daftar masih kosong"\n' +
'\n' +
'ketika tombol#btn-tambah diklik:\n' +
'  ambil nilai dari input#input-item -> simpan ke namaBaru\n' +
'  jika namaBaru tidak kosong:\n' +
'    tambahkan namaBaru ke daftarBelanja\n' +
'    perbarui nilai input#input-item -> ""\n' +
'\n' +
'ketika input#input-item ditekan:\n' +
'  langsung:\n' +
'    if (event.key === "Enter") {\n' +
'      document.querySelector("#btn-tambah").click()\n' +
'    }\n' +
'\n' +
'saat daftarBelanja berubah:\n' +
'  kosongkan ul#daftar-belanja\n' +
'  ulangi item dari daftarBelanja:\n' +
'    gunakan ItemBelanja\n' +
'      dengan nama: item, indeks: item.indeks\n' +
'      di ul#daftar-belanja\n' +
'  jika daftarBelanja.panjang lebih dari 0:\n' +
'    sembunyikan p#pesan-kosong\n' +
'  jika tidak:\n' +
'    tampilkan p#pesan-kosong\n';

function lint(name, src) {
  console.log("\n" + "=".repeat(70));
  console.log(" CONTOH: " + name);
  console.log("=".repeat(70));
  const r = tokenize(src);
  console.log("Token       : " + r.tokens.length);
  console.log("Error       : " + r.errors.length);
  console.log("Warning     : " + r.warnings.length);
  const indents = r.tokens.filter(function (t) { return t.tipe === TT.TK_INDENT; }).length;
  const dedents = r.tokens.filter(function (t) { return t.tipe === TT.TK_DEDENT; }).length;
  console.log("INDENT/DEDENT: " + indents + " / " + dedents + (indents === dedents ? "  ✓ seimbang" : "  ✗ TIDAK seimbang"));
  if (r.errors.length) {
    console.log("\n--- ERROR ---");
    r.errors.forEach(function (e) { console.log(formatError(e) + "\n"); });
  }
  if (r.warnings.length) {
    console.log("\n--- WARNING ---");
    r.warnings.forEach(function (w) { console.log("⚠ Baris " + w.baris + " [" + w.kode + "] " + w.pesan); });
  }
  return r;
}

const r152 = lint("15.2 Form Login + Fetch", contoh152);
const r153 = lint("15.3 Komponen + Raw JS", contoh153);

/* ----- Demo visual: cetak token stream untuk cuplikan kecil ----- */
function dumpTokens(src, label) {
  console.log("\n" + "-".repeat(70));
  console.log(" TOKEN STREAM: " + label);
  console.log("-".repeat(70));
  const r = tokenize(src);
  r.tokens.forEach(function (t) {
    let s = String(t.baris).padStart(2) + ":" + String(t.kolom).padStart(2) + "  " + t.tipe.padEnd(22) + " ";
    let v = t.nilai;
    if (t.tipe === TT.TK_BLOK_LANGSUNG) v = "«" + v.replace(/\n/g, "\\n") + "»";
    else if (t.tipe === TT.TK_BARIS_BARU) v = "\\n";
    else v = JSON.stringify(v);
    s += v;
    if (t.docstring) s += "   📝" + JSON.stringify(t.docstring);
    console.log(s);
  });
}

dumpTokens(
  '--? Form login\n' +
  'buat div#halaman-login.terpusat\n' +
  '  buat input#email[tipe="email"][placeholder="x@y.z"]\n' +
  'ketika form#login disubmit:\n' +
  '  ambil nilai dari input#email -> simpan ke emailKu\n',
  "cuplikan selektor + atribut + ambil-DOM"
);

dumpTokens(
  'jika sandiKu kurang dari 8:\n' +
  '  tampilkan pesan-error "Kata sandi minimal 8 karakter"\n' +
  '  berhenti\n' +
  'jika tidak:\n' +
  '  tampilkan notifikasi "ok"\n',
  "cuplikan kondisi + jika-tidak"
);

/* ----- Statistik akhir ----- */
console.log("\n" + "=".repeat(70));
console.log(" RINGKASAN");
console.log("=".repeat(70));
const allOk = r152.errors.length === 0 && r153.errors.length === 0;
console.log("Contoh 15.2 : " + (r152.errors.length === 0 ? "✓ BERSIH (0 error)" : "✗ ada error"));
console.log("Contoh 15.3 : " + (r153.errors.length === 0 ? "✓ BERSIH (0 error)" : "✗ ada error"));
console.log(allOk ? "\n✓ Kedua contoh spesifikasi kompleks ter-tokenisasi tanpa error lexer." : "\n✗ Ada masalah.");
process.exit(allOk ? 0 : 1);
