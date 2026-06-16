/*!
 * Test suite untuk KARSA Lexer v0.3.1
 * Jalankan:  node test-lexer.js
 */
"use strict";
const { Lexer, TT, tokenize, formatError } = require("../lexer/karsa-lexer.js");

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(name + (detail ? "  ->  " + detail : ""));
    console.log("  ✗ GAGAL: " + name + (detail ? "  ->  " + detail : ""));
  }
}

function typesOf(result) {
  return result.tokens.map(function (t) { return t.tipe; });
}
function valuesOf(result) {
  return result.tokens.map(function (t) { return t.nilai; });
}

/* ==========================================================================
 * 1. KEYWORD LONGEST-MATCH (prioritas tertinggi)
 * ========================================================================== */
(function () {
  console.log("\n[1] Longest-match keyword multi-kata");

  let r = tokenize("jika tidak:");
  check("'jika tidak:' -> TK_JIKA_TIDAK (bukan JIKA+IDENT)",
    r.tokens[0].tipe === TT.TK_JIKA_TIDAK && r.tokens[0].nilai === "jika tidak",
    JSON.stringify(valuesOf(r)));

  r = tokenize("jika x:");
  check("'jika x:' -> TK_JIKA", r.tokens[0].tipe === TT.TK_JIKA, JSON.stringify(typesOf(r)));

  r = tokenize("a tidak sama dengan b");
  check("'tidak sama dengan' -> TK_TIDAK_SAMA_DENGAN",
    r.tokens[1].tipe === TT.TK_TIDAK_SAMA_DENGAN && r.tokens[1].nilai === "tidak sama dengan",
    JSON.stringify(valuesOf(r)));

  r = tokenize("a sama dengan b");
  check("'sama dengan' -> TK_SAMA_DENGAN (bukan DENGAN)",
    r.tokens[1].tipe === TT.TK_SAMA_DENGAN, JSON.stringify(typesOf(r)));

  r = tokenize("dengan nama: \"x\"");
  check("'dengan' sendiri -> TK_DENGAN",
    r.tokens[0].tipe === TT.TK_DENGAN, JSON.stringify(typesOf(r)));

  r = tokenize("a tidak ada di b");
  check("'tidak ada di' -> TK_TIDAK_ADA_DI",
    r.tokens[1].tipe === TT.TK_TIDAK_ADA_DI, JSON.stringify(typesOf(r)));

  r = tokenize("a ada di b");
  check("'ada di' -> TK_ADA_DI",
    r.tokens[1].tipe === TT.TK_ADA_DI, JSON.stringify(typesOf(r)));

  r = tokenize("muat ulang");
  check("'muat ulang' -> TK_MUAT_ULANG",
    r.tokens[0].tipe === TT.TK_MUAT_ULANG, JSON.stringify(typesOf(r)));

  r = tokenize("a paling sedikit b");
  check("'paling sedikit' -> TK_PALING_SEDIKIT",
    r.tokens[1].tipe === TT.TK_PALING_SEDIKIT, JSON.stringify(typesOf(r)));

  r = tokenize("x ditinggal-kursor :");
  check("'ditinggal-kursor' (hyphen) -> TK_DITINGGAL_KURSOR",
    r.tokens[1].tipe === TT.TK_DITINGGAL_KURSOR && r.tokens[1].nilai === "ditinggal-kursor",
    JSON.stringify(typesOf(r)));

  r = tokenize("x ditinggal :");
  check("'ditinggal' biasa -> TK_DITINGGAL (longest-match fallback)",
    r.tokens[1].tipe === TT.TK_DITINGGAL, JSON.stringify(typesOf(r)));

  r = tokenize("y dilepas-dari-dom :");
  check("'dilepas-dari-dom' -> TK_DILEPAS_DARI_DOM",
    r.tokens[1].tipe === TT.TK_DILEPAS_DARI_DOM, JSON.stringify(typesOf(r)));

  // boundary: keyword tidak boleh menyerap huruf setelahnya
  r = tokenize("buatx");
  check("'buatx' -> IDENTIFIER (boundary)", r.tokens[0].tipe === TT.TK_IDENTIFIER, JSON.stringify(typesOf(r)));

  r = tokenize("kosongkan x");
  check("'kosongkan' vs 'kosong' -> TK_KOSONGKAN",
    r.tokens[0].tipe === TT.TK_KOSONGKAN, JSON.stringify(typesOf(r)));

  r = tokenize("x kosong");
  check("'kosong' literal -> TK_KOSONG",
    r.tokens[1].tipe === TT.TK_KOSONG, JSON.stringify(typesOf(r)));
})();

