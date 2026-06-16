/**
 * KARSA v0.3.1 — Statement Parser
 *
 * Dispatch dan implementasi semua handler pernyataan KARSA.
 * Berdasarkan: RFC-PARSER-001 Lampiran B, KARSA-grammar-spec_v0.3.1
 */

var TT = require('./token-types');
var AST = require('./ast-factory');
var BP = require('./binding-powers');
var Expr = require('./expression-parser');
var Sel = require('./selector-parser');

/**
 * Dispatch statement berdasarkan keyword awal.
 * Dipanggil oleh parser utama ketika menemukan keyword di posisi statement.
 *
 * @param {object} parser - Instance parser utama
 * @returns {object} AST node statement
 */
function parseStatement(parser) {
  var tok = parser.peek();

  switch (tok.tipe) {
    // ─── Struktur DOM ──────────────────────────────
    case TT.TK_BUAT: return parseBuatStatement(parser);
    case TT.TK_TAMPILKAN: return parseTampilkanStatement(parser);
    case TT.TK_SEMBUNYIKAN: return parseSembunyikanStatement(parser);
    case TT.TK_HAPUS: return parseHapusStatement(parser);
    case TT.TK_KOSONGKAN: return parseKosongkanStatement(parser);
    case TT.TK_PERBARUI: return parsePerbaruiStatement(parser);

    // ─── Perilaku & Event ──────────────────────────
    case TT.TK_KETIKA: return parseKetikaStatement(parser);
    case TT.TK_SAAT: return parseSaatStatement(parser);
    case TT.TK_SETELAH: return parseSetelahStatement(parser);

    // ─── Logika ────────────────────────────────────
    case TT.TK_JIKA: return parseJikaStatement(parser);
    case TT.TK_KALAU: return parseKalauStatement(parser);
    case TT.TK_JIKA_TIDAK: return parseJikaTidakStatement(parser);
    case TT.TK_ULANGI: return parseUlangiStatement(parser);
    case TT.TK_SELAMA: return parseSelamaStatement(parser);
    case TT.TK_BERHENTI: return parseBerhentiStatement(parser);
    case TT.TK_LEWATI: return parseLewatiStatement(parser);
    case TT.TK_KEMBALIKAN: return parseKembalikanStatement(parser);

    // ─── Data & Reaktivitas ────────────────────────
    case TT.TK_DATA: return parseDataDeclaration(parser);
    case TT.TK_TETAP: return parseTetapDeclaration(parser);
    case TT.TK_UBAH: return parseUbahDeclaration(parser);
    case TT.TK_TURUNAN: return parseTurunanDeclaration(parser);
    case TT.TK_SIMPAN: return parseSimpanStatement(parser);
    case TT.TK_TAMBAHKAN: return parseTambahkanStatement(parser);
    case TT.TK_KURANGI: return parseKurangiStatement(parser);
    case TT.TK_SISIPKAN: return parseSisipkanStatement(parser);
    case TT.TK_AMBIL: return parseAmbilStatement(parser);

    // ─── Komponen ──────────────────────────────────
    case TT.TK_KOMPONEN: return parseKomponenDeclaration(parser);
    case TT.TK_GUNAKAN: return parseGunakanStatement(parser);

    // ─── Fungsi & Interop ──────────────────────────
    case TT.TK_FUNGSI: return parseFungsiDeclaration(parser);
    case TT.TK_JALANKAN: return parseJalankanExpression(parser);
    case TT.TK_LANGSUNG: return parseLangsungBlock(parser);

    // ─── Navigasi ──────────────────────────────────
    case TT.TK_ARAHKAN: return parseArahkanStatement(parser);
    case TT.TK_MUAT_ULANG: return parseMuatUlangStatement(parser);
    case TT.TK_KEMBALI: return parseKembaliStatement(parser);

    // ─── Rantai aksi (lalu) ────────────────────────
    case TT.TK_LALU: return parseRantaiAksi(parser);

    // ─── Pemanggilan fungsi native sebagai statement ─
    case TT.TK_IDENTIFIER:
      return parsePanggilNativeStatement(parser);

    default:
      // Token tidak dikenali sebagai statement
      var errTok = parser.advance();
      var errLoc = AST.buatLoc(
        { line: errTok.baris, column: errTok.kolom },
        { line: errTok.baris, column: errTok.kolom + (errTok.nilai || '').length }
      );
      parser.addError('E2010', 'Keyword tidak dikenali di posisi statement: "' + errTok.nilai + '"', errLoc);
      return AST.buatErrorNode('E2010', 'Keyword tidak dikenali', errLoc, errTok);
  }
}

// ═══════════════════════════════════════════════════════════
// STRUKTUR DOM
// ═══════════════════════════════════════════════════════════

/**
 * parseBuatStatement: "buat" SELEKTOR [ blok_properti | properti_inline ]
 */
function parseBuatStatement(parser) {
  var startToken = parser.advance(); // konsumsi 'buat'
  var docstring = startToken.docstring;
  var startLoc = AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null);

  // Parse selector
  var selector = Sel.parseSelector(parser);
  if (selector.type === 'ErrorNode') {
    return selector;
  }

  var properties = null;
  var body = null;
  var action = null;

  // Cek lanjutan setelah selector
  parser.skipBarisBaru();

  var nextTok = parser.peek();

  // -> properti inline atau aksi tunggal
  if (nextTok.tipe === TT.TK_PANAH) {
    parser.advance(); // konsumsi ->

    // Disambiguasi: properti (kunci: nilai) atau aksi tunggal
    var result = parseBuatPanahContent(parser);
    if (result.kind === 'properties') {
      properties = result.value;
    } else {
      action = result.value;
    }
  }
  // Blok indentasi (anak)
  else if (nextTok.tipe === TT.TK_INDENT) {
    body = parseBlokAksi(parser);
  }
  // Baris baru mungkin diikuti indentasi di baris berikutnya
  else if (nextTok.tipe === TT.TK_BARIS_BARU) {
    // Cek apakah baris berikutnya adalah indent
    var afterNewline = parser.peek(1);
    if (afterNewline && afterNewline.tipe === TT.TK_INDENT) {
      parser.skipBarisBaru();
      if (parser.check(TT.TK_INDENT)) {
        body = parseBlokAksi(parser);
      }
    }
  }

  // Cek apakah setelah properti inline ada blok anak juga
  if (properties && !body && !action) {
    parser.skipBarisBaru();
    if (parser.check(TT.TK_INDENT)) {
      body = parseBlokAksi(parser);
    }
  }

  // Hitung lokasi akhir
  var endLoc;
  if (body) endLoc = body.loc.end;
  else if (action) endLoc = action.loc.end;
  else if (properties && properties.length > 0) endLoc = properties[properties.length - 1].loc.end;
  else endLoc = selector.loc.end;

  return AST.buatBuatStatement(selector,
    AST.buatLoc(startLoc.start, endLoc),
    docstring, properties, body, action);
}

