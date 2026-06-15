/**
 * KARSA v0.3.1 — Unified Error Code Registry
 * ============================================================================
 * Mendaftarkan semua kode error dan warning lintas tahap pipeline KARSA.
 * Konvensi penomoran:
 *   E1xxx / W1xxx — Lexer
 *   E2xxx / W2xxx — Parser
 *   E3xxx / W3xxx — Resolver
 *   E4xxx / W4xxx — Analyzer
 *   E5xxx / W5xxx — Compiler
 *   E6xxx / W6xxx — Runtime / Engine
 *   E0xxx         — System-level errors
 */

// ═══════════════════════════════════════════════════════════════
// LEXER (E1xxx / W1xxx)
// ═══════════════════════════════════════════════════════════════

var E1001 = 'E1001'; // Indentasi ganjil (bukan kelipatan 2)
var E1002 = 'E1002'; // Karakter TAB ditemukan di indentasi
var E1003 = 'E1003'; // DEDENT tidak cocok dengan level manapun
var E1004 = 'E1004'; // String tidak ditutup
var E1005 = 'E1005'; // Karakter tidak dikenali
var E1006 = 'E1006'; // Komentar blok [[ tidak ditutup ]]
var E1007 = 'E1007'; // Blok DocString [[ tidak ditutup ]]
var E1008 = 'E1008'; // Angka literal tidak valid
var E1009 = 'E1009'; // Selector CSS tidak valid

var W1001 = 'W1001'; // DocString tidak menempel ke node manapun

// ═══════════════════════════════════════════════════════════════
// PARSER (E2xxx / W2xxx)
// ═══════════════════════════════════════════════════════════════

var E2001 = 'E2001'; // Token tidak sesuai yang diharapkan
var E2002 = 'E2002'; // Selector tidak valid
var E2003 = 'E2003'; // Nama komponen harus diawali huruf kapital
var E2004 = 'E2004'; // Blok aksi diharapkan setelah ':'
var E2005 = 'E2005'; // Kurung tutup ')' tidak ditemukan
var E2006 = 'E2006'; // Kurung kurawal tutup '}' tidak ditemukan
var E2007 = 'E2007'; // Kurung siku tutup ']' tidak ditemukan
var E2008 = 'E2008'; // Nilai awal diharapkan setelah '='
var E2009 = 'E2009'; // Kondisi tidak valid
var E2010 = 'E2010'; // Keyword tidak dikenali di posisi statement
var E2011 = 'E2011'; // Operator tidak didukung
var E2012 = 'E2012'; // Argumen fungsi tidak valid
var E2013 = 'E2013'; // Parameter komponen/fungsi tidak valid
var E2014 = 'E2014'; // Properti objek literal tidak valid
var E2015 = 'E2015'; // Selector CSS tidak valid
var E2016 = 'E2016'; // Token '->' diharapkan
var E2017 = 'E2017'; // Target event tidak valid
var E2018 = 'E2018'; // Nama event tidak valid
var E2019 = 'E2019'; // 'jika tidak' hanya valid di akhir rantai jika/kalau
var E2020 = 'E2020'; // Indentasi tidak konsisten
var E2021 = 'E2021'; // Sumber data ulangi tidak valid
var E2022 = 'E2022'; // Target tampilkan tidak valid
var E2023 = 'E2023'; // Token tidak terduga di akhir file
var E2024 = 'E2024'; // ambil tanpa konteks yang jelas
var E2025 = 'E2025'; // Daftar props gunakan tidak valid
var E2026 = 'E2026'; // Ekspresi kosong tidak valid
var E2027 = 'E2027'; // Properti perbarui tidak dikenali
var E2028 = 'E2028'; // Body komponen/fungsi kosong

var W2001 = 'W2001'; // DocString tidak menempel ke node manapun
var W2002 = 'W2002'; // Blok kosong terdeteksi
var W2003 = 'W2003'; // Rantai jika tanpa cabang jika tidak
var W2004 = 'W2004'; // Jumlah argumen mungkin tidak sesuai