/* ==========================================================================
 * 2. CASE-SENSITIVE
 * ========================================================================== */
(function () {
  console.log("\n[2] Keyword case-sensitive");
  const r = tokenize("Buat div");
  check("'Buat' kapital -> IDENTIFIER (bukan TK_BUAT)",
    r.tokens[0].tipe === TT.TK_IDENTIFIER && r.tokens[0].nilai === "Buat",
    JSON.stringify(typesOf(r)));
})();

/* ==========================================================================
 * 3. INDENTASI: INDENT/DEDENT
 * ========================================================================== */
(function () {
  console.log("\n[3] INDENT / DEDENT");
  const src =
    "buat div\n" +
    "  buat p\n" +
    "    buat span\n" +
    "  buat a\n" +
    "tampilkan x\n";
  const r = tokenize(src);
  const t = typesOf(r);
  // Harus ada INDENT setelah "buat div", INDENT lagi setelah "buat p",
  // DEDENT sebelum "buat a", DEDENT sebelum "tampilkan x"
  const indentCount = t.filter(function (x) { return x === TT.TK_INDENT; }).length;
  const dedentCount = t.filter(function (x) { return x === TT.TK_DEDENT; }).length;
  check("2 INDENT & 2 DEDENT", indentCount === 2 && dedentCount === 2,
    "INDENT=" + indentCount + " DEDENT=" + dedentCount);

  // multi-level dedent sekaligus (level 3 -> level 1)
  const src2 =
    "a\n" +
    "  b\n" +
    "    c\n" +
    "      d\n" +
    "  e\n";
  const r2 = tokenize(src2);
  const idxE = r2.tokens.findIndex(function (tk) { return tk.tipe === TT.TK_IDENTIFIER && tk.nilai === "e"; });
  // tepat sebelum 'e' harus ada 2 DEDENT beruntun
  let dedentRun = 0;
  for (let i = idxE - 1; i >= 0; i--) {
    if (r2.tokens[i].tipe === TT.TK_DEDENT) dedentRun++;
    else break;
  }
  check("Multi-level DEDENT (3->1) => 2 DEDENT beruntun", dedentRun === 2, "dedentRun=" + dedentRun);
  check("Tidak ada error indentasi", r2.errors.length === 0, JSON.stringify(r2.errors));
})();

/* ==========================================================================
 * 4. ERROR INDENTASI: tab & ganjil
 * ========================================================================== */
