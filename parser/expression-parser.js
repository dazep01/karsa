/**
 * KARSA v0.3.1 — Expression Parser (Pratt Parser)
 *
 * Mengimplementasikan Pratt Parser untuk ekspresi KARSA.
 * Menangani precedence operator aritmatika, perbandingan kata,
 * dan logika secara deterministik.
 *
 * Berdasarkan: RFC-PARSER-001 §6, KARSA-grammar-spec_v0.3.1 §4.0
 */

var TT = require('./token-types');
var AST = require('./ast-factory');
var BP = require('./binding-powers');

/**
 * Memparse ekspresi dengan Pratt parser.
 *
 * @param {object} parser - Instance parser utama
 * @param {number} minBp - Minimum binding power untuk berhenti
 * @returns {object} Expression node
 */
function parseExpression(parser, minBp) {
  if (minBp === undefined) minBp = 0;

  // 1. Parse prefix (nud)
  var lhs = parsePrefix(parser);

  // 2. Loop infix/postfix (led)
  while (true) {
    var tok = parser.peek();

    // Cek apakah token saat ini adalah infix/postfix operator
    var infixBp = BP.getInfixBp(tok.tipe);
    if (infixBp === null) {
      // Cek khusus: TK_KURUNG_BUKA bisa jadi function call (postfix)
      if (tok.tipe === TT.TK_KURUNG_BUKA && isCallContext(parser)) {
        infixBp = { left: 15, right: 14 };
      } else {
        break;
      }
    }

    if (infixBp.left < minBp) {
      break;
    }

    // Konsumsi operator
    var opToken = parser.advance();
    var rbp = infixBp.right;

    // Parse sisi kanan
    var rhs = parseExpression(parser, rbp);

    // Hitung lokasi hasil
    var resultLoc = AST.gabungLoc(lhs.loc, rhs.loc);

    // Buat BinaryExpression
    var operator = BP.operatorFromToken(opToken.tipe, opToken.nilai);
    lhs = AST.buatBinaryExpression(operator, lhs, rhs, resultLoc);
  }

  return lhs;
}

/**
 * Parse prefix expression (nud).
 * Termasuk: literal, identifier, unary, grouping, object, array
 */
function parsePrefix(parser) {
  var tok = parser.peek();

  // ─── Literal ──────────────────────────────────────
  if (tok.tipe === TT.TK_LITERAL_TEKS) {
    parser.advance();
    return AST.buatLiteral(tok.nilai, 'teks', AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length + 2 }
    ));
  }

  if (tok.tipe === TT.TK_LITERAL_ANGKA) {
    parser.advance();
    var numVal = typeof tok.nilai === 'number' ? tok.nilai : parseFloat(tok.nilai);
    return AST.buatLiteral(numVal, 'angka', AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + String(tok.nilai).length }
    ));
  }

  if (tok.tipe === TT.TK_BENAR) {
    parser.advance();
    return AST.buatLiteral(true, 'boolean', AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + 5 }
    ));
  }

  if (tok.tipe === TT.TK_SALAH) {
    parser.advance();
    return AST.buatLiteral(false, 'boolean', AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + 5 }
    ));
  }

  if (tok.tipe === TT.TK_KOSONG) {
    parser.advance();
    return AST.buatLiteral(null, 'kosong', AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + 6 }
    ));
  }

  // ─── Identifier ───────────────────────────────────
  if (tok.tipe === TT.TK_IDENTIFIER) {
    parser.advance();
    var idNode = AST.buatIdentifier(tok.nilai, AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length }
    ));

    // Cek lanjutan: pemanggilan fungsi f(...) atau akses properti a.b
    return parsePostfix(parser, idNode);
  }

  // ─── Jalankan (JS Interop) ─────────────────────────
  if (tok.tipe === TT.TK_JALANKAN) {
    var stmtParser = require('./statement-parser');
    var jalankanNode = stmtParser.parseJalankanExpression(parser);
    // parseJalankanExpression mengembalikan node JalankanExpression (ekspresi)
    return jalankanNode;
  }

  // ─── Unary: bukan ─────────────────────────────────
  if (tok.tipe === TT.TK_BUKAN) {
    parser.advance();
    var prefixBp = BP.getPrefixBp(TT.TK_BUKAN);
    var operand = parseExpression(parser, prefixBp);
    return AST.buatUnaryExpression('bukan', operand,
      AST.gabungLoc(
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null),
        operand.loc
      ),
      true
    );
  }

  // ─── Unary: minus ─────────────────────────────────
  if (tok.tipe === TT.TK_MINUS && isMinusPrefix(parser)) {
    parser.advance();
    var minPrefixBp = BP.getPrefixBp(TT.TK_MINUS);
    var minOperand = parseExpression(parser, minPrefixBp);
    return AST.buatUnaryExpression('-', minOperand,
      AST.gabungLoc(
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null),
        minOperand.loc
      ),
      true
    );
  }

  // ─── Grouping: (ekspresi) ─────────────────────────
  if (tok.tipe === TT.TK_KURUNG_BUKA && !isCallContext(parser)) {
    parser.advance();
    var inner = parseExpression(parser, 0);
    var closeParen = parser.expect(TT.TK_KURUNG_TUTUP);
    if (!closeParen) {
      // Error recovery: buat ErrorNode
      var errLoc = AST.buatLoc(
        { line: tok.baris, column: tok.kolom },
        inner ? inner.loc.end : { line: tok.baris, column: tok.kolom + 1 }
      );
      parser.addError('E2005', 'Kurung tutup ")" tidak ditemukan', errLoc);
    }
    // Update loc untuk mencakup kurung
    if (closeParen) {
      inner.loc = AST.buatLoc(
        { line: tok.baris, column: tok.kolom },
        { line: closeParen.baris, column: closeParen.kolom + 1 }
      );
    }
    return inner;
  }

  // ─── Object Literal ───────────────────────────────
  if (tok.tipe === TT.TK_KURAWAL_BUKA) {
    return parseObjectLiteral(parser);
  }

  // ─── Array Literal ────────────────────────────────
  if (tok.tipe === TT.TK_KURUNG_SIKU_BUKA) {
    return parseArrayLiteral(parser);
  }

  // ─── Error: token tidak bisa memulai ekspresi ─────
  var errToken = parser.advance();
  var errLoc = AST.buatLoc(
    { line: errToken.baris, column: errToken.kolom },
    { line: errToken.baris, column: errToken.kolom + (errToken.nilai || '').length }
  );
  return AST.buatErrorNode('E2001',
    'Diharapkan ekspresi, tetapi ditemukan "' + errToken.nilai + '"',
    errLoc, errToken);
}