/**
 * Disambiguasi konten setelah -> pada buat:
 * - Properti: teks: "nilai", kelas: "aktif"
 * - Aksi tunggal: hapusItem(indeks), tampilkan "#pesan"
 */
function parseBuatPanahContent(parser) {
  var tok = parser.peek();

  // Cek apakah ini properti (kunci: nilai)
  if (tok.tipe === TT.TK_IDENTIFIER || tok.tipe === TT.TK_LITERAL_TEKS) {
    var next = parser.peek(1);
    if (next && next.tipe === TT.TK_TITIK_DUA) {
      // Ini properti
      return { kind: 'properties', value: parsePropertiInline(parser) };
    }
  }

  // Ini aksi tunggal
  var aksi = parseAksiTunggal(parser);
  return { kind: 'action', value: aksi };
}

/**
 * Parse properti inline setelah -> pada buat.
 * Format: kunci: nilai [, kunci: nilai ...]
 */
function parsePropertiInline(parser) {
  var properties = [];

  while (true) {
    var prop = parsePasanganProperti(parser);
    if (prop) {
      properties.push(prop);
    }

    // Cek koma untuk properti berikutnya
    if (parser.check(TT.TK_KOMA)) {
      parser.advance();
      continue;
    }

    break;
  }

  return properties;
}

/**
 * Parse satu pasangan properti: kunci ":" nilai
 */
function parsePasanganProperti(parser) {
  var keyToken = parser.peek();
  var key;
  var keyLoc;

  if (keyToken.tipe === TT.TK_IDENTIFIER) {
    parser.advance();
    key = keyToken.nilai;
    keyLoc = AST.buatLoc(
      { line: keyToken.baris, column: keyToken.kolom },
      { line: keyToken.baris, column: keyToken.kolom + key.length }
    );
  } else if (keyToken.tipe === TT.TK_LITERAL_TEKS) {
    parser.advance();
    key = keyToken.nilai;
    keyLoc = AST.buatLoc(
      { line: keyToken.baris, column: keyToken.kolom },
      { line: keyToken.baris, column: keyToken.kolom + key.length + 2 }
    );
  } else {
    return null;
  }

  // Titik dua
  var colon = parser.expect(TT.TK_TITIK_DUA);
  if (!colon) {
    parser.addError('E2001', 'Diharapkan ":" setelah kunci properti',
      AST.buatLoc({ line: keyToken.baris, column: keyToken.kolom }, null));
    return null;
  }

  // Nilai properti
  var value = Expr.parseNilaiAwal(parser);

  return AST.buatPropertyNode(key, value,
    AST.gabungLoc(keyLoc, value.loc), false);
}

/**
 * parseTampilkanStatement: "tampilkan" target_tampilkan [ "di" target_muat ] [ opsi_tampilkan ]
 */
function parseTampilkanStatement(parser) {
  var startToken = parser.advance(); // konsumsi 'tampilkan'
  var docstring = startToken.docstring;
  var startLoc = AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null);

  var target = null;
  var mountTarget = null;
  var mode = null;
  var messageKind = null;

  // Cek "pesan", "pesan-error", "notifikasi"
  var tok = parser.peek();
  if (tok.tipe === TT.TK_IDENTIFIER && tok.nilai === 'pesan') {
    parser.advance();
    messageKind = 'pesan';
    // Selanjutnya harus literal teks
    var msgToken = parser.expect(TT.TK_LITERAL_TEKS);
    if (msgToken) {
      target = AST.buatLiteral(msgToken.nilai, 'teks', AST.buatLoc(
        { line: msgToken.baris, column: msgToken.kolom },
        { line: msgToken.baris, column: msgToken.kolom + msgToken.nilai.length + 2 }
      ));
    } else {
      parser.addError('E2022', 'Diharapkan teks pesan setelah "pesan"',
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
      target = AST.buatErrorNode('E2022', 'Teks pesan diharapkan',
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
    }
  } else if (tok.tipe === TT.TK_IDENTIFIER && tok.nilai === 'pesan-error') {
    parser.advance();
    messageKind = 'pesan-error';
    var errMsgToken = parser.expect(TT.TK_LITERAL_TEKS);
    if (errMsgToken) {
      target = AST.buatLiteral(errMsgToken.nilai, 'teks', AST.buatLoc(
        { line: errMsgToken.baris, column: errMsgToken.kolom },
        { line: errMsgToken.baris, column: errMsgToken.kolom + errMsgToken.nilai.length + 2 }
      ));
    }
  } else if (tok.tipe === TT.TK_IDENTIFIER && tok.nilai === 'notifikasi') {
    parser.advance();
    messageKind = 'notifikasi';
    var notifMsgToken = parser.expect(TT.TK_LITERAL_TEKS);
    if (notifMsgToken) {
      target = AST.buatLiteral(notifMsgToken.nilai, 'teks', AST.buatLoc(
        { line: notifMsgToken.baris, column: notifMsgToken.kolom },
        { line: notifMsgToken.baris, column: notifMsgToken.kolom + notifMsgToken.nilai.length + 2 }
      ));
    }
  } else {
    // Target normal: selector, identifier, literal
    target = Sel.parseTargetElemen(parser);
    if (!target) {
      parser.addError('E2022', 'Target "tampilkan" tidak valid',
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
      target = AST.buatErrorNode('E2022', 'Target tampilkan tidak valid',
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
    }
  }

  // "di" target_mount
  if (parser.check(TT.TK_DI)) {
    parser.advance();
    mountTarget = Sel.parseTargetElemen(parser);
  }

  // "dengan mode: <mode>"
  if (parser.check(TT.TK_DENGAN)) {
    parser.advance();
    var modeKey = parser.expect(TT.TK_IDENTIFIER);
    if (modeKey && modeKey.nilai === 'mode') {
      parser.expect(TT.TK_TITIK_DUA);
      var modeVal = parser.expect(TT.TK_LITERAL_TEKS);
      if (modeVal) {
        mode = modeVal.nilai;
      }
    }
  }

  var endLoc = target ? target.loc.end : startLoc.start;
  if (mountTarget) endLoc = mountTarget.loc.end;

  return AST.buatTampilkanStatement(target,
    AST.buatLoc(startLoc.start, endLoc),
    docstring, mountTarget, mode, messageKind);
}

/**
 * parseSembunyikanStatement: "sembunyikan" target_elemen
 */
function parseSembunyikanStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;
  var target = Sel.parseTargetElemen(parser);
  return AST.buatSembunyikanStatement(target,
    AST.buatLoc(
      { line: startToken.baris, column: startToken.kolom },
      target ? target.loc.end : { line: startToken.baris, column: startToken.kolom + 1 }
    ),
    docstring);
}

/**
 * parseHapusStatement: "hapus" target_elemen
 */
function parseHapusStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;
  var target = Sel.parseTargetElemen(parser);
  return AST.buatHapusStatement(target,
    AST.buatLoc(
      { line: startToken.baris, column: startToken.kolom },
      target ? target.loc.end : { line: startToken.baris, column: startToken.kolom + 1 }
    ),
    docstring);
}

/**
 * parseKosongkanStatement: "kosongkan" target_elemen
 */
function parseKosongkanStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;
  var target = Sel.parseTargetElemen(parser);
  return AST.buatKosongkanStatement(target,
    AST.buatLoc(
      { line: startToken.baris, column: startToken.kolom },
      target ? target.loc.end : { line: startToken.baris, column: startToken.kolom + 1 }
    ),
    docstring);
}