(function () {
  console.log("\n[4] Error indentasi [E1001/E1002]");
  let r = tokenize("\tbuat div");
  check("Tab di indentasi -> E1002", r.errors.some(function (e) { return e.kode === "E1002"; }),
    JSON.stringify(r.errors.map(function (e) { return e.kode; })));

  r = tokenize("buat div\n   buat p\n");
  check("3 spasi (ganjil) -> E1001", r.errors.some(function (e) { return e.kode === "E1001"; }),
    JSON.stringify(r.errors.map(function (e) { return e.kode; })));
  const e1 = r.errors.find(function (e) { return e.kode === "E1001"; });
  check("E1001 di baris 2 kolom 3", e1 && e1.baris === 2 && e1.kolom === 3,
    e1 ? "baris=" + e1.baris + " kolom=" + e1.kolom : "no err");
  check("Format E1001 sesuai contoh",
    e1 && formatError(e1).indexOf("✗ Baris 2, Kolom 3 [E1001]") === 0 &&
         formatError(e1).indexOf("3 spasi ditemukan") !== -1 &&
         formatError(e1).indexOf("Saran: gunakan 2, 4, 6") !== -1,
    e1 ? formatError(e1) : "no err");

  // dedent ke level tak dikenal -> E1003
  r = tokenize("a\n  b\n   c\n");
  // baris 3 punya 3 spasi (ganjil -> E1001), tapi mari uji E1003 dgn kasus bersih:
  r = tokenize("a\n  b\n  c\n d\n");
  // baris 4: 1 spasi ganjil -> dibulatkan 0; stack [0,2]; 0 valid -> DEDENT ok, no E1003
  // Untuk E1003 murni gunakan level tak konsisten yang dibulatkan genap:
  r = tokenize("a\n    b\n  c\n   d\n");
  // baris2 indent4 push; baris3 indent2 dedent ke 2 ok; baris4 indent3->E1001,dibulatkan2, top=2 ok
  // buat kasus E1003 eksplisit:
  r = tokenize("a\n  b\n    c\n   d\n");
  // b@2 push[0,2]; c@4 push[0,2,4]; d@3 ganjil->E1001, efektif2, top=4>2 dedent ke ... stack pop 4->2, 2==2 ok. tidak E1003.
  // Kasus E1003 sesungguhnya: lompat ke level genap yang BUKAN anggota stack
  r = tokenize("a\n  b\n      c\n    d\n");
  // b@2 push[0,2]; c@6 push[0,2,6]; d@4: 6>4 pop->2, 2!=4 -> E1003
  check("Dedent ke level tak dikenal -> E1003", r.errors.some(function (e) { return e.kode === "E1003"; }),
    JSON.stringify(r.errors.map(function (e) { return e.kode; })));
})();

/* ==========================================================================
 * 5. LITERAL
 * ========================================================================== */
(function () {
  console.log("\n[5] Literal (teks/angka/boolean/kosong)");
  let r = tokenize('"halo dunya"');
  check("String kutip ganda", r.tokens[0].tipe === TT.TK_LITERAL_TEKS && r.tokens[0].nilai === "halo dunya");

  r = tokenize("'tekstunggal'");
  check("String kutip tunggal", r.tokens[0].tipe === TT.TK_LITERAL_TEKS && r.tokens[0].nilai === "tekstunggal");

  r = tokenize('"a\\t\\nb"');
  check("Escape \\t \\n", r.tokens[0].nilai === "a\t\nb", JSON.stringify(r.tokens[0].nilai));

  r = tokenize("123");
  check("Angka bulat", r.tokens[0].tipe === TT.TK_LITERAL_ANGKA && r.tokens[0].nilai === "123");

  r = tokenize("3.14");
  check("Angka desimal", r.tokens[0].tipe === TT.TK_LITERAL_ANGKA && r.tokens[0].nilai === "3.14");

  r = tokenize("data x = -45");
  const toks = r.tokens;
  const numIdx = toks.findIndex(function (t) { return t.tipe === TT.TK_LITERAL_ANGKA; });
  check("Angka negatif setelah '='", toks[numIdx].nilai === "-45", JSON.stringify(valuesOf(r)));

  r = tokenize("a - 5");
  // 'a' value-like -> '-' adalah TK_MINUS
  check("'a - 5' -> TK_MINUS (bukan angka negatif)",
    r.tokens.some(function (t) { return t.tipe === TT.TK_MINUS; }) &&
    !r.tokens.some(function (t) { return t.tipe === TT.TK_LITERAL_ANGKA && t.nilai === "-5"; }),
    JSON.stringify(typesOf(r)));

  r = tokenize("benar salah kosong");
  check("benar/salah/kosong -> token literal",
    r.tokens[0].tipe === TT.TK_BENAR && r.tokens[1].tipe === TT.TK_SALAH && r.tokens[2].tipe === TT.TK_KOSONG,
    JSON.stringify(typesOf(r)));

  // string tidak ditutup -> E1004
  r = tokenize('"tidak ditutup');
  check("String tidak ditutup -> E1004", r.errors.some(function (e) { return e.kode === "E1004"; }));
})();

/* ==========================================================================
 * 6. SELEKTOR CSS
 * ========================================================================== */