/**
 * Cek apakah TK_IDENTIFIER bisa dimulai di posisi ini.
 * Helper untuk menghindari konflik keyword yang juga merupakan TK_IDENTIFIER.
 */
function TK_IDENTIFIER_PASS(parser) {
  return TT.TK_IDENTIFIER;
}

/**
 * Parse postfix: member access (a.b) dan function call (f(x)).
 * Dipanggil setelah parsing primary expression.
 */
function parsePostfix(parser, lhs) {
  while (true) {
    var tok = parser.peek();

    // Member access: a.b
    if (tok.tipe === TT.TK_TITIK) {
      parser.advance();
      var propToken = parser.expect(TT.TK_IDENTIFIER);
      if (!propToken) {
        // Error: diharapkan identifier setelah titik
        var dotErrLoc = AST.buatLoc(
          { line: tok.baris, column: tok.kolom },
          { line: tok.baris, column: tok.kolom + 1 }
        );
        parser.addError('E2001', 'Diharapkan identifier setelah ".", tetapi ditemukan "' + parser.peek().nilai + '"', dotErrLoc);
        var errNode = AST.buatErrorNode('E2001', 'Identifier diharapkan setelah "."', dotErrLoc);
        lhs = AST.buatMemberExpression(lhs, errNode,
          AST.gabungLoc(lhs.loc, dotErrLoc));
        break;
      }
      var propNode = AST.buatIdentifier(propToken.nilai, AST.buatLoc(
        { line: propToken.baris, column: propToken.kolom },
        { line: propToken.baris, column: propToken.kolom + propToken.nilai.length }
      ));
      lhs = AST.buatMemberExpression(lhs, propNode,
        AST.gabungLoc(lhs.loc, propNode.loc));
      continue;
    }

    // Function call: f(x, y)
    if (tok.tipe === TT.TK_KURUNG_BUKA) {
      parser.advance();
      var args = parseArgumenList(parser, TT.TK_KURUNG_TUTUP);
      var closeTok = parser.expect(TT.TK_KURUNG_TUTUP);
      if (!closeTok) {
        var callErrLoc = AST.buatLoc(
          { line: tok.baris, column: tok.kolom },
          lhs.loc.end
        );
        parser.addError('E2005', 'Kurung tutup ")" tidak ditemukan', callErrLoc);
      }
      var callEndLoc = closeTok
        ? { line: closeTok.baris, column: closeTok.kolom + 1 }
        : lhs.loc.end;
      lhs = AST.buatCallExpression(lhs, args,
        AST.buatLoc(lhs.loc.start, callEndLoc));
      continue;
    }

    break;
  }

  return lhs;
}

