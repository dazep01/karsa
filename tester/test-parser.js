/**
 * KARSA v0.3.1 — Parser Test Suite
 *
 * Test komprehensif untuk parser KARSA.
 * Menguji semua statement, ekspresi, dan error recovery.
 */

var KarsaParser = require('../parser/karsa-parser');
var TT = require('../parser/token-types');
var AST = require('../parser/ast-factory');
var Visitor = require('../utils/visitor');
var Err = require('../parser/error-codes');

// ─── Helper ────────────────────────────────────────────────

var passCount = 0;
var failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
  } else {
    failCount++;
    console.log('  ✗ FAIL: ' + message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passCount++;
  } else {
    failCount++;
    console.log('  ✗ FAIL: ' + message);
    console.log('    Expected: ' + JSON.stringify(expected));
    console.log('    Actual:   ' + JSON.stringify(actual));
  }
}

/**
 * Membuat token sederhana untuk testing.
 */
function tok(tipe, nilai, baris, kolom, docstring) {
  return {
    tipe: tipe,
    nilai: nilai,
    baris: baris || 1,
    kolom: kolom || 1,
    docstring: docstring || null
  };
}

/**
 * Membuat token stream lengkap dengan TK_EOF.
 */
function tokenStream(tokens) {
  return tokens.concat([tok(TT.TK_EOF, '', 99, 1)]);
}

// ═══════════════════════════════════════════════════════════
// TEST 1: Program Kosong
// ═══════════════════════════════════════════════════════════
(function testEmptyProgram() {
  console.log('Test 1: Program Kosong');
  var tokens = tokenStream([]);
  var parser = new KarsaParser(tokens);
  var result = parser.parse();

  assert(result.ast !== null, 'AST tidak boleh null');
  assertEqual(result.ast.type, 'Program', 'Root node harus Program');
  assert(Array.isArray(result.ast.body), 'body harus array');
  assertEqual(result.ast.body.length, 0, 'body kosong harus 0');
  assertEqual(result.errors.length, 0, 'Tidak boleh ada error');
})();

// ═══════════════════════════════════════════════════════════
// TEST 2: Data Declaration
// ═══════════════════════════════════════════════════════════
(function testDataDeclaration() {
  console.log('Test 2: Data Declaration');

  // data hitungan = 0
  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'hitungan', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 16),
    tok(TT.TK_LITERAL_ANGKA, '0', 1, 18)
  ]);

  var parser = new KarsaParser(tokens);
  var result = parser.parse();

  assertEqual(result.ast.type, 'Program', 'Root harus Program');
  assertEqual(result.ast.body.length, 1, 'Harus ada 1 statement');
  var decl = result.ast.body[0];
  assertEqual(decl.type, 'DataDeclaration', 'Harus DataDeclaration');
  assertEqual(decl.name, 'hitungan', 'Nama harus "hitungan"');
  assert(decl.init !== null, 'Init tidak boleh null');
  assertEqual(decl.init.type, 'Literal', 'Init harus Literal');
  assertEqual(decl.init.kind, 'angka', 'Kind harus angka');

  // data nama = "Budi"
  var tokens2 = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'nama', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 11),
    tok(TT.TK_LITERAL_TEKS, 'Budi', 1, 13)
  ]);

  var result2 = new KarsaParser(tokens2).parse();
  assertEqual(result2.ast.body[0].init.kind, 'teks', 'Kind harus teks');
  assertEqual(result2.ast.body[0].init.value, 'Budi', 'Value harus "Budi"');

  // data aktif = benar
  var tokens3 = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'aktif', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 12),
    tok(TT.TK_BENAR, 'benar', 1, 14)
  ]);

  var result3 = new KarsaParser(tokens3).parse();
  assertEqual(result3.ast.body[0].init.kind, 'boolean', 'Kind harus boolean');
  assertEqual(result3.ast.body[0].init.value, true, 'Value harus true');
})();