(function () {
  console.log("\n[6] Selektor CSS");
  let r = tokenize("div#app");
  check("'div#app' -> IDENTIFIER + TK_ID(app)",
    r.tokens[0].tipe === TT.TK_IDENTIFIER && r.tokens[0].nilai === "div" &&
    r.tokens[1].tipe === TT.TK_ID && r.tokens[1].nilai === "app",
    JSON.stringify(valuesOf(r)));

  r = tokenize("div.kartu-produk");
  check("'div.kartu-produk' (hyphen) -> IDENTIFIER + TK_CLASS",
    r.tokens[0].nilai === "div" && r.tokens[1].tipe === TT.TK_CLASS && r.tokens[1].nilai === "kartu-produk",
    JSON.stringify(valuesOf(r)));

  r = tokenize("pengguna.nama");
  check("'pengguna.nama' (akses properti) -> IDENT + TITIK + IDENT",
    r.tokens[0].tipe === TT.TK_IDENTIFIER && r.tokens[1].tipe === TT.TK_TITIK && r.tokens[2].tipe === TT.TK_IDENTIFIER && r.tokens[2].nilai === "nama",
    JSON.stringify(typesOf(r)));

  r = tokenize("input#email[tipe=\"email\"]");
  const atr = r.tokens.find(function (t) { return t.tipe === TT.TK_ATRIBUT; });
  check("Atribut selector [tipe=\"email\"] -> TK_ATRIBUT",
    !!atr && atr.kunci === "tipe" && atr.nilaiAtribut === "email",
    atr ? JSON.stringify({ k: atr.kunci, v: atr.nilaiAtribut }) : "no atribut");

  // atribut beruntun
  r = tokenize("input#e[a=\"1\"][b=\"2\"]");
  const atrs = r.tokens.filter(function (t) { return t.tipe === TT.TK_ATRIBUT; });
  check("Dua atribut beruntun -> 2 TK_ATRIBUT", atrs.length === 2, "count=" + atrs.length);

  // array literal bukan atribut
  r = tokenize("data x = [1, 2, 3]");
  check("Array literal -> TK_KURUNG_SIKU_BUKA (bukan atribut)",
    r.tokens.some(function (t) { return t.tipe === TT.TK_KURUNG_SIKU_BUKA; }) &&
    !r.tokens.some(function (t) { return t.tipe === TT.TK_ATRIBUT; }),
    JSON.stringify(typesOf(r)));
})();

/* ==========================================================================
 * 7. KOMENTAR & DOCSTRING
 * ========================================================================== */
(function () {
  console.log("\n[7] Komentar & DocString");
  let r = tokenize("--! ini komentar biasa\ndata x = 0");
  check("Komentar --! diabaikan (tidak ada token komentar)",
    r.tokens[0].tipe === TT.TK_DATA,
    JSON.stringify(typesOf(r)));

  r = tokenize("--? Ini docstring\ndata x = 0");
  const dataTok = r.tokens.find(function (t) { return t.tipe === TT.TK_DATA; });
  check("DocString menempel ke node berikutnya",
    dataTok && dataTok.docstring === "Ini docstring",
    dataTok ? JSON.stringify(dataTok.docstring) : "no data");

  // beberapa --? berturut digabung
  r = tokenize("--? baris satu\n--? baris dua\nbuat div");
  const buatTok = r.tokens.find(function (t) { return t.tipe === TT.TK_BUAT; });
  check("Beberapa DocString digabung",
    buatTok && buatTok.docstring === "baris satu\nbaris dua",
    buatTok ? JSON.stringify(buatTok.docstring) : "no buat");

  // blok docstring
  r = tokenize("--? [[\nparagraf satu\nparagraf dua\n]]\nbuat div");
  const bt = r.tokens.find(function (t) { return t.tipe === TT.TK_BUAT; });
  check("DocString blok [[ ]] multi-baris",
    bt && bt.docstring && bt.docstring.indexOf("paragraf satu") !== -1 && bt.docstring.indexOf("paragraf dua") !== -1,
    bt ? JSON.stringify(bt.docstring) : "no buat");

  // docstring tanpa node -> warning
  r = tokenize("--? yatim");
  check("DocString tanpa node -> W1001",
    r.warnings.some(function (w) { return w.kode === "W1001"; }),
    JSON.stringify(r.warnings));

  // komentar blok --! [[ ]]
  r = tokenize("--! [[\nabaikan\nini\n]]\ndata x = 1");
  check("Komentar blok --! [[ ]] diabaikan",
    r.tokens[0].tipe === TT.TK_DATA && r.errors.length === 0,
    JSON.stringify(typesOf(r)) + " " + JSON.stringify(r.errors.map(function(e){return e.kode;})));
})();