// ═══════════════════════════════════════════════════════════════
// RESOLVER (E3xxx / W3xxx)
// ═══════════════════════════════════════════════════════════════

var E3001 = 'E3001'; // Identifier tidak dideklarasikan (undefined)
var E3002 = 'E3002'; // Simbol sudah dideklarasikan dalam scope yang sama (duplikat)
var E3003 = 'E3003'; // Menulis ke variabel tetap (const)
var E3004 = 'E3004'; // Menggunakan komponen sebelum dideklarasi
var E3005 = 'E3005'; // "ketika" tanpa target di luar blok buat/komponen

var W3001 = 'W3001'; // Variabel dideklarasikan tapi tidak pernah digunakan
var W3002 = 'W3002'; // Variabel shadowing variabel di scope luar
var W3003 = 'W3003'; // Watcher target bukan data reaktif

// ═══════════════════════════════════════════════════════════════
// ANALYZER (E4xxx / W4xxx)
// ═══════════════════════════════════════════════════════════════

var E4001 = 'E4001'; // Lifecycle hook di luar komponen
var E4002 = 'E4002'; // Aksi side-effect di dalam ekspresi turunan
var E4003 = 'E4003'; // Tipe data tidak kompatibel
var E4004 = 'E4004'; // Menulis ke data turunan (read-only)
var E4005 = 'E4005'; // Parameter duplikat dalam komponen
var E4006 = 'E4006'; // Parameter tanpa default setelah parameter dengan default
var E4007 = 'E4007'; // Mode tampilkan tidak valid
var E4008 = 'E4008'; // Properti perbarui tidak didukung
var E4009 = 'E4009'; // Event name tidak dikenali
var E4010 = 'E4010'; // Penggunaan gunakan untuk non-komponen
var E4011 = 'E4011'; // berhenti di luar konteks loop/handler
var E4012 = 'E4012'; // lewati di luar konteks loop
var E4013 = 'E4013'; // kembalikan di luar fungsi/komponen

var W4001 = 'W4001'; // Type hint tidak cocok dengan nilai
var W4002 = 'W4002'; // Lifecycle hook di dalam loop/handler
var W4003 = 'W4003'; // Deklarasi tetap tanpa nilai awal
var W4004 = 'W4004'; // Potensi bug: perbandingan assignment

// ═══════════════════════════════════════════════════════════════
// COMPILER (E5xxx / W5xxx)
// ═══════════════════════════════════════════════════════════════

var E5001 = 'E5001'; // Node AST tidak didukung oleh compiler
var E5002 = 'E5002'; // Gagal menurunkan ekspresi ke JavaScript
var E5003 = 'E5003'; // Selector tidak dapat dikompilasi

var W5001 = 'W5001'; // Kode yang dihasilkan mungkin tidak berjalan sesuai harapan
var W5002 = 'W5002'; // Fitur eksperimental digunakan

// ═══════════════════════════════════════════════════════════════
// RUNTIME / ENGINE (E6xxx / W6xxx)
// ═══════════════════════════════════════════════════════════════

var E6001 = 'E6001'; // berhenti di luar konteks loop/handler
var E6002 = 'E6002'; // lewati di luar konteks loop
var E6003 = 'E6003'; // kembalikan di luar fungsi/komponen
var E6004 = 'E6004'; // Pipeline gagal (system error)

// ═══════════════════════════════════════════════════════════════
// SYSTEM (E0xxx)
// ═══════════════════════════════════════════════════════════════

var E0000 = 'E0000'; // System error (unhandled exception)

// ═══════════════════════════════════════════════════════════════
// ERROR MESSAGES (unified registry)
// ═══════════════════════════════════════════════════════════════

var ERROR_MESSAGES = {};