/**
 * Cek apakah TK_MINUS seharusnya diinterpretasikan sebagai prefix (negasi).
 * Aturan: prefix jika sebelumnya bukan nilai (literal, identifier, ), ])
 */
function isMinusPrefix(parser) {
  var prev = parser.previousToken();
  if (!prev) return true;
  // Jika sebelumnya adalah nilai, maka ini infix (pengurangan)
  var valueTokens = [
    TT.TK_LITERAL_TEKS, TT.TK_LITERAL_ANGKA,
    TT.TK_BENAR, TT.TK_SALAH, TT.TK_KOSONG,
    TT.TK_IDENTIFIER, TT.TK_KURUNG_TUTUP,
    TT.TK_KURUNG_SIKU_TUTUP, TT.TK_KURAWAL_TUTUP
  ];
  return valueTokens.indexOf(prev.tipe) === -1;
}

/**
 * Cek apakah TK_KURUNG_BUKA di posisi ini adalah function call (postfix)
 * atau grouping (prefix).
 * Aturan: jika sebelumnya adalah nilai, maka ini function call.
 */
function isCallContext(parser) {
  var prev = parser.previousToken();
  if (!prev) return false;
  var valueTokens = [
    TT.TK_LITERAL_TEKS, TT.TK_LITERAL_ANGKA,
    TT.TK_BENAR, TT.TK_SALAH, TT.TK_KOSONG,
    TT.TK_IDENTIFIER, TT.TK_KURUNG_TUTUP,
    TT.TK_KURUNG_SIKU_TUTUP, TT.TK_KURAWAL_TUTUP
  ];
  return valueTokens.indexOf(prev.tipe) !== -1;
}

/**
 * Parse daftar argumen hingga token penutup.
 * @param {object} parser
 * @param {string} closeToken - Tipe token penutup
 * @returns {Array} Daftar expression node
 */
function parseArgumenList(parser, closeToken) {
  var args = [];

  // Skip whitespace tokens
  parser.skipBarisBaru();

  if (parser.check(closeToken)) {
    return args;
  }

  // Parse argumen pertama
  args.push(parseExpression(parser, 0));

  // Parse argumen berikutnya yang dipisahkan koma
  while (parser.match(TT.TK_KOMA)) {
    args.push(parseExpression(parser, 0));
  }

  return args;
}

/**
 * Parse object literal { kunci: nilai, ... }
 */
function parseObjectLiteral(parser) {
  var openToken = parser.advance(); // konsumsi {
  var properties = [];

  parser.skipBarisBaru();

  // Cek objek kosong
  if (parser.check(TT.TK_KURAWAL_TUTUP)) {
    var closeTok = parser.advance();
    return AST.buatObjectLiteral(properties, AST.buatLoc(
      { line: openToken.baris, column: openToken.kolom },
      { line: closeTok.baris, column: closeTok.kolom + 1 }
    ));
  }

  // Parse entri objek
  while (true) {
    parser.skipBarisBaru();

    var prop = parseObjekEntri(parser);
    if (prop) {
      properties.push(prop);
    }

    parser.skipBarisBaru();

    // Cek koma atau akhir
    if (parser.check(TT.TK_KOMA)) {
      parser.advance();
      parser.skipBarisBaru();
      continue;
    }

    if (parser.check(TT.TK_KURAWAL_TUTUP)) {
      break;
    }

    // Error: token tidak diharapkan
    var errTok = parser.peek();
    parser.addError('E2014', 'Properti objek literal tidak valid', AST.buatLoc(
      { line: errTok.baris, column: errTok.kolom },
      { line: errTok.baris, column: errTok.kolom + (errTok.nilai || '').length }
    ));
    break;
  }

  var closeBrace = parser.expect(TT.TK_KURAWAL_TUTUP);
  if (!closeBrace) {
    parser.addError('E2006', 'Kurung kurawal tutup "}" tidak ditemukan',
      AST.buatLoc({ line: openToken.baris, column: openToken.kolom }, null));
    closeBrace = { baris: openToken.baris, kolom: openToken.kolom + 1 };
  }

  return AST.buatObjectLiteral(properties, AST.buatLoc(
    { line: openToken.baris, column: openToken.kolom },
    { line: closeBrace.baris, column: closeBrace.kolom + 1 }
  ));
}

/**
 * Parse satu entri objek.
 * entri_objek ::= IDENTIFIER ":" nilai_awal | LITERAL_TEKS ":" nilai_awal | IDENTIFIER (shorthand)
 */