/* ==========================================================================
 * 8. BLOK LANGSUNG (raw JS)
 * ========================================================================== */
(function () {
  console.log("\n[8] Blok langsung: (raw JS)");
  const src =
    "ketika input ditekan:\n" +
    "  langsung:\n" +
    "    if (event.key === \"Enter\") {\n" +
    "      document.querySelector(\"#x\").click()\n" +
    "    }\n" +
    "  tampilkan div\n";
  const r = tokenize(src);
  const raw = r.tokens.find(function (t) { return t.tipe === TT.TK_BLOK_LANGSUNG; });
  check("Blok langsung tertangkap sebagai TK_BLOK_LANGSUNG", !!raw, JSON.stringify(typesOf(r)));
  check("Isi blok langsung mengandung 'event.key ==='",
    !!raw && raw.nilai.indexOf("event.key ===") !== -1, raw ? JSON.stringify(raw.nilai) : "no raw");
  check("Brace JS tidak membuat token Karsa (tidak ada error karakter)",
    r.errors.length === 0, JSON.stringify(r.errors.map(function(e){return e.kode;})));
  // setelah blok, kembali normal
  const tdiv = r.tokens.find(function (t) { return t.tipe === TT.TK_TAMPILKAN; });
  check("Setelah blok langsung kembali token normal (TK_TAMPILKAN)", !!tdiv, JSON.stringify(typesOf(r)));
  // DEDENT yang benar di akhir
  check("Ada DEDENT di akhir", r.tokens.some(function (t) { return t.tipe === TT.TK_DEDENT; }));
})();

/* ==========================================================================
 * 9. ATRIBUT BARIS/KOLOM
 * ========================================================================== */
(function () {
  console.log("\n[9] Akurasi baris/kolom");
  const src = "data x = 0\ntampilkan \"hi\"\n  buat p\n";
  const r = tokenize(src);
  const tampilkan = r.tokens.find(function (t) { return t.tipe === TT.TK_TAMPILKAN; });
  check("TK_TAMPILKAN di baris 2 kolom 1",
    tampilkan.baris === 2 && tampilkan.kolom === 1, "b=" + tampilkan.baris + " k=" + tampilkan.kolom);
  const strTok = r.tokens.find(function (t) { return t.tipe === TT.TK_LITERAL_TEKS && t.nilai === "hi"; });
  check("String 'hi' di baris 2 kolom 11",
    strTok.baris === 2 && strTok.kolom === 11, "b=" + strTok.baris + " k=" + strTok.kolom);
  const buatP = r.tokens.find(function (t) { return t.tipe === TT.TK_BUAT; });
  check("TK_BUAT di baris 3 kolom 3",
    buatP.baris === 3 && buatP.kolom === 3, "b=" + buatP.baris + " k=" + buatP.kolom);
})();

/* ==========================================================================
 * 10. CONTINUASI BARIS dalam kurung
 * ========================================================================== */
(function () {
  console.log("\n[10] Objek/array multi-baris dalam kurung");
  const src = "data x = {\n  nama: \"Budi\",\n  skor: 0\n}\n";
  const r = tokenize(src);
  check("Objek multi-baris: tidak ada BARIS_BARU di dalam kurung yang signifikan & tidak ada INDENT salah",
    r.errors.length === 0, JSON.stringify(r.errors.map(function(e){return e.kode;})));
  // newline di dalam {} tidak memicu INDENT
  const indentInObj = r.tokens.some(function (t) { return t.tipe === TT.TK_INDENT; });
  check("Tidak ada INDENT di dalam objek literal", !indentInObj, JSON.stringify(typesOf(r)));
})();