// ═══════════════════════════════════════════════════════════
// TEST 3: Data dengan Type Hint
// ═══════════════════════════════════════════════════════════
(function testDataWithTypeHint() {
  console.log('Test 3: Data dengan Type Hint');

  // data hitungan: angka = 0
  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'hitungan', 1, 6),
    tok(TT.TK_TITIK_DUA, ':', 1, 15),
    tok(TT.TK_IDENTIFIER, 'angka', 1, 17),
    tok(TT.TK_TANDA_SAMA, '=', 1, 23),
    tok(TT.TK_LITERAL_ANGKA, '0', 1, 25)
  ]);

  var result = new KarsaParser(tokens).parse();
  var decl = result.ast.body[0];
  assertEqual(decl.typeHint, 'angka', 'Type hint harus "angka"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 4: Tetap dan Ubah Declaration
// ═══════════════════════════════════════════════════════════
(function testTetapUbah() {
  console.log('Test 4: Tetap dan Ubah Declaration');

  // tetap PI = 3.14
  var tokens1 = tokenStream([
    tok(TT.TK_TETAP, 'tetap', 1, 1),
    tok(TT.TK_IDENTIFIER, 'PI', 1, 7),
    tok(TT.TK_TANDA_SAMA, '=', 1, 10),
    tok(TT.TK_LITERAL_ANGKA, '3.14', 1, 12)
  ]);
  var r1 = new KarsaParser(tokens1).parse();
  assertEqual(r1.ast.body[0].type, 'TetapDeclaration', 'Harus TetapDeclaration');

  // ubah daftarBaru = []
  var tokens2 = tokenStream([
    tok(TT.TK_UBAH, 'ubah', 1, 1),
    tok(TT.TK_IDENTIFIER, 'daftarBaru', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 17),
    tok(TT.TK_KURUNG_SIKU_BUKA, '[', 1, 19),
    tok(TT.TK_KURUNG_SIKU_TUTUP, ']', 1, 20)
  ]);
  var r2 = new KarsaParser(tokens2).parse();
  assertEqual(r2.ast.body[0].type, 'UbahDeclaration', 'Harus UbahDeclaration');
  assertEqual(r2.ast.body[0].init.type, 'ArrayLiteral', 'Init harus ArrayLiteral');
})();

// ═══════════════════════════════════════════════════════════
// TEST 5: Turunan Declaration
// ═══════════════════════════════════════════════════════════
(function testTurunan() {
  console.log('Test 5: Turunan Declaration');

  // turunan total = harga * jumlah
  var tokens = tokenStream([
    tok(TT.TK_TURUNAN, 'turunan', 1, 1),
    tok(TT.TK_IDENTIFIER, 'total', 1, 9),
    tok(TT.TK_TANDA_SAMA, '=', 1, 15),
    tok(TT.TK_IDENTIFIER, 'harga', 1, 17),
    tok(TT.TK_BINTANG, '*', 1, 23),
    tok(TT.TK_IDENTIFIER, 'jumlah', 1, 25)
  ]);

  var result = new KarsaParser(tokens).parse();
  var decl = result.ast.body[0];
  assertEqual(decl.type, 'TurunanDeclaration', 'Harus TurunanDeclaration');
  assertEqual(decl.init.type, 'BinaryExpression', 'Init harus BinaryExpression');
  assertEqual(decl.init.operator, '*', 'Operator harus "*"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 6: Buat Statement (elemen sederhana)
// ═══════════════════════════════════════════════════════════
(function testBuatStatement() {
  console.log('Test 6: Buat Statement');

  // buat div#app
  var tokens = tokenStream([
    tok(TT.TK_BUAT, 'buat', 1, 1),
    tok(TT.TK_IDENTIFIER, 'div', 1, 6),
    tok(TT.TK_ID, 'app', 1, 9)
  ]);

  var result = new KarsaParser(tokens).parse();
  var stmt = result.ast.body[0];
  assertEqual(stmt.type, 'BuatStatement', 'Harus BuatStatement');
  assertEqual(stmt.selector.type, 'Selector', 'Selector harus Selector');
  assertEqual(stmt.selector.tag, 'div', 'Tag harus "div"');
  assertEqual(stmt.selector.id, 'app', 'ID harus "app"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 7: Buat dengan Properti Inline
// ═══════════════════════════════════════════════════════════
(function testBuatWithProps() {
  console.log('Test 7: Buat dengan Properti Inline');

  // buat h3 -> teks: "Halo"
  var tokens = tokenStream([
    tok(TT.TK_BUAT, 'buat', 1, 1),
    tok(TT.TK_IDENTIFIER, 'h3', 1, 6),
    tok(TT.TK_PANAH, '->', 1, 9),
    tok(TT.TK_IDENTIFIER, 'teks', 1, 12),
    tok(TT.TK_TITIK_DUA, ':', 1, 16),
    tok(TT.TK_LITERAL_TEKS, 'Halo', 1, 18)
  ]);

  var result = new KarsaParser(tokens).parse();
  var stmt = result.ast.body[0];
  assertEqual(stmt.type, 'BuatStatement', 'Harus BuatStatement');
  assert(stmt.properties && stmt.properties.length > 0, 'Harus ada properti');
  assertEqual(stmt.properties[0].key, 'teks', 'Key properti harus "teks"');
  assertEqual(stmt.properties[0].value.type, 'Literal', 'Value harus Literal');
  assertEqual(stmt.properties[0].value.value, 'Halo', 'Value harus "Halo"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 8: Berhenti, Lewati, Kembalikan
// ═══════════════════════════════════════════════════════════
(function testKontrolAlur() {
  console.log('Test 8: Kontrol Alur');

  // berhenti
  var t1 = tokenStream([tok(TT.TK_BERHENTI, 'berhenti', 1, 1)]);
  var r1 = new KarsaParser(t1).parse();
  assertEqual(r1.ast.body[0].type, 'BerhentiStatement', 'Harus BerhentiStatement');

  // lewati
  var t2 = tokenStream([tok(TT.TK_LEWATI, 'lewati', 1, 1)]);
  var r2 = new KarsaParser(t2).parse();
  assertEqual(r2.ast.body[0].type, 'LewatiStatement', 'Harus LewatiStatement');

  // kembalikan
  var t3 = tokenStream([tok(TT.TK_KEMBALIKAN, 'kembalikan', 1, 1)]);
  var r3 = new KarsaParser(t3).parse();
  assertEqual(r3.ast.body[0].type, 'KembalikanStatement', 'Harus KembalikanStatement');
  assert(!r3.ast.body[0].value, 'Value harus kosong untuk kembalikan tanpa nilai');

  // kembalikan harga * jumlah
  var t4 = tokenStream([
    tok(TT.TK_KEMBALIKAN, 'kembalikan', 1, 1),
    tok(TT.TK_IDENTIFIER, 'harga', 1, 12),
    tok(TT.TK_BINTANG, '*', 1, 18),
    tok(TT.TK_IDENTIFIER, 'jumlah', 1, 20)
  ]);
  var r4 = new KarsaParser(t4).parse();
  assertEqual(r4.ast.body[0].type, 'KembalikanStatement', 'Harus KembalikanStatement');
  assert(r4.ast.body[0].value !== undefined, 'Value harus ada');
  assertEqual(r4.ast.body[0].value.type, 'BinaryExpression', 'Value harus BinaryExpression');
})();

// ═══════════════════════════════════════════════════════════
// TEST 9: Navigasi
// ═══════════════════════════════════════════════════════════
(function testNavigasi() {
  console.log('Test 9: Navigasi');

  // arahkan ke "/dashboard"
  var t1 = tokenStream([
    tok(TT.TK_ARAHKAN, 'arahkan', 1, 1),
    tok(TT.TK_KE, 'ke', 1, 9),
    tok(TT.TK_LITERAL_TEKS, '/dashboard', 1, 12)
  ]);
  var r1 = new KarsaParser(t1).parse();
  assertEqual(r1.ast.body[0].type, 'ArahkanStatement', 'Harus ArahkanStatement');

  // muat ulang
  var t2 = tokenStream([tok(TT.TK_MUAT_ULANG, 'muat ulang', 1, 1)]);
  var r2 = new KarsaParser(t2).parse();
  assertEqual(r2.ast.body[0].type, 'MuatUlangStatement', 'Harus MuatUlangStatement');

  // kembali
  var t3 = tokenStream([tok(TT.TK_KEMBALI, 'kembali', 1, 1)]);
  var r3 = new KarsaParser(t3).parse();
  assertEqual(r3.ast.body[0].type, 'KembaliStatement', 'Harus KembaliStatement');
})();

// ═══════════════════════════════════════════════════════════
// TEST 10: Simpan, Tambahkan, Kurangi
// ═══════════════════════════════════════════════════════════
(function testDataOperations() {
  console.log('Test 10: Operasi Data');

  // simpan 99 ke hitungan
  var t1 = tokenStream([
    tok(TT.TK_SIMPAN, 'simpan', 1, 1),
    tok(TT.TK_LITERAL_ANGKA, '99', 1, 8),
    tok(TT.TK_KE, 'ke', 1, 11),
    tok(TT.TK_IDENTIFIER, 'hitungan', 1, 14)
  ]);
  var r1 = new KarsaParser(t1).parse();
  assertEqual(r1.ast.body[0].type, 'SimpanStatement', 'Harus SimpanStatement');
  assertEqual(r1.ast.body[0].target, 'hitungan', 'Target harus "hitungan"');

  // tambahkan 1 ke hitungan
  var t2 = tokenStream([
    tok(TT.TK_TAMBAHKAN, 'tambahkan', 1, 1),
    tok(TT.TK_LITERAL_ANGKA, '1', 1, 11),
    tok(TT.TK_KE, 'ke', 1, 13),
    tok(TT.TK_IDENTIFIER, 'hitungan', 1, 16)
  ]);
  var r2 = new KarsaParser(t2).parse();
  assertEqual(r2.ast.body[0].type, 'TambahkanStatement', 'Harus TambahkanStatement');

  // kurangi hitungan dengan 1
  var t3 = tokenStream([
    tok(TT.TK_KURANGI, 'kurangi', 1, 1),
    tok(TT.TK_IDENTIFIER, 'hitungan', 1, 9),
    tok(TT.TK_DENGAN, 'dengan', 1, 18),
    tok(TT.TK_LITERAL_ANGKA, '1', 1, 25)
  ]);
  var r3 = new KarsaParser(t3).parse();
  assertEqual(r3.ast.body[0].type, 'KurangiStatement', 'Harus KurangiStatement');
  assertEqual(r3.ast.body[0].target, 'hitungan', 'Target harus "hitungan"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 11: Error Recovery
// ═══════════════════════════════════════════════════════════
(function testErrorRecovery() {
  console.log('Test 11: Error Recovery');

  // Token yang tidak dikenali di posisi statement
  var tokens = tokenStream([
    tok(TT.TK_KURUNG_BUKA, '(', 1, 1),  // tidak valid di posisi statement
    tok(TT.TK_DATA, 'data', 2, 1),       // statement valid berikutnya
    tok(TT.TK_IDENTIFIER, 'x', 2, 6),
    tok(TT.TK_TANDA_SAMA, '=', 2, 8),
    tok(TT.TK_LITERAL_ANGKA, '1', 2, 10)
  ]);

  var result = new KarsaParser(tokens).parse();
  assert(result.errors.length > 0, 'Harus ada error');
  assert(result.ast.body.length >= 1, 'AST tetap punya body meskipun ada error');
})();

// ═══════════════════════════════════════════════════════════
// TEST 12: Komponen Declaration
// ═══════════════════════════════════════════════════════════
(function testKomponenDeclaration() {
  console.log('Test 12: Komponen Declaration');

  // komponen Kartu(nama: teks):
  //   buat div
  var tokens = tokenStream([
    tok(TT.TK_KOMPONEN, 'komponen', 1, 1),
    tok(TT.TK_IDENTIFIER, 'Kartu', 1, 10),
    tok(TT.TK_KURUNG_BUKA, '(', 1, 15),
    tok(TT.TK_IDENTIFIER, 'nama', 1, 16),
    tok(TT.TK_TITIK_DUA, ':', 1, 20),
    tok(TT.TK_IDENTIFIER, 'teks', 1, 22),
    tok(TT.TK_KURUNG_TUTUP, ')', 1, 26),
    tok(TT.TK_TITIK_DUA, ':', 1, 27),
    tok(TT.TK_BARIS_BARU, '\n', 1, 28),
    tok(TT.TK_INDENT, '  ', 2, 1),
    tok(TT.TK_BUAT, 'buat', 2, 3),
    tok(TT.TK_IDENTIFIER, 'div', 2, 8),
    tok(TT.TK_BARIS_BARU, '\n', 2, 11),
    tok(TT.TK_DEDENT, '', 3, 1)
  ]);

  var result = new KarsaParser(tokens).parse();
  var decl = result.ast.body[0];
  assertEqual(decl.type, 'KomponenDeclaration', 'Harus KomponenDeclaration');
  assertEqual(decl.name, 'Kartu', 'Nama harus "Kartu"');
  assertEqual(decl.params.length, 1, 'Harus ada 1 parameter');
  assertEqual(decl.params[0].name, 'nama', 'Parameter harus "nama"');
  assertEqual(decl.params[0].typeHint, 'teks', 'Type hint harus "teks"');
  assert(decl.body !== null, 'Body tidak boleh null');
})();

// ═══════════════════════════════════════════════════════════
// TEST 13: Komponen dengan nama tidak kapital (harus error E2003)
// ═══════════════════════════════════════════════════════════
(function testKomponenNamaTidakKapital() {
  console.log('Test 13: Komponen nama tidak kapital');

  var tokens = tokenStream([
    tok(TT.TK_KOMPONEN, 'komponen', 1, 1),
    tok(TT.TK_IDENTIFIER, 'kartuProduk', 1, 10),
    tok(TT.TK_KURUNG_BUKA, '(', 1, 21),
    tok(TT.TK_KURUNG_TUTUP, ')', 1, 22),
    tok(TT.TK_TITIK_DUA, ':', 1, 23),
    tok(TT.TK_BARIS_BARU, '\n', 1, 24),
    tok(TT.TK_INDENT, '  ', 2, 1),
    tok(TT.TK_BUAT, 'buat', 2, 3),
    tok(TT.TK_IDENTIFIER, 'div', 2, 8),
    tok(TT.TK_BARIS_BARU, '\n', 2, 11),
    tok(TT.TK_DEDENT, '', 3, 1)
  ]);

  var result = new KarsaParser(tokens).parse();
  var hasE2003 = result.errors.some(function (e) { return e.code === 'E2003'; });
  assert(hasE2003, 'Harus ada error E2003 untuk nama komponen tidak kapital');
})();

// ═══════════════════════════════════════════════════════════
// TEST 14: Object Literal
// ═══════════════════════════════════════════════════════════
(function testObjectLiteral() {
  console.log('Test 14: Object Literal');

  // data pengguna = { nama: "Budi", aktif: benar }
  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'pengguna', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 15),
    tok(TT.TK_KURAWAL_BUKA, '{', 1, 17),
    tok(TT.TK_IDENTIFIER, 'nama', 1, 19),
    tok(TT.TK_TITIK_DUA, ':', 1, 23),
    tok(TT.TK_LITERAL_TEKS, 'Budi', 1, 25),
    tok(TT.TK_KOMA, ',', 1, 31),
    tok(TT.TK_IDENTIFIER, 'aktif', 1, 33),
    tok(TT.TK_TITIK_DUA, ':', 1, 38),
    tok(TT.TK_BENAR, 'benar', 1, 40),
    tok(TT.TK_KURAWAL_TUTUP, '}', 1, 46)
  ]);

  var result = new KarsaParser(tokens).parse();
  var decl = result.ast.body[0];
  assertEqual(decl.init.type, 'ObjectLiteral', 'Init harus ObjectLiteral');
  assertEqual(decl.init.properties.length, 2, 'Harus ada 2 properti');
  assertEqual(decl.init.properties[0].key, 'nama', 'Key pertama harus "nama"');
  assertEqual(decl.init.properties[1].key, 'aktif', 'Key kedua harus "aktif"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 15: Array Literal
// ═══════════════════════════════════════════════════════════
(function testArrayLiteral() {
  console.log('Test 15: Array Literal');

  // data menu = ["Beranda", "Tentang"]
  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'menu', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 11),
    tok(TT.TK_KURUNG_SIKU_BUKA, '[', 1, 13),
    tok(TT.TK_LITERAL_TEKS, 'Beranda', 1, 14),
    tok(TT.TK_KOMA, ',', 1, 23),
    tok(TT.TK_LITERAL_TEKS, 'Tentang', 1, 25),
    tok(TT.TK_KURUNG_SIKU_TUTUP, ']', 1, 34)
  ]);

  var result = new KarsaParser(tokens).parse();
  var decl = result.ast.body[0];
  assertEqual(decl.init.type, 'ArrayLiteral', 'Init harus ArrayLiteral');
  assertEqual(decl.init.elements.length, 2, 'Harus ada 2 elemen');
})();

// ═══════════════════════════════════════════════════════════
// TEST 16: Visitor Pattern
// ═══════════════════════════════════════════════════════════
(function testVisitor() {
  console.log('Test 16: Visitor Pattern');

  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'x', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 8),
    tok(TT.TK_LITERAL_ANGKA, '0', 1, 10)
  ]);

  var result = new KarsaParser(tokens).parse();

  // Test CollectingVisitor
  var collector = new Visitor.CollectingVisitor('DataDeclaration');
  Visitor.traverse(result.ast, collector);
  assertEqual(collector.results.length, 1, 'Harus menemukan 1 DataDeclaration');

  // Test formatAST
  var formatted = Visitor.formatAST(result.ast);
  assert(formatted.indexOf('Program') !== -1, 'Format harus mengandung "Program"');
  assert(formatted.indexOf('DataDeclaration') !== -1, 'Format harus mengandung "DataDeclaration"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 17: AST Location Metadata
// ═══════════════════════════════════════════════════════════
(function testLocationMetadata() {
  console.log('Test 17: AST Location Metadata');

  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'x', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 8),
    tok(TT.TK_LITERAL_ANGKA, '0', 1, 10)
  ]);

  var result = new KarsaParser(tokens).parse();
  var decl = result.ast.body[0];

  // Setiap node harus punya loc
  assert(decl.loc !== null && decl.loc !== undefined, 'DataDeclaration harus punya loc');
  assert(decl.loc.start !== null, 'loc.start harus ada');
  assert(decl.loc.end !== null, 'loc.end harus ada');
  assert(decl.loc.start.line >= 1, 'start.line harus >= 1');
  assert(decl.loc.start.column >= 1, 'start.column harus >= 1');
})();

// ═══════════════════════════════════════════════════════════
// TEST 18: PanggilNativeExpression
// ═══════════════════════════════════════════════════════════
(function testPanggilNative() {
  console.log('Test 18: PanggilNativeExpression');

  // hapusItem(indeks)
  var tokens = tokenStream([
    tok(TT.TK_IDENTIFIER, 'hapusItem', 1, 1),
    tok(TT.TK_KURUNG_BUKA, '(', 1, 10),
    tok(TT.TK_IDENTIFIER, 'indeks', 1, 11),
    tok(TT.TK_KURUNG_TUTUP, ')', 1, 17)
  ]);

  var result = new KarsaParser(tokens).parse();
  var stmt = result.ast.body[0];
  assertEqual(stmt.type, 'PanggilNativeExpression', 'Harus PanggilNativeExpression');
  assertEqual(stmt.callee.name, 'hapusItem', 'Callee harus "hapusItem"');
  assertEqual(stmt.arguments.length, 1, 'Harus ada 1 argumen');
})();

// ═══════════════════════════════════════════════════════════
// TEST 19: Jalankan Expression
// ═══════════════════════════════════════════════════════════
(function testJalankanExpression() {
  console.log('Test 19: JalankanExpression');

  // jalankan console.log("debug")
  var tokens = tokenStream([
    tok(TT.TK_JALANKAN, 'jalankan', 1, 1),
    tok(TT.TK_IDENTIFIER, 'console', 1, 10),
    tok(TT.TK_TITIK, '.', 1, 17),
    tok(TT.TK_IDENTIFIER, 'log', 1, 18),
    tok(TT.TK_KURUNG_BUKA, '(', 1, 21),
    tok(TT.TK_LITERAL_TEKS, 'debug', 1, 22),
    tok(TT.TK_KURUNG_TUTUP, ')', 1, 29)
  ]);

  var result = new KarsaParser(tokens).parse();
  var stmt = result.ast.body[0];
  assertEqual(stmt.type, 'JalankanExpression', 'Harus JalankanExpression');
  assertEqual(stmt.callee, 'console.log', 'Callee harus "console.log"');
  assertEqual(stmt.kind, 'parens', 'Kind harus "parens"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 20: Idempotency
// ═══════════════════════════════════════════════════════════
(function testIdempotency() {
  console.log('Test 20: Idempotency');

  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'x', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 8),
    tok(TT.TK_LITERAL_ANGKA, '0', 1, 10)
  ]);

  var parser = new KarsaParser(tokens);
  var result1 = parser.parse();
  var result2 = parser.parse();

  assertEqual(result1.ast.body.length, result2.ast.body.length,
    'Parse kedua harus menghasilkan jumlah statement yang sama');
  assertEqual(result1.errors.length, result2.errors.length,
    'Parse kedua harus menghasilkan jumlah error yang sama');
})();

// ═══════════════════════════════════════════════════════════
// TEST 21: AST Invariant I-03 (setiap node punya loc)
// ═══════════════════════════════════════════════════════════
(function testInvariantLoc() {
  console.log('Test 21: Invariant I-03 (setiap node punya loc)');

  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'hitungan', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 16),
    tok(TT.TK_LITERAL_ANGKA, '0', 1, 18)
  ]);

  var result = new KarsaParser(tokens).parse();

  // Verifikasi setiap node punya loc
  function checkLoc(node, path) {
    if (!node || typeof node !== 'object') return;
    if (node.type) {
      assert(node.loc !== null && node.loc !== undefined,
        path + ' (' + node.type + ') harus punya loc');
      if (node.loc) {
        assert(node.loc.start.line >= 1, path + ' start.line >= 1');
        assert(node.loc.start.column >= 1, path + ' start.column >= 1');
      }
    }
    var childKeys = Visitor.getChildKeys(node.type || '');
    for (var i = 0; i < childKeys.length; i++) {
      var child = node[childKeys[i]];
      if (Array.isArray(child)) {
        for (var j = 0; j < child.length; j++) {
          checkLoc(child[j], path + '.' + childKeys[i] + '[' + j + ']');
        }
      } else {
        checkLoc(child, path + '.' + childKeys[i]);
      }
    }
  }

  checkLoc(result.ast, 'root');
})();

// ═══════════════════════════════════════════════════════════
// TEST 22: MemberExpression (akses properti)
// ═══════════════════════════════════════════════════════════
(function testMemberExpression() {
  console.log('Test 22: MemberExpression');

  // data nama = pengguna.nama
  var tokens = tokenStream([
    tok(TT.TK_DATA, 'data', 1, 1),
    tok(TT.TK_IDENTIFIER, 'nama', 1, 6),
    tok(TT.TK_TANDA_SAMA, '=', 1, 11),
    tok(TT.TK_IDENTIFIER, 'pengguna', 1, 13),
    tok(TT.TK_TITIK, '.', 1, 21),
    tok(TT.TK_IDENTIFIER, 'nama', 1, 22)
  ]);

  var result = new KarsaParser(tokens).parse();
  var init = result.ast.body[0].init;
  assertEqual(init.type, 'MemberExpression', 'Init harus MemberExpression');
  assertEqual(init.object.type, 'Identifier', 'Object harus Identifier');
  assertEqual(init.object.name, 'pengguna', 'Object name harus "pengguna"');
  assertEqual(init.property.name, 'nama', 'Property name harus "nama"');
})();

// ═══════════════════════════════════════════════════════════
// TEST 23: Operator Precedence
// ═══════════════════════════════════════════════════════════
(function testOperatorPrecedence() {
  console.log('Test 23: Operator Precedence');

  // turunan total = harga * jumlah + ongkir
  // Harus: (harga * jumlah) + ongkir karena * > +
  var tokens = tokenStream([
    tok(TT.TK_TURUNAN, 'turunan', 1, 1),
    tok(TT.TK_IDENTIFIER, 'total', 1, 9),
    tok(TT.TK_TANDA_SAMA, '=', 1, 15),
    tok(TT.TK_IDENTIFIER, 'harga', 1, 17),
    tok(TT.TK_BINTANG, '*', 1, 23),
    tok(TT.TK_IDENTIFIER, 'jumlah', 1, 25),
    tok(TT.TK_PLUS, '+', 1, 32),
    tok(TT.TK_IDENTIFIER, 'ongkir', 1, 34)
  ]);

  var result = new KarsaParser(tokens).parse();
  var init = result.ast.body[0].init;
  assertEqual(init.type, 'BinaryExpression', 'Init harus BinaryExpression');
  assertEqual(init.operator, '+', 'Operator luar harus "+" (lower precedence)');
  assertEqual(init.left.type, 'BinaryExpression', 'Left harus BinaryExpression');
  assertEqual(init.left.operator, '*', 'Left operator harus "*" (higher precedence)');
})();

// ═══════════════════════════════════════════════════════════
// RINGKASAN
// ═══════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════');
console.log('Ringkasan Hasil Test Parser KARSA v0.3.1');
console.log('═══════════════════════════════════════');
console.log('  ✓ Pass: ' + passCount);
console.log('  ✗ Fail: ' + failCount);
console.log('  Total:  ' + (passCount + failCount));
console.log('═══════════════════════════════════════');

if (failCount > 0) {
  process.exit(1);
}