/**
 * parsePerbaruiStatement: "perbarui" kunci_properti target_elemen "->" nilai_properti
 */
function parsePerbaruiStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  // Nama properti (teks, html, nilai, kelas, dll)
  var propToken = parser.expect(TT.TK_IDENTIFIER);
  var property = propToken ? propToken.nilai : '';

  // Target elemen
  var target = Sel.parseTargetElemen(parser);

  // ->
  var panah = parser.expect(TT.TK_PANAH);
  if (!panah) {
    parser.addError('E2016', 'Token "->" diharapkan',
      AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
  }

  // Nilai
  var value = Expr.parseNilaiAwal(parser);

  return AST.buatPerbaruiStatement(property, target, value,
    AST.buatLoc(
      { line: startToken.baris, column: startToken.kolom },
      value ? value.loc.end : { line: startToken.baris, column: startToken.kolom + 1 }
    ),
    docstring);
}

// ═══════════════════════════════════════════════════════════
// PERILAKU & EVENT
// ═══════════════════════════════════════════════════════════

/**
 * parseKetikaStatement:
 *   "ketika" [target_event] nama_event ":" blok_aksi
 * | "ketika" [target_event] nama_event "->" aksi_tunggal
 */
function parseKetikaStatement(parser) {
  var startToken = parser.advance(); // konsumsi 'ketika'
  var docstring = startToken.docstring;

  var target = null;
  var event = '';

  // Cek apakah ada target event sebelum nama event
  // Target bisa: selector, identifier, "halaman", "form" IDENTIFIER
  var tok = parser.peek();

  // Cek apakah token saat ini adalah nama event langsung (self-reference)
  if (TT.EVENT_TOKENS.indexOf(tok.tipe) !== -1) {
    // Tidak ada target, self-reference
    event = parseNamaEvent(parser);
  } else {
    // Ada target event
    target = parseTargetEvent(parser);

    // Parse nama event setelah target
    event = parseNamaEvent(parser);
  }

  // Cek ":" atau "->"
  var nextTok = parser.peek();
  var body = null;
  var action = null;

  if (nextTok.tipe === TT.TK_TITIK_DUA) {
    parser.advance(); // konsumsi :
    body = parseBlokAksi(parser);
  } else if (nextTok.tipe === TT.TK_PANAH) {
    parser.advance(); // konsumsi ->
    action = parseAksiTunggal(parser);
  } else {
    parser.addError('E2004', 'Blok aksi diharapkan setelah ":"',
      AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
  }

  var endLoc;
  if (body) endLoc = body.loc.end;
  else if (action) endLoc = action.loc.end;
  else endLoc = { line: startToken.baris, column: startToken.kolom + 1 };

  return AST.buatKetikaStatement(event,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring, target, body, action);
}

/**
 * Parse target event: selector, identifier, "halaman", "form" IDENTIFIER
 */
function parseTargetEvent(parser) {
  var tok = parser.peek();

  // "halaman" - target khusus
  if (tok.tipe === TT.TK_IDENTIFIER && tok.nilai === 'halaman') {
    parser.advance();
    return AST.buatIdentifier('halaman', AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + 7 }
    ));
  }

  // Selector (tag HTML + id/class)
  if (Sel.isSelectorStart(parser)) {
    return Sel.parseSelector(parser);
  }

  // Literal teks
  if (tok.tipe === TT.TK_LITERAL_TEKS) {
    parser.advance();
    return AST.buatLiteral(tok.nilai, 'teks', AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length + 2 }
    ));
  }

  // Identifier
  if (tok.tipe === TT.TK_IDENTIFIER) {
    parser.advance();
    return AST.buatIdentifier(tok.nilai, AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length }
    ));
  }

  parser.addError('E2017', 'Target event tidak valid',
    AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
  return null;
}

/**
 * Parse nama event: diklik, diketik, disubmit, dll
 */
function parseNamaEvent(parser) {
  var tok = parser.peek();
  if (TT.EVENT_TOKENS.indexOf(tok.tipe) !== -1) {
    parser.advance();
    return tok.nilai;
  }
  parser.addError('E2018', 'Nama event tidak valid: "' + tok.nilai + '"',
    AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
  return '';
}

/**
 * parseSaatStatement:
 *   "saat" IDENTIFIER "berubah" ":" blok_aksi
 * | "saat" "komponen" ("dipasang" | "diperbarui" | "dilepas") ":" blok_aksi
 */
function parseSaatStatement(parser) {
  var startToken = parser.advance(); // konsumsi 'saat'
  var docstring = startToken.docstring;

  // Disambiguasi: saat <nama> berubah vs saat komponen dipasang/diperbarui/dilepas
  var tok = parser.peek();

  if (tok.tipe === TT.TK_KOMPONEN) {
    // Lifecycle statement
    parser.advance(); // konsumsi 'komponen'
    var lifecycleToken = parser.peek();
    var kind = '';

    if (lifecycleToken.tipe === TT.TK_DIPASANG) {
      kind = 'dipasang';
      parser.advance();
    } else if (lifecycleToken.tipe === TT.TK_DILEPAS_DARI_DOM) {
      kind = 'dilepas';
      parser.advance();
    } else if (lifecycleToken.tipe === TT.TK_IDENTIFIER && lifecycleToken.nilai === 'diperbarui') {
      kind = 'diperbarui';
      parser.advance();
    } else {
      parser.addError('E2010', 'Lifecycle hook tidak valid',
        AST.buatLoc({ line: lifecycleToken.baris, column: lifecycleToken.kolom }, null));
    }

    parser.expect(TT.TK_TITIK_DUA);
    var body = parseBlokAksi(parser);

    return AST.buatLifecycleStatement(kind, body,
      AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, body.loc.end),
      docstring);
  }

  // Saat <nama> berubah
  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var name = nameToken ? nameToken.nilai : '';

  var berubahToken = parser.expect(TT.TK_BERUBAH);
  if (!berubahToken) {
    parser.addError('E2001', 'Diharapkan "berubah" setelah nama variabel',
      AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
  }

  parser.expect(TT.TK_TITIK_DUA);
  var saatBody = parseBlokAksi(parser);

  return AST.buatSaatStatement(name, saatBody,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, saatBody.loc.end),
    docstring);
}

/**
 * parseSetelahStatement: "setelah" IDENTIFIER "selesai" (":" | "->") (blok_aksi | aksi_tunggal)
 */
function parseSetelahStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var target = nameToken ? nameToken.nilai : '';

  // "selesai"
  var selesaiToken = parser.expect(TT.TK_IDENTIFIER);
  if (!selesaiToken || selesaiToken.nilai !== 'selesai') {
    parser.addError('E2001', 'Diharapkan "selesai" setelah nama operasi',
      AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
  }

  var body = null;
  var action = null;

  var nextTok = parser.peek();
  if (nextTok.tipe === TT.TK_TITIK_DUA) {
    parser.advance();
    body = parseBlokAksi(parser);
  } else if (nextTok.tipe === TT.TK_PANAH) {
    parser.advance();
    action = parseAksiTunggal(parser);
  }

  var endLoc = body ? body.loc.end : (action ? action.loc.end : { line: startToken.baris, column: startToken.kolom + 1 });
  return AST.buatSetelahStatement(target,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring, body, action);
}

// ═══════════════════════════════════════════════════════════
// LOGIKA
// ═══════════════════════════════════════════════════════════

/**
 * parseJikaStatement: "jika" kondisi ":" blok_aksi { "kalau" kondisi ":" blok_aksi } ["jika tidak" ":" blok_aksi]
 */
function parseJikaStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  // Kondisi
  var condition = Expr.parseKondisi(parser);

  // ":"
  parser.expect(TT.TK_TITIK_DUA);

  // Blok aksi
  var consequent = parseBlokAksi(parser);

  // Cek kalau/jika tidak
  var alternate = null;

  if (parser.check(TT.TK_KALAU)) {
    // kalau → nested JikaStatement
    alternate = parseJikaStatement(parser);
  } else if (parser.check(TT.TK_JIKA_TIDAK)) {
    // jika tidak → BlockStatement
    parser.advance(); // konsumsi 'jika tidak'
    parser.expect(TT.TK_TITIK_DUA);
    alternate = parseBlokAksi(parser);
  }

  var endLoc = alternate ? alternate.loc.end : consequent.loc.end;
  return AST.buatJikaStatement(condition, consequent,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring, alternate);
}

/**
 * parseKalauStatement: ditangani sebagai kelanjutan jika
 */
function parseKalauStatement(parser) {
  // 'kalau' tidak pernah memulai statement mandiri
  return parseJikaStatement(parser);
}

/**
 * parseJikaTidakStatement: ditangani sebagai kelanjutan jika
 */
function parseJikaTidakStatement(parser) {
  var startToken = parser.advance(); // konsumsi 'jika tidak'
  parser.expect(TT.TK_TITIK_DUA);
  return parseBlokAksi(parser);
}

/**
 * parseUlangiStatement:
 *   "ulangi" IDENTIFIER "dari" sumber_data ":" blok_aksi
 * | "ulangi" LITERAL_ANGKA "kali" ":" blok_aksi
 * | "ulangi" IDENTIFIER "dari" LITERAL_ANGKA "sampai" LITERAL_ANGKA ":" blok_aksi
 */
function parseUlangiStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var iteratorName = '';
  var source = null;
  var kind = 'dari';
  var rangeEnd = null;

  var tok = parser.peek();

  if (tok.tipe === TT.TK_LITERAL_ANGKA) {
    // ulangi <N> kali:
    kind = 'kali';
    source = Expr.parseExpression(parser, 0);
    // "kali"
    var kaliToken = parser.expect(TT.TK_IDENTIFIER);
    if (!kaliToken || kaliToken.nilai !== 'kali') {
      parser.addError('E2021', 'Diharapkan "kali" setelah angka',
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
    }
  } else if (tok.tipe === TT.TK_IDENTIFIER) {
    parser.advance();
    iteratorName = tok.nilai;

    // Cek "dari"
    if (parser.check(TT.TK_DARI)) {
      parser.advance(); // konsumsi 'dari'

      var dariSource = parser.peek();

      // Cek apakah ini rentang: dari <angka> sampai <angka>
      if (dariSource.tipe === TT.TK_LITERAL_ANGKA) {
        source = Expr.parseExpression(parser, 0);

        if (parser.check(TT.TK_IDENTIFIER) && parser.peek().nilai === 'sampai') {
          parser.advance(); // konsumsi 'sampai'
          kind = 'rentang';
          rangeEnd = Expr.parseExpression(parser, 0);
        } else {
          kind = 'dari';
        }
      } else {
        // Sumber data: identifier, akses properti
        source = Expr.parseExpression(parser, 0);
        kind = 'dari';
      }
    } else {
      parser.addError('E2021', 'Diharapkan "dari" setelah nama iterator',
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
      source = AST.buatErrorNode('E2021', 'Sumber data ulangi tidak valid',
        AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
    }
  } else {
    parser.addError('E2021', 'Sumber data ulangi tidak valid',
      AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
    source = AST.buatErrorNode('E2021', 'Sumber data ulangi tidak valid',
      AST.buatLoc({ line: tok.baris, column: tok.kolom }, null));
  }

  // ":"
  parser.expect(TT.TK_TITIK_DUA);

  // Blok aksi
  var body = parseBlokAksi(parser);

  return AST.buatUlangiStatement(iteratorName, source, body, kind,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, body.loc.end),
    docstring, rangeEnd);
}

/**
 * parseSelamaStatement: "selama" kondisi ":" blok_aksi
 */
function parseSelamaStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var condition = Expr.parseKondisi(parser);
  parser.expect(TT.TK_TITIK_DUA);
  var body = parseBlokAksi(parser);

  return AST.buatSelamaStatement(condition, body,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, body.loc.end),
    docstring);
}

/**
 * parseBerhentiStatement: "berhenti"
 */
function parseBerhentiStatement(parser) {
  var tok = parser.advance();
  return AST.buatBerhentiStatement(
    AST.buatLoc({ line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length }));
}

/**
 * parseLewatiStatement: "lewati"
 */
function parseLewatiStatement(parser) {
  var tok = parser.advance();
  return AST.buatLewatiStatement(
    AST.buatLoc({ line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length }));
}

/**
 * parseKembalikanStatement: "kembalikan" [ nilai ]
 */
function parseKembalikanStatement(parser) {
  var startToken = parser.advance();

  var value = null;
  // Cek apakah ada nilai setelah 'kembalikan'
  var nextTok = parser.peek();
  if (nextTok.tipe !== TT.TK_BARIS_BARU && nextTok.tipe !== TT.TK_DEDENT && nextTok.tipe !== TT.TK_EOF) {
    value = Expr.parseExpression(parser, 0);
  }

  var endLoc = value ? value.loc.end : { line: startToken.baris, column: startToken.kolom + startToken.nilai.length };
  return AST.buatKembalikanStatement(
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    value);
}

// ═══════════════════════════════════════════════════════════
// DATA & REAKTIVITAS
// ═══════════════════════════════════════════════════════════

