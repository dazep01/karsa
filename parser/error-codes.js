/**
 * KARSA v0.3.1 — Kode Error Parser (E2xxx)
 *
 * Berdasarkan: RFC-PARSER-001 Lampiran A
 * Parser tidak pernah throw; semua error dikembalikan melalui array errors.
 */

// ─── Kode Error Fatal ──────────────────────────────────────
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

// ─── Kode Warning ──────────────────────────────────────────
var W2001 = 'W2001'; // DocString tidak menempel ke node manapun
var W2002 = 'W2002'; // Blok kosong terdeteksi
var W2003 = 'W2003'; // Rantai jika tanpa cabang jika tidak
var W2004 = 'W2004'; // Jumlah argumen mungkin tidak sesuai

// ─── Pesan Error per Kode ──────────────────────────────────
var ERROR_MESSAGES = {};
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

// ─── Saran per Kode ────────────────────────────────────────
var ERROR_SUGGESTIONS = {};
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
ERROR_SUGGESTIONS[E2021] = 'Gunakan: ulangi <nama> dari <sumber>:, ulangi <N> kali:, atau ulangi <nama> dari <A> sampai <B>:';
ERROR_SUGGESTIONS[E2022] = 'Periksa target tampilkan';
ERROR_SUGGESTIONS[E2023] = 'Ini menandakan bug Lexer; laporkan ke tim';
ERROR_SUGGESTIONS[E2024] = 'Gunakan: ambil <jenis> dari <sumber> -> simpan ke <nama> atau ambil dari <url>:';
ERROR_SUGGESTIONS[E2025] = 'Gunakan: gunakan <Komponen> dengan <prop>: <nilai>';

/**
 * Membuat objek ParseError.
 *
 * @param {string} code - Kode error (E2xxx)
 * @param {object} loc - SourceLocation { start, end }
 * @param {object} [overrides] - Properti opsional untuk override
 * @returns {object} ParseError
 */
function buatParseError(code, loc, overrides) {
  var severity = code.charAt(0) === 'W' ? 'warning' : 'error';
  var err = {
    code: code,
    message: ERROR_MESSAGES[code] || 'Error tidak dikenal',
    explanation: '',
    suggestion: ERROR_SUGGESTIONS[code] || '',
    loc: loc,
    severity: severity
  };
  if (overrides) {
    for (var key in overrides) {
      if (overrides.hasOwnProperty(key)) {
        err[key] = overrides[key];
      }
    }
  }
  return err;
}

/**
 * Format error untuk tampilan pengguna.
 *
 * @param {object} err - ParseError
 * @returns {string} Pesan yang diformat
 */
function formatError(err) {
  var baris = err.loc.start.line;
  var kolom = err.loc.start.column;
  var prefix = err.severity === 'warning' ? '⚠' : '✗';
  return prefix + ' Baris ' + baris + ', Kolom ' + kolom + ' [' + err.code + ']\n' +
    err.message + '\n' +
    (err.suggestion ? 'Saran: ' + err.suggestion : '');
}

module.exports = {
  E2001: E2001, E2002: E2002, E2003: E2003, E2004: E2004,
  E2005: E2005, E2006: E2006, E2007: E2007, E2008: E2008,
  E2009: E2009, E2010: E2010, E2011: E2011, E2012: E2012,
  E2013: E2013, E2014: E2014, E2015: E2015, E2016: E2016,
  E2017: E2017, E2018: E2018, E2019: E2019, E2020: E2020,
  E2021: E2021, E2022: E2022, E2023: E2023, E2024: E2024,
  E2025: E2025,
  W2001: W2001, W2002: W2002, W2003: W2003, W2004: W2004,
  ERROR_MESSAGES: ERROR_MESSAGES,
  ERROR_SUGGESTIONS: ERROR_SUGGESTIONS,
  buatParseError: buatParseError,
  formatError: formatError
};