// -- Lexer --
ERROR_MESSAGES[E1001] = 'Indentasi tidak valid: {n} spasi ditemukan, Karsa memakai 2 spasi per level';
ERROR_MESSAGES[E1002] = 'Indentasi tidak valid: karakter TAB ditemukan';
ERROR_MESSAGES[E1003] = 'Indentasi tidak konsisten: {n} spasi tidak cocok dengan level indentasi manapun';
ERROR_MESSAGES[E1004] = 'String tidak ditutup: tanda kutip penutup tidak ditemukan';
ERROR_MESSAGES[E1005] = 'Karakter tidak dikenali: "{char}"';
ERROR_MESSAGES[E1006] = 'Komentar blok "[[" tidak ditutup dengan "]]"';
ERROR_MESSAGES[E1007] = 'Blok DocString "[[" tidak ditutup dengan "]]"';
ERROR_MESSAGES[E1008] = 'Angka literal tidak valid';
ERROR_MESSAGES[E1009] = 'Selector CSS tidak valid';

// -- Parser --
ERROR_MESSAGES[E2001] = 'Diharapkan {expected}, tetapi ditemukan "{actual}"';
ERROR_MESSAGES[E2002] = 'Selector tidak valid';
ERROR_MESSAGES[E2003] = 'Nama komponen harus diawali huruf kapital';
ERROR_MESSAGES[E2004] = 'Blok aksi diharapkan setelah ":"';
ERROR_MESSAGES[E2005] = 'Kurung tutup ")" tidak ditemukan';
ERROR_MESSAGES[E2006] = 'Kurung kurawal tutup "}" tidak ditemukan';
ERROR_MESSAGES[E2007] = 'Kurung siku tutup "]" tidak ditemukan';
ERROR_MESSAGES[E2008] = 'Nilai awal diharapkan setelah "="';
ERROR_MESSAGES[E2009] = 'Kondisi tidak valid';
ERROR_MESSAGES[E2010] = 'Keyword tidak dikenali di posisi statement';
ERROR_MESSAGES[E2011] = 'Operator tidak didukung';
ERROR_MESSAGES[E2012] = 'Argumen fungsi tidak valid';
ERROR_MESSAGES[E2013] = 'Parameter komponen/fungsi tidak valid';
ERROR_MESSAGES[E2014] = 'Properti objek literal tidak valid';
ERROR_MESSAGES[E2015] = 'Selector CSS tidak valid';
ERROR_MESSAGES[E2016] = 'Token "->" diharapkan';
ERROR_MESSAGES[E2017] = 'Target event tidak valid';
ERROR_MESSAGES[E2018] = 'Nama event tidak valid';
ERROR_MESSAGES[E2019] = '"jika tidak" hanya valid di akhir rantai "jika"/"kalau"';
ERROR_MESSAGES[E2020] = 'Indentasi tidak konsisten';
ERROR_MESSAGES[E2021] = 'Sumber data ulangi tidak valid';
ERROR_MESSAGES[E2022] = 'Target "tampilkan" tidak valid';
ERROR_MESSAGES[E2023] = 'Token tidak terduga di akhir file';
ERROR_MESSAGES[E2024] = '"ambil" tanpa konteks yang jelas';
ERROR_MESSAGES[E2025] = 'Daftar props "gunakan" tidak valid';
ERROR_MESSAGES[E2026] = 'Ekspresi kosong tidak valid';
ERROR_MESSAGES[E2027] = 'Properti perbarui tidak dikenali';
ERROR_MESSAGES[E2028] = 'Body komponen/fungsi kosong';

// -- Resolver --
ERROR_MESSAGES[E3001] = 'Identifier "{name}" tidak dideklarasikan';
ERROR_MESSAGES[E3002] = 'Simbol "{name}" sudah dideklarasikan dalam scope yang sama';
ERROR_MESSAGES[E3003] = 'Variabel tetap "{name}" tidak dapat diubah setelah inisialisasi';
ERROR_MESSAGES[E3004] = 'Komponen "{name}" digunakan sebelum dideklarasi';
ERROR_MESSAGES[E3005] = '"ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen"';