/**
 * parseDataDeclaration: "data" IDENTIFIER [ ":" tipe_data ] "=" nilai_awal
 */
function parseDataDeclaration(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var name = nameToken ? nameToken.nilai : '';

  // Cek type hint opsional
  var typeHint = null;
  if (parser.check(TT.TK_TITIK_DUA)) {
    parser.advance();
    var typeToken = parser.expect(TT.TK_IDENTIFIER);
    if (typeToken) typeHint = typeToken.nilai;
  }

  // "="
  parser.expect(TT.TK_TANDA_SAMA);

  // Nilai awal
  var init = Expr.parseNilaiAwal(parser);

  return AST.buatDataDeclaration(name, typeHint, init,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, init.loc.end),
    docstring);
}

/**
 * parseTetapDeclaration: "tetap" IDENTIFIER [ ":" tipe_data ] "=" nilai_awal
 */
function parseTetapDeclaration(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var name = nameToken ? nameToken.nilai : '';

  var typeHint = null;
  if (parser.check(TT.TK_TITIK_DUA)) {
    parser.advance();
    var typeToken = parser.expect(TT.TK_IDENTIFIER);
    if (typeToken) typeHint = typeToken.nilai;
  }

  parser.expect(TT.TK_TANDA_SAMA);
  var init = Expr.parseNilaiAwal(parser);

  return AST.buatTetapDeclaration(name, typeHint, init,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, init.loc.end),
    docstring);
}

/**
 * parseUbahDeclaration: "ubah" IDENTIFIER [ ":" tipe_data ] "=" nilai_awal
 */
function parseUbahDeclaration(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var name = nameToken ? nameToken.nilai : '';

  var typeHint = null;
  if (parser.check(TT.TK_TITIK_DUA)) {
    parser.advance();
    var typeToken = parser.expect(TT.TK_IDENTIFIER);
    if (typeToken) typeHint = typeToken.nilai;
  }

  parser.expect(TT.TK_TANDA_SAMA);
  var init = Expr.parseNilaiAwal(parser);

  return AST.buatUbahDeclaration(name, typeHint, init,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, init.loc.end),
    docstring);
}

/**
 * parseTurunanDeclaration: "turunan" IDENTIFIER [ ":" tipe_data ] "=" ekspresi_turunan
 */
function parseTurunanDeclaration(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var name = nameToken ? nameToken.nilai : '';

  var typeHint = null;
  if (parser.check(TT.TK_TITIK_DUA)) {
    parser.advance();
    var typeToken = parser.expect(TT.TK_IDENTIFIER);
    if (typeToken) typeHint = typeToken.nilai;
  }

  parser.expect(TT.TK_TANDA_SAMA);
  var init = Expr.parseEkspresiTurunan(parser);

  return AST.buatTurunanDeclaration(name, typeHint, init,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, init.loc.end),
    docstring);
}

/**
 * parseSimpanStatement:
 *   "simpan" nilai "ke" IDENTIFIER
 * | IDENTIFIER "=" nilai
 */
function parseSimpanStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  // Cek apakah ini bentuk: simpan <nilai> ke <target>
  var value = Expr.parseExpression(parser, 0);
  var target = '';
  var simpanKind = 'simpan_ke';

  if (parser.check(TT.TK_KE)) {
    parser.advance(); // konsumsi 'ke'
    var targetToken = parser.expect(TT.TK_IDENTIFIER);
    target = targetToken ? targetToken.nilai : '';
  } else {
    // Bentuk assignment: identifier = nilai (sudah diparse sebagian)
    // value seharusnya identifier, dan "=" sudah dikonsumsi oleh expression parser
    // Tidak umum di simpan statement, tapi tangani
    if (value.type === 'Identifier') {
      target = value.name;
      simpanKind = 'assign_sama';
    }
  }

  return AST.buatSimpanStatement(value, target, simpanKind,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, value.loc.end),
    docstring);
}

/**
 * parseTambahkanStatement: "tambahkan" nilai "ke" IDENTIFIER
 */
function parseTambahkanStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var value = Expr.parseExpression(parser, 0);

  parser.expect(TT.TK_KE);
  var targetToken = parser.expect(TT.TK_IDENTIFIER);
  var target = targetToken ? targetToken.nilai : '';

  return AST.buatTambahkanStatement(value, target,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, value.loc.end),
    docstring);
}

/**
 * parseKurangiStatement: "kurangi" IDENTIFIER [ "dengan" nilai ]
 */
function parseKurangiStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var targetToken = parser.expect(TT.TK_IDENTIFIER);
  var target = targetToken ? targetToken.nilai : '';

  var value = null;
  if (parser.check(TT.TK_DENGAN)) {
    parser.advance();
    value = Expr.parseExpression(parser, 0);
  }

  var endLoc = value ? value.loc.end : (targetToken ? { line: targetToken.baris, column: targetToken.kolom + target.length } : null);
  return AST.buatKurangiStatement(target,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring, value);
}

/**
 * parseSisipkanStatement: "sisipkan" nilai "ke" IDENTIFIER
 */
function parseSisipkanStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var value = Expr.parseExpression(parser, 0);
  parser.expect(TT.TK_KE);
  var targetToken = parser.expect(TT.TK_IDENTIFIER);
  var target = targetToken ? targetToken.nilai : '';

  return AST.buatSisipkanStatement(value, target,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, value.loc.end),
    docstring);
}

/**
 * parseAmbilStatement:
 *   "ambil" jenis_ambil "dari" sumber_ambil "->" "simpan" "ke" IDENTIFIER (DOM)
 * | "ambil" "dari" LITERAL_TEKS [ "dengan" opsi_ambil ] ":" cabang_ambil (network)
 */
function parseAmbilStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var tok = parser.peek();

  // Disambiguasi: jika token berikutnya adalah TK_DARI, ini AmbilLuar
  if (tok.tipe === TT.TK_DARI) {
    return parseAmbilLuarStatement(parser, startToken, docstring);
  }

  // Jika identifier jenis ambil (nilai, teks, html, tinggi, lebar, atribut)
  if (tok.tipe === TT.TK_IDENTIFIER) {
    var jenisAmbil = tok.nilai;
    var validKinds = ['nilai', 'teks', 'html', 'tinggi', 'lebar', 'atribut'];
    if (validKinds.indexOf(jenisAmbil) !== -1) {
      return parseAmbilDomStatement(parser, startToken, docstring);
    }
  }

  parser.addError('E2024', '"ambil" tanpa konteks yang jelas',
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
  return AST.buatErrorNode('E2024', '"ambil" tanpa konteks yang jelas',
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
}

/**
 * parseAmbilDomStatement: "ambil" jenis "dari" sumber "->" "simpan" "ke" IDENTIFIER
 */
function parseAmbilDomStatement(parser, startToken, docstring) {
  var jenisToken = parser.advance();
  var kind = jenisToken.nilai;
  var attributeName = null;

  // Jika "atribut", ada argumen literal teks
  if (kind === 'atribut') {
    var attrToken = parser.expect(TT.TK_LITERAL_TEKS);
    if (attrToken) attributeName = attrToken.nilai;
  }

  parser.expect(TT.TK_DARI);
  var source = Sel.parseTargetElemen(parser);

  parser.expect(TT.TK_PANAH);
  parser.expect(TT.TK_SIMPAN);
  parser.expect(TT.TK_KE);
  var targetToken = parser.expect(TT.TK_IDENTIFIER);
  var target = targetToken ? targetToken.nilai : '';

  var endLoc = targetToken
    ? { line: targetToken.baris, column: targetToken.kolom + target.length }
    : source.loc.end;

  return AST.buatAmbilDomStatement(kind, source, target,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring, attributeName);
}

/**
 * parseAmbilLuarStatement: "ambil" "dari" LITERAL_TEKS [ "dengan" opsi ] ":" cabang
 */
function parseAmbilLuarStatement(parser, startToken, docstring) {
  parser.advance(); // konsumsi 'dari'

  var urlToken = parser.expect(TT.TK_LITERAL_TEKS);
  var url = urlToken ? AST.buatLiteral(urlToken.nilai, 'teks', AST.buatLoc(
    { line: urlToken.baris, column: urlToken.kolom },
    { line: urlToken.baris, column: urlToken.kolom + urlToken.nilai.length + 2 }
  )) : AST.buatLiteral('', 'teks', AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));

  // Opsi: "dengan" ...
  var options = [];
  if (parser.check(TT.TK_DENGAN)) {
    parser.advance();
    options = parseOpsiAmbil(parser);
  }

  // ":"
  parser.expect(TT.TK_TITIK_DUA);

  // Cabang: berhasil, gagal, selalu
  var branches = parseCabangAmbil(parser);

  var endLoc = branches.length > 0 ? branches[branches.length - 1].loc.end : url.loc.end;
  return AST.buatAmbilLuarStatement(url, branches,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring, options);
}

/**
 * Parse opsi ambil: metode: "...", data: ..., kepala: {...}
 */
function parseOpsiAmbil(parser) {
  var options = [];

  while (true) {
    var keyToken = parser.peek();
    if (keyToken.tipe !== TT.TK_IDENTIFIER) break;

    parser.advance();
    var key = keyToken.nilai;

    parser.expect(TT.TK_TITIK_DUA);
    var value = Expr.parseNilaiAwal(parser);

    options.push(AST.buatFetchOption(key, value,
      AST.buatLoc(
        { line: keyToken.baris, column: keyToken.kolom },
        value.loc.end
      )));

    if (parser.check(TT.TK_KOMA)) {
      parser.advance();
      continue;
    }
    break;
  }

  return options;
}

/**
 * Parse cabang ambil: berhasil/gagal/selalu
 */
function parseCabangAmbil(parser) {
  var branches = [];

  while (!parser.isAtEnd()) {
    var tok = parser.peek();

    if (tok.tipe === TT.TK_BERHASIL || tok.tipe === TT.TK_GAGAL || tok.tipe === TT.TK_SELALU) {
      var kind = tok.nilai;
      var branchStart = parser.advance();
      var body = null;
      var action = null;

      if (parser.check(TT.TK_PANAH)) {
        parser.advance();
        action = parseAksiTunggal(parser);
      } else if (parser.check(TT.TK_TITIK_DUA)) {
        parser.advance();
        body = parseBlokAksi(parser);
      }

      var branchEnd = body ? body.loc.end : (action ? action.loc.end : { line: branchStart.baris, column: branchStart.kolom + kind.length });
      branches.push(AST.buatFetchBranch(kind, body || action,
        AST.buatLoc({ line: branchStart.baris, column: branchStart.kolom }, branchEnd)));
    } else {
      break;
    }
  }

  return branches;
}

// ═══════════════════════════════════════════════════════════
// KOMPONEN
// ═══════════════════════════════════════════════════════════

/**
 * parseKomponenDeclaration: "komponen" NAMA_KOMPONEN "(" [ daftar_parameter ] ")" [ "->" tipe_data ] ":" blok_konten
 */
function parseKomponenDeclaration(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var name = nameToken ? nameToken.nilai : '';

  // Validasi: nama komponen wajib diawali huruf kapital
  if (name && name.charAt(0) !== name.charAt(0).toUpperCase()) {
    parser.addError('E2003', 'Nama komponen harus diawali huruf kapital',
      AST.buatLoc({ line: nameToken.baris, column: nameToken.kolom },
        { line: nameToken.baris, column: nameToken.kolom + name.length }));
  }

  // "("
  parser.expect(TT.TK_KURUNG_BUKA);
  var params = parseDaftarParameter(parser);
  parser.expect(TT.TK_KURUNG_TUTUP);

  // Opsi: "->" tipe_data
  var returnType = null;
  if (parser.check(TT.TK_PANAH)) {
    parser.advance();
    var typeToken = parser.expect(TT.TK_IDENTIFIER);
    if (typeToken) returnType = typeToken.nilai;
  }

  // ":"
  parser.expect(TT.TK_TITIK_DUA);

  // Blok konten
  var body = parseBlokAksi(parser);

  return AST.buatKomponenDeclaration(name, params, body,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, body.loc.end),
    docstring, returnType);
}

/**
 * parseGunakanStatement: "gunakan" NAMA_KOMPONEN [ "dengan" daftar_props ] [ "di" target_mount ]
 */
function parseGunakanStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var componentName = nameToken ? nameToken.nilai : '';

  var props = null;
  var mountTarget = null;

  // "dengan" daftar_props
  if (parser.check(TT.TK_DENGAN)) {
    parser.advance();
    props = parseDaftarProps(parser);
  }

  // "di" target_mount
  if (parser.check(TT.TK_DI)) {
    parser.advance();
    mountTarget = Sel.parseTargetElemen(parser);
  }

  var endLoc = mountTarget ? mountTarget.loc.end :
    (props && props.length > 0 ? props[props.length - 1].loc.end :
      { line: nameToken.baris, column: nameToken.kolom + componentName.length });

  return AST.buatGunakanStatement(componentName,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring, props, mountTarget);
}

/**
 * Parse daftar props: pasangan_prop { "," pasangan_prop } | IDENTIFIER
 */
function parseDaftarProps(parser) {
  var props = [];

  // Cek shorthand (identifier saja)
  if (parser.check(TT.TK_IDENTIFIER) && !parser.checkAhead(1, TT.TK_TITIK_DUA)) {
    var idTok = parser.advance();
    var idNode = AST.buatIdentifier(idTok.nilai, AST.buatLoc(
      { line: idTok.baris, column: idTok.kolom },
      { line: idTok.baris, column: idTok.kolom + idTok.nilai.length }
    ));
    props.push(AST.buatPropertyNode(idTok.nilai, idNode,
      AST.buatLoc({ line: idTok.baris, column: idTok.kolom },
        { line: idTok.baris, column: idTok.kolom + idTok.nilai.length }),
      true));
    return props;
  }

  // Pasangan properti
  while (true) {
    var prop = parsePasanganProperti(parser);
    if (prop) props.push(prop);

    if (parser.check(TT.TK_KOMA)) {
      parser.advance();
      continue;
    }
    break;
  }

  return props;
}