function parseObjekEntri(parser) {
  var tok = parser.peek();

  // Shorthand: IDENTIFIER tanpa titik dua
  if (tok.tipe === TT.TK_IDENTIFIER && !parser.checkAny(TT.TK_TITIK_DUA, TT.TK_KOMA, TT.TK_KURAWAL_TUTUP)) {
    // Cek apakah token berikutnya adalah ':'
    var nextTok = parser.peek(1);
    if (nextTok.tipe !== TT.TK_TITIK_DUA) {
      // Shorthand property: { nama }
      parser.advance();
      var idNode = AST.buatIdentifier(tok.nilai, AST.buatLoc(
        { line: tok.baris, column: tok.kolom },
        { line: tok.baris, column: tok.kolom + tok.nilai.length }
      ));
      return AST.buatPropertyNode(tok.nilai, idNode,
        AST.buatLoc(
          { line: tok.baris, column: tok.kolom },
          { line: tok.baris, column: tok.kolom + tok.nilai.length }
        ),
        true  // shorthand
      );
    }
  }

  // Kunci: IDENTIFIER atau LITERAL_TEKS
  var key;
  var keyLoc;
  if (tok.tipe === TT.TK_IDENTIFIER) {
    parser.advance();
    key = tok.nilai;
    keyLoc = AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length }
    );
  } else if (tok.tipe === TT.TK_LITERAL_TEKS) {
    parser.advance();
    key = tok.nilai;
    keyLoc = AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length + 2 }
    );
  } else {
    parser.addError('E2014', 'Kunci properti objek tidak valid',
      AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
    return null;
  }

  // Titik dua
  var colon = parser.expect(TT.TK_TITIK_DUA);
  if (!colon) {
    parser.addError('E2001', 'Diharapkan ":" setelah kunci properti',
      AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
    return null;
  }

  // Nilai
  var value = parseNilaiAwal(parser);

  return AST.buatPropertyNode(key, value,
    AST.gabungLoc(keyLoc, value.loc),
    false
  );
}

/**
 * Parse array literal [ nilai, ... ]
 */
function parseArrayLiteral(parser) {
  var openToken = parser.advance(); // konsumsi [
  var elements = [];

  parser.skipBarisBaru();

  // Cek array kosong
  if (parser.check(TT.TK_KURUNG_SIKU_TUTUP)) {
    var closeTok = parser.advance();
    return AST.buatArrayLiteral(elements, AST.buatLoc(
      { line: openToken.baris, column: openToken.kolom },
      { line: closeTok.baris, column: closeTok.kolom + 1 }
    ));
  }

  // Parse elemen pertama
  elements.push(parseNilaiAwal(parser));

  // Parse elemen berikutnya
  while (parser.match(TT.TK_KOMA)) {
    parser.skipBarisBaru();
    elements.push(parseNilaiAwal(parser));
  }

  parser.skipBarisBaru();

  var closeBracket = parser.expect(TT.TK_KURUNG_SIKU_TUTUP);
  if (!closeBracket) {
    parser.addError('E2007', 'Kurung siku tutup "]" tidak ditemukan',
      AST.buatLoc({ line: openToken.baris, column: openToken.kolom }, null));
    closeBracket = { baris: openToken.baris, kolom: openToken.kolom + 1 };
  }

  return AST.buatArrayLiteral(elements, AST.buatLoc(
    { line: openToken.baris, column: openToken.kolom },
    { line: closeBracket.baris, column: closeBracket.kolom + 1 }
  ));
}

/**
 * Parse nilai_awal (dipakai pada deklarasi data, tetap, ubah, parameter default).
 * nilai_awal ::= LITERAL | IDENTIFIER | akses_properti | objek_literal | array_literal | ekspresi_aritmatika
 */
function parseNilaiAwal(parser) {
  return parseExpression(parser, 0);
}

/**
 * Parse ekspresi turunan (dipakai pada deklarasi turunan).
 * Sama seperti parseExpression, tapi dibatasi pada ekspresi murni.
 */
function parseEkspresiTurunan(parser) {
  return parseExpression(parser, 0);
}

/**
 * Parse kondisi (dipakai pada jika, selama).
 * Kondisi adalah ekspresi boolean yang bisa mengandung operator perbandingan dan logika.
 */
function parseKondisi(parser) {
  return parseExpression(parser, 0);
}

module.exports = {
  parseExpression: parseExpression,
  parsePrefix: parsePrefix,
  parsePostfix: parsePostfix,
  parseArgumenList: parseArgumenList,
  parseObjectLiteral: parseObjectLiteral,
  parseArrayLiteral: parseArrayLiteral,
  parseNilaiAwal: parseNilaiAwal,
  parseEkspresiTurunan: parseEkspresiTurunan,
  parseKondisi: parseKondisi,
  isMinusPrefix: isMinusPrefix,
  isCallContext: isCallContext
};