// -- Analyzer --
ERROR_MESSAGES[E4001] = 'Lifecycle hook hanya valid di dalam komponen';
ERROR_MESSAGES[E4002] = 'Ekspresi turunan tidak boleh mengandung aksi side-effect';
ERROR_MESSAGES[E4003] = 'Tipe data tidak kompatibel';
ERROR_MESSAGES[E4004] = 'Data turunan "{name}" bersifat read-only dan tidak boleh diubah';
ERROR_MESSAGES[E4005] = 'Parameter duplikat dalam komponen';
ERROR_MESSAGES[E4006] = 'Parameter tanpa default tidak boleh setelah parameter dengan default';
ERROR_MESSAGES[E4007] = 'Mode tampilkan tidak valid';
ERROR_MESSAGES[E4008] = 'Properti perbarui tidak didukung';
ERROR_MESSAGES[E4009] = 'Event name tidak dikenali';
ERROR_MESSAGES[E4010] = 'Penggunaan "gunakan" untuk non-komponen';
ERROR_MESSAGES[E4011] = '"berhenti" tidak valid di luar loop atau event handler';
ERROR_MESSAGES[E4012] = '"lewati" tidak valid di luar loop';
ERROR_MESSAGES[E4013] = '"kembalikan" tidak valid di luar fungsi atau komponen';

// -- Compiler --
ERROR_MESSAGES[E5001] = 'Node AST bertipe "{type}" tidak didukung oleh compiler';
ERROR_MESSAGES[E5002] = 'Gagal menurunkan ekspresi ke JavaScript';
ERROR_MESSAGES[E5003] = 'Selector tidak dapat dikompilasi';

// -- Runtime --
ERROR_MESSAGES[E6001] = '"berhenti" tidak valid di luar loop atau handler';
ERROR_MESSAGES[E6002] = '"lewati" tidak valid di luar loop';
ERROR_MESSAGES[E6003] = '"kembalikan" tidak valid di luar fungsi atau komponen';
ERROR_MESSAGES[E6004] = 'Pipeline gagal';

// -- System --
ERROR_MESSAGES[E0000] = 'System error';

// ═══════════════════════════════════════════════════════════════
// SUGGESTIONS (unified registry)
// ═══════════════════════════════════════════════════════════════

var ERROR_SUGGESTIONS = {};

// -- Lexer --
ERROR_SUGGESTIONS[E1001] = 'Gunakan 2, 4, 6, atau 8 spasi (kelipatan 2)';
ERROR_SUGGESTIONS[E1002] = 'Ganti semua tab menjadi spasi (2, 4, 6, ...)';
ERROR_SUGGESTIONS[E1003] = 'Periksa baris di atasnya dan gunakan indentasi yang konsisten';
ERROR_SUGGESTIONS[E1004] = 'Tambahkan tanda kutip penutup yang sesuai';
ERROR_SUGGESTIONS[E1005] = 'Periksa karakter dan pastikan sesuai dengan spesifikasi KARSA';
ERROR_SUGGESTIONS[E1006] = 'Tambahkan "]]" untuk menutup komentar blok';
ERROR_SUGGESTIONS[E1007] = 'Tambahkan "]]" untuk menutup blok DocString';
ERROR_SUGGESTIONS[E1008] = 'Periksa format angka (desimal, heksadesimal, dll.)';
ERROR_SUGGESTIONS[E1009] = 'Pastikan selector CSS valid (#id, .class, tag)';