// ═══════════════════════════════════════════════════════════
// FUNGSI & INTEROP
// ═══════════════════════════════════════════════════════════

/**
 * parseFungsiDeclaration: "fungsi" IDENTIFIER "(" [ daftar_parameter ] ")" [ "->" tipe_data ] ":" blok_aksi
 */
function parseFungsiDeclaration(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var name = nameToken ? nameToken.nilai : '';

  parser.expect(TT.TK_KURUNG_BUKA);
  var params = parseDaftarParameter(parser);
  parser.expect(TT.TK_KURUNG_TUTUP);

  var returnType = null;
  if (parser.check(TT.TK_PANAH)) {
    parser.advance();
    var typeToken = parser.expect(TT.TK_IDENTIFIER);
    if (typeToken) returnType = typeToken.nilai;
  }

  parser.expect(TT.TK_TITIK_DUA);
  var body = parseBlokAksi(parser);

  return AST.buatFungsiDeclaration(name, params, body,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, body.loc.end),
    docstring, returnType);
}

/**
 * parseJalankanExpression:
 *   "jalankan" IDENTIFIER [ "(" [ daftar_argumen ] ")" ]
 * | "jalankan" IDENTIFIER "dengan" daftar_argumen
 */
function parseJalankanExpression(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  // Nama fungsi (boleh mengandung titik: console.log, analytics.track)
  var callee = parseJalankanCallee(parser);

  var kind = 'no_args';
  var args = null;
  var withArgs = null;

  if (parser.check(TT.TK_KURUNG_BUKA)) {
    kind = 'parens';
    parser.advance();
    args = Expr.parseArgumenList(parser, TT.TK_KURUNG_TUTUP);
    parser.expect(TT.TK_KURUNG_TUTUP);
  } else if (parser.check(TT.TK_DENGAN)) {
    kind = 'dengan';
    parser.advance();
    withArgs = [Expr.parseExpression(parser, 0)];
  }

  var endLoc = args ? (args.length > 0 ? args[args.length - 1].loc.end :
    { line: startToken.baris, column: startToken.kolom + 1 }) :
    { line: startToken.baris, column: startToken.kolom + callee.length + 1 };

  return AST.buatJalankanExpression(callee, kind,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring, args, withArgs);
}

/**
 * Parse callee jalankan (boleh mengandung titik).
 * "jalankan console.log" → callee = "console.log"
 */
function parseJalankanCallee(parser) {
  var parts = [];
  var tok = parser.expect(TT.TK_IDENTIFIER);
  if (tok) parts.push(tok.nilai);

  while (parser.check(TT.TK_TITIK)) {
    parser.advance();
    var part = parser.expect(TT.TK_IDENTIFIER);
    if (part) parts.push(part.nilai);
  }

  return parts.join('.');
}

/**
 * parseLangsungBlock: "langsung" ":" (BLOK_LANGSUNG | BARIS_BARU INDENT baris_js*)
 */
function parseLangsungBlock(parser) {
  var startToken = parser.advance(); // konsumsi TK_LANGSUNG

  // Wajib ada ":"
  parser.expect(TT.TK_TITIK_DUA);

  // Lewati baris baru setelah ":"
  if (parser.check(TT.TK_BARIS_BARU)) {
    parser.skipBarisBaru();
  }

  // Sekarang harus ada TK_BLOK_LANGSUNG
  if (parser.check(TT.TK_BLOK_LANGSUNG)) {
    var contentToken = parser.advance();
    
    // Lewati baris baru setelah blok (jika ada)
    if (parser.check(TT.TK_BARIS_BARU)) {
      parser.skipBarisBaru();
    }
    
    return AST.buatLangsungBlock(
      contentToken.nilai,
      AST.buatLoc(
        { line: startToken.baris, column: startToken.kolom },
        { line: contentToken.baris, column: contentToken.kolom + (contentToken.nilai || '').length }
      )
    );
  }

  // Jika tidak ada TK_BLOK_LANGSUNG → error
  parser.addError(
    'E2021',
    'Blok langsung diharapkan setelah "langsung:". Gunakan indentasi untuk konten JavaScript mentah.',
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null)
  );
  return AST.buatErrorNode(
    'E2021',
    'Blok langsung tidak ditemukan',
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null)
  );
}

// ═══════════════════════════════════════════════════════════
// NAVIGASI
// ═══════════════════════════════════════════════════════════

/**
 * parseArahkanStatement: "arahkan" "ke" LITERAL_TEKS
 */
function parseArahkanStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  parser.expect(TT.TK_KE);
  var urlToken = parser.expect(TT.TK_LITERAL_TEKS);
  var url = urlToken ? AST.buatLiteral(urlToken.nilai, 'teks', AST.buatLoc(
    { line: urlToken.baris, column: urlToken.kolom },
    { line: urlToken.baris, column: urlToken.kolom + urlToken.nilai.length + 2 }
  )) : AST.buatLiteral('', 'teks', AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));

  return AST.buatArahkanStatement(url,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, url.loc.end),
    docstring);
}

/**
 * parseMuatUlangStatement: "muat ulang"
 */
function parseMuatUlangStatement(parser) {
  var tok = parser.advance();
  return AST.buatMuatUlangStatement(
    AST.buatLoc({ line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length }));
}

/**
 * parseKembaliStatement: "kembali"
 */
function parseKembaliStatement(parser) {
  var tok = parser.advance();
  return AST.buatKembaliStatement(
    AST.buatLoc({ line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length }));
}

// ═══════════════════════════════════════════════════════════
// RANTAI AKSI & PEMANGGILAN NATIVE
// ═══════════════════════════════════════════════════════════

/**
 * parseRantaiAksi: aksi { "lalu" aksi }
 * Dipanggil ketika menemukan TK_LALU di posisi statement.
 */
function parseRantaiAksi(parser) {
  // Catatan: RantaiAksi biasanya dimulai dari statement sebelumnya,
  // bukan dari 'lalu'. 'lalu' melanjutkan rantai yang sudah ada.
  // Namun, jika 'lalu' muncul di awal baris, itu kelanjutan dari statement sebelumnya.
  var startToken = parser.advance(); // konsumsi 'lalu'

  var aksi = parseAksiTunggal(parser);

  // Kembalikan sebagai bagian dari rantai
  // Parser utama akan menggabungkan ini dengan statement sebelumnya
  return aksi;
}

/**
 * parsePanggilNativeStatement: IDENTIFIER "(" [ daftar_argumen ] ")"
 * Pemanggilan fungsi KARSA yang berdiri sendiri sebagai statement.
 */