/* ==========================================================================
 * 11. CONTOH NYATA DARI SPESIFIKASI (15.1) — smoke test
 * ========================================================================== */
(function () {
  console.log("\n[11] Contoh spesifikasi 15.1 (Counter) — smoke test");
  const src =
    "--! Aplikasi penghitung sederhana\n" +
    "\n" +
    "data hitungan = 0\n" +
    "\n" +
    "buat div#app\n" +
    "  buat h1 -> teks: \"Penghitung\"\n" +
    "  buat p#angka -> teks: hitungan\n" +
    "  buat div.tombol-grup\n" +
    "    buat tombol#kurang -> teks: \"−\"\n" +
    "    buat tombol#tambah -> teks: \"+\"\n" +
    "\n" +
    "ketika tombol#tambah diklik:\n" +
    "  tambahkan 1 ke hitungan\n" +
    "\n" +
    "ketika tombol#kurang diklik:\n" +
    "  kurangi hitungan dengan 1\n" +
    "\n" +
    "saat hitungan berubah:\n" +
    "  perbarui teks p#angka -> hitungan\n";
  const r = tokenize(src);
  check("Contoh 15.1 tanpa error lexer", r.errors.length === 0,
    JSON.stringify(r.errors.map(function (e) { return e.kode + "@" + e.baris; })));
  check("Berakhir dengan TK_EOF", r.tokens[r.tokens.length - 1].tipe === TT.TK_EOF);
  // indent seimbang
  const indents = r.tokens.filter(function (t) { return t.tipe === TT.TK_INDENT; }).length;
  const dedents = r.tokens.filter(function (t) { return t.tipe === TT.TK_DEDENT; }).length;
  check("INDENT & DEDENT seimbang di contoh 15.1", indents === dedents,
    "I=" + indents + " D=" + dedents);
  // cek beberapa token kunci
  check("Ada TK_TAMBAHKAN, TK_KURANGI, TK_DENGAN",
    r.tokens.some(function (t) { return t.tipe === TT.TK_TAMBAHKAN; }) &&
    r.tokens.some(function (t) { return t.tipe === TT.TK_KURANGI; }) &&
    r.tokens.some(function (t) { return t.tipe === TT.TK_DENGAN; }));
})();

/* ==========================================================================
 * 12. PERFORMA — file besar
 * ========================================================================== */
(function () {
  console.log("\n[12] Performa (file ~5MB sintetik)");
  // bangun source berulang dari contoh 15.1
  const block =
    "data hitungan = 0\n" +
    "buat div#app\n" +
    "  buat p#angka -> teks: hitungan\n" +
    "  ketika tombol#tambah diklik:\n" +
    "    tambahkan 1 ke hitungan\n";
  const repeat = Math.ceil((5 * 1024 * 1024) / block.length);
  let big = "";
  for (let i = 0; i < repeat; i++) big += block;
  const start = Date.now();
  const r = tokenize(big);
  const ms = Date.now() - start;
  const mb = (big.length / (1024 * 1024)).toFixed(1);
  check("Tokenisasi " + mb + "MB selesai tanpa error", r.errors.length === 0,
    JSON.stringify(r.errors.slice(0, 3).map(function (e) { return e.kode; })));
  check("Performa wajar (< 8000ms untuk " + mb + "MB)", ms < 8000, "waktu=" + ms + "ms");
  console.log("      -> " + r.tokens.length + " token dalam " + ms + "ms (" + mb + "MB)");
})();

/* ==========================================================================
 * RINGKASAN
 * ========================================================================== */
console.log("\n============================================");
console.log("  LULUS: " + passed + "   GAGAL: " + failed);
console.log("============================================");
if (failed > 0) {
  console.log("\nDaftar kegagalan:");
  failures.forEach(function (f) { console.log("  - " + f); });
  process.exit(1);
} else {
  console.log("\n✓ Semua tes lulus.");
}