// -- Parser --
ERROR_SUGGESTIONS[E2001] = 'Periksa sintaksis pada lokasi yang ditunjuk';
ERROR_SUGGESTIONS[E2002] = 'Pastikan selector diawali nama tag HTML atau identifier';
ERROR_SUGGESTIONS[E2003] = 'Gunakan PascalCase untuk nama komponen';
ERROR_SUGGESTIONS[E2004] = 'Tambahkan indentasi atau "->" untuk aksi tunggal';
ERROR_SUGGESTIONS[E2005] = 'Tambahkan ")" pada akhir ekspresi';
ERROR_SUGGESTIONS[E2006] = 'Tambahkan "}" pada akhir objek literal';
ERROR_SUGGESTIONS[E2007] = 'Tambahkan "]" pada akhir array/atribut';
ERROR_SUGGESTIONS[E2008] = 'Tambahkan nilai setelah "="';
ERROR_SUGGESTIONS[E2009] = 'Periksa ekspresi kondisi';
ERROR_SUGGESTIONS[E2010] = 'Periksa konteks penggunaan keyword';
ERROR_SUGGESTIONS[E2011] = 'Gunakan "langsung:" untuk operasi yang tidak didukung';
ERROR_SUGGESTIONS[E2012] = 'Periksa sintaksis argumen';
ERROR_SUGGESTIONS[E2013] = 'Periksa sintaksis parameter';
ERROR_SUGGESTIONS[E2014] = 'Periksa sintaksis objek literal';
ERROR_SUGGESTIONS[E2015] = 'Periksa konteks penggunaan selector';
ERROR_SUGGESTIONS[E2016] = 'Gunakan pola: perbarui <properti> <target> -> <nilai>';
ERROR_SUGGESTIONS[E2017] = 'Periksa target dan nama event';
ERROR_SUGGESTIONS[E2018] = 'Periksa nama event (diklik, diketik, dsb.)';
ERROR_SUGGESTIONS[E2019] = 'Pastikan "jika tidak" mengikuti "jika" atau "kalau"';
ERROR_SUGGESTIONS[E2020] = 'Periksa indentasi (2 spasi per level)';
ERROR_SUGGESTIONS[E2021] = 'Gunakan: ulangi <nama> dari <sumber>: / ulangi <N> kali: / ulangi <nama> dari <A> sampai <B>:';
ERROR_SUGGESTIONS[E2022] = 'Periksa target tampilkan';
ERROR_SUGGESTIONS[E2023] = 'Ini menandakan bug Lexer; laporkan ke tim';
ERROR_SUGGESTIONS[E2024] = 'Gunakan: ambil <jenis> dari <sumber> -> simpan ke <nama> atau ambil dari <url>:';
ERROR_SUGGESTIONS[E2025] = 'Gunakan: gunakan <Komponen> dengan <prop>: <nilai>';
ERROR_SUGGESTIONS[E2026] = 'Tambahkan ekspresi yang valid';
ERROR_SUGGESTIONS[E2027] = 'Gunakan properti yang didukung: teks, html, kelas, src, href, dll.';
ERROR_SUGGESTIONS[E2028] = 'Tambahkan setidaknya satu statement di dalam body';

// -- Resolver --
ERROR_SUGGESTIONS[E3001] = 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu';
ERROR_SUGGESTIONS[E3002] = 'Gunakan nama yang berbeda atau hapus deklarasi duplikat';
ERROR_SUGGESTIONS[E3003] = 'Gunakan "ubah" jika variabel perlu diubah, bukan "tetap"';
ERROR_SUGGESTIONS[E3004] = 'Pindahkan deklarasi komponen sebelum penggunaannya';
ERROR_SUGGESTIONS[E3005] = 'Tambahkan target pada "ketika" atau letakkan di dalam blok "buat"/"komponen"';