function parsePanggilNativeStatement(parser) {
  var startToken = parser.advance();
  var docstring = startToken.docstring;

  var callee = AST.buatIdentifier(startToken.nilai, AST.buatLoc(
    { line: startToken.baris, column: startToken.kolom },
    { line: startToken.baris, column: startToken.kolom + startToken.nilai.length }
  ));

  // Cek apakah ada argumen
  var args = [];
  if (parser.check(TT.TK_KURUNG_BUKA)) {
    parser.advance();
    args = Expr.parseArgumenList(parser, TT.TK_KURUNG_TUTUP);
    var closeParen = parser.expect(TT.TK_KURUNG_TUTUP);
    if (!closeParen) {
      parser.addError('E2005', 'Kurung tutup ")" tidak ditemukan',
        AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
    }
  }

  var endLoc = args.length > 0 ? args[args.length - 1].loc.end :
    { line: startToken.baris, column: startToken.kolom + startToken.nilai.length };

  return AST.buatPanggilNativeExpression(callee, args,
    AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, endLoc),
    docstring);
}

// ═══════════════════════════════════════════════════════════
// HELPER: BLOK AKSI, AKSI TUNGGAL, PARAMETER
// ═══════════════════════════════════════════════════════════

/**
 * parseBlokAksi: BARIS_BARU ( INDENTASI pernyataan BARIS_BARU )+
 * Dipanggil setelah ":" atau "->" untuk membaca blok indentasi.
 */
function parseBlokAksi(parser) {
  // Skip baris baru
  parser.skipBarisBaru();

  // Harus ada TK_INDENT
  if (!parser.check(TT.TK_INDENT)) {
    parser.addError('E2004', 'Blok aksi diharapkan setelah ":"',
      AST.buatLoc(parser.currentPosition(), null));
    return AST.buatBlockStatement([],
      AST.buatLoc(parser.currentPosition(), parser.currentPosition()));
  }

  var indentToken = parser.advance(); // konsumsi INDENT
  var statements = [];

  // Parse statement dalam blok
  while (!parser.check(TT.TK_DEDENT) && !parser.isAtEnd()) {
    parser.skipBarisBaru();

    if (parser.check(TT.TK_DEDENT) || parser.isAtEnd()) break;

    var stmt = parseStatement(parser);
    if (stmt) {
      // Cek rantai aksi: jika baris berikutnya dimulai dengan 'lalu'
      while (parser.check(TT.TK_LALU)) {
        var laluToken = parser.advance();
        var nextAksi = parseAksiTunggal(parser);
        stmt = AST.buatRantaiAksi(stmt, [nextAksi],
          AST.gabungLoc(stmt.loc, nextAksi.loc));
      }
      statements.push(stmt);
    }

    parser.skipBarisBaru();
  }

  // Konsumsi DEDENT
  if (parser.check(TT.TK_DEDENT)) {
    parser.advance();
  }

  var lastStmt = statements.length > 0 ? statements[statements.length - 1] : null;
  var endLoc = lastStmt ? lastStmt.loc.end : { line: indentToken.baris, column: indentToken.kolom + 2 };

  return AST.buatBlockStatement(statements,
    AST.buatLoc(
      { line: indentToken.baris, column: indentToken.kolom },
      endLoc
    ));
}

/**
 * parseAksiTunggal: satu pernyataan yang ditulis setelah ->
 */
function parseAksiTunggal(parser) {
  return parseStatement(parser);
}

/**
 * parseDaftarParameter: parameter { "," parameter }
 */
function parseDaftarParameter(parser) {
  var params = [];

  if (parser.check(TT.TK_KURUNG_TUTUP)) {
    return params;
  }

  params.push(parseParameter(parser));

  while (parser.check(TT.TK_KOMA)) {
    parser.advance();
    params.push(parseParameter(parser));
  }

  return params;
}

/**
 * parseParameter: IDENTIFIER [ ":" tipe_data ] [ "=" nilai_awal ]
 */
function parseParameter(parser) {
  var nameToken = parser.expect(TT.TK_IDENTIFIER);
  var name = nameToken ? nameToken.nilai : '';
  var loc = AST.buatLoc(
    { line: nameToken.baris, column: nameToken.kolom },
    { line: nameToken.baris, column: nameToken.kolom + name.length }
  );

  var typeHint = null;
  if (parser.check(TT.TK_TITIK_DUA)) {
    parser.advance();
    var typeToken = parser.expect(TT.TK_IDENTIFIER);
    if (typeToken) typeHint = typeToken.nilai;
  }

  var defaultValue = null;
  if (parser.check(TT.TK_TANDA_SAMA)) {
    parser.advance();
    defaultValue = Expr.parseNilaiAwal(parser);
  }

  return AST.buatParameter(name, loc, typeHint, defaultValue);
}

module.exports = {
  parseStatement: parseStatement,
  parseBuatStatement: parseBuatStatement,
  parseTampilkanStatement: parseTampilkanStatement,
  parseSembunyikanStatement: parseSembunyikanStatement,
  parseHapusStatement: parseHapusStatement,
  parseKosongkanStatement: parseKosongkanStatement,
  parsePerbaruiStatement: parsePerbaruiStatement,
  parseKetikaStatement: parseKetikaStatement,
  parseSaatStatement: parseSaatStatement,
  parseSetelahStatement: parseSetelahStatement,
  parseJikaStatement: parseJikaStatement,
  parseUlangiStatement: parseUlangiStatement,
  parseSelamaStatement: parseSelamaStatement,
  parseBerhentiStatement: parseBerhentiStatement,
  parseLewatiStatement: parseLewatiStatement,
  parseKembalikanStatement: parseKembalikanStatement,
  parseDataDeclaration: parseDataDeclaration,
  parseTetapDeclaration: parseTetapDeclaration,
  parseUbahDeclaration: parseUbahDeclaration,
  parseTurunanDeclaration: parseTurunanDeclaration,
  parseSimpanStatement: parseSimpanStatement,
  parseTambahkanStatement: parseTambahkanStatement,
  parseKurangiStatement: parseKurangiStatement,
  parseSisipkanStatement: parseSisipkanStatement,
  parseAmbilStatement: parseAmbilStatement,
  parseKomponenDeclaration: parseKomponenDeclaration,
  parseGunakanStatement: parseGunakanStatement,
  parseFungsiDeclaration: parseFungsiDeclaration,
  parseJalankanExpression: parseJalankanExpression,
  parseLangsungBlock: parseLangsungBlock,
  parseArahkanStatement: parseArahkanStatement,
  parseMuatUlangStatement: parseMuatUlangStatement,
  parseKembaliStatement: parseKembaliStatement,
  parseBlokAksi: parseBlokAksi,
  parseAksiTunggal: parseAksiTunggal,
  parsePropertiInline: parsePropertiInline,
  parsePasanganProperti: parsePasanganProperti,
  parseDaftarParameter: parseDaftarParameter,
  parseParameter: parseParameter
};