// -- Analyzer --
ERROR_SUGGESTIONS[E4001] = 'Pindahkan lifecycle hook ke dalam definisi komponen';
ERROR_SUGGESTIONS[E4002] = 'Hapus aksi simpan/tambahkan/kurangi dari ekspresi turunan';
ERROR_SUGGESTIONS[E4003] = 'Pastikan tipe data operan kompatibel';
ERROR_SUGGESTIONS[E4004] = 'Gunakan data (var) biasa jika perlu mengubah nilainya';
ERROR_SUGGESTIONS[E4005] = 'Hapus salah satu deklarasi parameter';
ERROR_SUGGESTIONS[E4006] = 'Pindahkan parameter dengan default ke akhir daftar';
ERROR_SUGGESTIONS[E4007] = 'Mode yang valid: tambahkan, ganti, awalan, sebelum, sesudah';
ERROR_SUGGESTIONS[E4008] = 'Gunakan properti yang didukung oleh perbarui';
ERROR_SUGGESTIONS[E4009] = 'Gunakan nama event yang valid: diklik, diketik, ditekan, dll.';
ERROR_SUGGESTIONS[E4010] = 'Pastikan nama yang direferensikan adalah komponen (PascalCase)';
ERROR_SUGGESTIONS[E4011] = '"berhenti" hanya valid di dalam loop atau event handler';
ERROR_SUGGESTIONS[E4012] = 'Gunakan "lewati" hanya di dalam "ulangi" atau "selama"';
ERROR_SUGGESTIONS[E4013] = 'Gunakan "kembalikan" hanya di dalam fungsi atau komponen';

// -- Compiler --
ERROR_SUGGESTIONS[E5001] = 'Periksa apakah node type sudah didukung oleh compiler';
ERROR_SUGGESTIONS[E5002] = 'Sederhanakan ekspresi atau gunakan "langsung:" untuk JS interop';
ERROR_SUGGESTIONS[E5003] = 'Periksa format selector CSS';

// -- Runtime --
ERROR_SUGGESTIONS[E6001] = '"berhenti" hanya valid di dalam loop atau event handler';
ERROR_SUGGESTIONS[E6002] = 'Gunakan "lewati" hanya di dalam "ulangi" atau "selama"';
ERROR_SUGGESTIONS[E6003] = 'Gunakan "kembalikan" hanya di dalam fungsi atau komponen';
ERROR_SUGGESTIONS[E6004] = 'Lihat detail error pada tahap yang gagal';

// ═══════════════════════════════════════════════════════════════
// SEVERITY HELPER
// ═══════════════════════════════════════════════════════════════

/**
 * Mendapatkan severity berdasarkan kode error.
 * @param {string} code - Kode error (Exxxx atau Wxxxx)
 * @returns {string} 'error' atau 'warning'
 */
function getSeverity(code) {
  if (!code) return 'error';
  return code.charAt(0) === 'W' ? 'warning' : 'error';
}

/**
 * Mendapatkan tahap pipeline berdasarkan kode error.
 * @param {string} code - Kode error
 * @returns {string} Nama tahap: 'Lexer', 'Parser', 'Resolver', 'Analyzer', 'Compiler', 'Runtime', 'System'
 */
function getStage(code) {
  if (!code || code.length < 2) return 'System';
  var stageNum = code.charAt(1);
  switch (stageNum) {
    case '1': return 'Lexer';
    case '2': return 'Parser';
    case '3': return 'Resolver';
    case '4': return 'Analyzer';
    case '5': return 'Compiler';
    case '6': return 'Runtime';
    default: return 'System';
  }
}

/**
 * Membuat objek error terformat dari kode error.
 * @param {string} code - Kode error
 * @param {object} loc - SourceLocation { start, end }
 * @param {object} [overrides] - Properti opsional untuk override
 * @returns {object} Objek error terformat
 */
function createError(code, loc, overrides) {
  var severity = getSeverity(code);
  var msg = ERROR_MESSAGES[code] || 'Error tidak dikenal';
  var saran = ERROR_SUGGESTIONS[code] || '';
  var err = {
    code: code,
    kode: code,
    severity: severity,
    stage: getStage(code),
    message: msg,
    pesan: msg,
    suggestion: saran,
    saran: saran,
    loc: loc
  };
  if (overrides) {
    for (var key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        err[key] = overrides[key];
      }
    }
  }
  // Sinkronkan alias jika overrides mengubah field utama
  if (err.message !== msg) err.pesan = err.message;
  if (err.suggestion !== saran) err.saran = err.suggestion;
  return err;
}

/**
 * Alias untuk createError — kompatibilitas mundur dengan parser.
 * Parser menggunakan Err.buatParseError(code, loc, overrides).
 *
 * Sejak v0.3.1-patch: createError() sudah menghasilkan field kode/pesan/saran
 * secara otomatis, sehingga fungsi ini hanya menjadi wrapper langsung.
 *
 * @param {string} code - Kode error
 * @param {object} loc - SourceLocation { start, end }
 * @param {object} [overrides] - Properti opsional untuk override
 * @returns {object} Objek error terformat (format: kode/pesan/saran/loc/severity)
 */
function buatParseError(code, loc, overrides) {
  return createError(code, loc, overrides);
}

/**
 * Format error untuk tampilan pengguna.
 * @param {object} err - Objek error
 * @returns {string} Pesan yang diformat
 */
function formatError(err) {
  var locStr = '';
  if (err.loc && err.loc.start) {
    locStr = 'Baris ' + err.loc.start.line + ', Kolom ' + err.loc.start.column;
  } else if (err.baris !== undefined) {
    locStr = 'Baris ' + err.baris + ', Kolom ' + err.kolom;
  }
  var prefix = err.severity === 'warning' ? '⚠' : '✗';
  var stageStr = err.stage ? ' [' + err.stage + ']' : '';
  return prefix + ' ' + locStr + stageStr + ' [' + err.code + ']\n' +
    err.message + '\n' +
    (err.suggestion || err.saran ? 'Saran: ' + (err.suggestion || err.saran) : '');
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Lexer errors
  E1001: E1001, E1002: E1002, E1003: E1003, E1004: E1004,
  E1005: E1005, E1006: E1006, E1007: E1007, E1008: E1008, E1009: E1009,
  W1001: W1001,

  // Parser errors
  E2001: E2001, E2002: E2002, E2003: E2003, E2004: E2004,
  E2005: E2005, E2006: E2006, E2007: E2007, E2008: E2008,
  E2009: E2009, E2010: E2010, E2011: E2011, E2012: E2012,
  E2013: E2013, E2014: E2014, E2015: E2015, E2016: E2016,
  E2017: E2017, E2018: E2018, E2019: E2019, E2020: E2020,
  E2021: E2021, E2022: E2022, E2023: E2023, E2024: E2024,
  E2025: E2025, E2026: E2026, E2027: E2027, E2028: E2028,
  W2001: W2001, W2002: W2002, W2003: W2003, W2004: W2004,

  // Resolver errors
  E3001: E3001, E3002: E3002, E3003: E3003, E3004: E3004, E3005: E3005,
  W3001: W3001, W3002: W3002, W3003: W3003,

  // Analyzer errors
  E4001: E4001, E4002: E4002, E4003: E4003, E4004: E4004,
  E4005: E4005, E4006: E4006, E4007: E4007, E4008: E4008,
  E4009: E4009, E4010: E4010, E4011: E4011, E4012: E4012, E4013: E4013,
  W4001: W4001, W4002: W4002, W4003: W4003, W4004: W4004,

  // Compiler errors
  E5001: E5001, E5002: E5002, E5003: E5003,
  W5001: W5001, W5002: W5002,

  // Runtime errors
  E6001: E6001, E6002: E6002, E6003: E6003, E6004: E6004,

  // System errors
  E0000: E0000,

  // Registries
  ERROR_MESSAGES: ERROR_MESSAGES,
  ERROR_SUGGESTIONS: ERROR_SUGGESTIONS,

  // Utility functions
  getSeverity: getSeverity,
  getStage: getStage,
  createError: createError,
  buatParseError: buatParseError,
  formatError: formatError
};
