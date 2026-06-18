/**
 * KARSA v0.3.1 — Selector Parser
 *
 * Menggabungkan token TK_ID, TK_CLASS, TK_ATRIBUT, dan tag/identifier
 * menjadi node Selector yang utuh.
 *
 * Berdasarkan: KARSA-grammar-spec_v0.3.1 §3.5, AST Specification §2.2
 */

var TT = require('./token-types');
var AST = require('./ast-factory');

/**
 * Tag HTML yang dikenali KARSA (termasuk alias).
 */
var HTML_TAGS = [
  'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'input', 'tombol', 'form', 'img', 'a', 'ul', 'ol', 'li',
  'tabel', 'header', 'footer', 'main', 'section', 'artikel',
  'nav', 'aside', 'video', 'audio', 'kanvas', 'label',
  'textarea', 'pilihan', 'opsi', 'fragmen',
  'ruang', 'judul', 'subjudul', 'paragraf', 'gambar',
  'tautan', 'masukan', 'kolom', 'wadah', 'wadjud', 'kotak',
  'frm', 'frmMasuk',
  'button', 'select', 'option', 'article', 'canvas',
  'table', 'fragment'
];

/**
 * Cek apakah string adalah tag HTML/alias KARSA yang dikenali.
 */
function isHtmlTag(name) {
  return HTML_TAGS.indexOf(name) !== -1;
}

/**
 * Memparse selector dari posisi token saat ini.
 *
 * SELEKTOR ::= TAG_HTML [ id_selector ] { class_selector } { atribut_selector }
 *            | IDENTIFIER (sebagai tag kustom)
 *
 * Dipanggil setelah keyword seperti 'buat', target tampilkan, dll.
 * Parser harus sudah berada di token pertama selector.
 *
 * @param {object} parser - Instance parser dengan metode peek/advance/dll
 * @returns {object} Selector node
 */
function parseSelector(parser) {
  var startToken = parser.peek();
  var tag = '';
  var id = undefined;
  var classes = [];
  var attributes = [];

  // 1. Parse tag (wajib)
  var tok = parser.peek();
  if (tok.tipe === TT.TK_IDENTIFIER) {
    tag = tok.nilai;
    parser.advance();
  } else if (isHtmlTag(tok.nilai)) {
    tag = tok.nilai;
    parser.advance();
  } else if (tok.tipe === TT.TK_FRAGMEN) {
    tag = 'fragmen';
    parser.advance();
  } else {
    // Tidak ada tag yang valid
    parser.addError('E2002', 'Selector tidak valid: diharapkan tag HTML atau identifier');
    var errLoc = AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + (tok.nilai || '').length }
    );
    return AST.buatErrorNode('E2002', 'Selector tidak valid', errLoc, tok);
  }

  // 2. Parse id (#nama), class (.nama), dan atribut [k="v"] secara berurutan
  while (!parser.isAtEnd()) {
    tok = parser.peek();

    if (tok.tipe === TT.TK_ID) {
      // Token TK_ID sudah berisi nama id tanpa #
      id = tok.nilai;
      parser.advance();
    } else if (tok.tipe === TT.TK_CLASS) {
      // Token TK_CLASS sudah berisi nama class tanpa .
      classes.push(tok.nilai);
      parser.advance();
    } else if (tok.tipe === TT.TK_TITIK) {
      // Pola: TK_TITIK diikuti TK_IDENTIFIER -> class selector
      parser.advance(); // konsumsi TK_TITIK
      var nextTok = parser.peek();
      if (nextTok && nextTok.tipe === TT.TK_IDENTIFIER) {
        classes.push(nextTok.nilai);
        parser.advance(); // konsumsi TK_IDENTIFIER
      } else {
        parser.addError('E2003', 'Selector class tidak valid: setelah "." diharapkan nama class');
      }
    } else if (tok.tipe === TT.TK_ATRIBUT) {
      // Token TK_ATRIBUT: nilai berisi string "[k=v]" atau "[k=\"v\"]"
      // Lexer harus sudah memisahkan key dan value
      var attr = parseAtributToken(tok, parser);
      if (attr) {
        attributes.push(attr);
      }
      parser.advance();
    } else {
      // Bukan bagian selector, berhenti
      break;
    }
  }

  var endToken = parser.peek();
  // endToken adalah token setelah selector, gunakan posisi sebelumnya
  var endPos;
  if (startToken === endToken) {
    // Hanya satu token (tag saja)
    endPos = {
      line: startToken.baris,
      column: startToken.kolom + (startToken.nilai || '').length
    };
  } else {
    // Gunakan posisi token terakhir selector yang sudah dikonsumsi
    // Kita perlu menghitung dari token terakhir yang dikonsumsi
    var lastConsumed = parser.previousToken();
    if (lastConsumed) {
      endPos = {
        line: lastConsumed.baris,
        column: lastConsumed.kolom + (lastConsumed.nilai || '').length
      };
    } else {
      endPos = { line: startToken.baris, column: startToken.kolom + (startToken.nilai || '').length };
    }
  }

  var loc = AST.buatLoc(
    { line: startToken.baris, column: startToken.kolom },
    endPos
  );

  return AST.buatSelector(tag, loc, id, classes, attributes);
}

/**
 * Parse atribut dari token TK_ATRIBUT.
 * Format token nilai: "[k=\"v\"]" atau "[k=v]"
 * Lexer diharapkan menyediakan key dan value, tapi jika tidak,
 * kita parse dari nilai token.
 */
function parseAtributToken(tok, parser) {
  // Jika token sudah menyediakan atribut terparse
  if (tok.attrKey !== undefined) {
    var attrLoc = AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + (tok.nilai || '').length }
    );
    return AST.buatAttributeNode(tok.attrKey, tok.attrValue || '', attrLoc);
  }

  // Fallback: parse dari nilai token mentah
  var raw = tok.nilai || '';
  // Hapus [ dan ]
  var inner = raw;
  if (inner.charAt(0) === '[') inner = inner.substring(1);
  if (inner.charAt(inner.length - 1) === ']') inner = inner.substring(0, inner.length - 1);

  var eqIdx = inner.indexOf('=');
  if (eqIdx === -1) {
    // Atribut boolean
    var attrLoc2 = AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + raw.length }
    );
    return AST.buatAttributeNode(inner.trim(), '', attrLoc2);
  }

  var key = inner.substring(0, eqIdx).trim();
  var value = inner.substring(eqIdx + 1).trim();
  // Hapus kutip dari value
  if ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
      (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")) {
    value = value.substring(1, value.length - 1);
  }

  var attrLoc3 = AST.buatLoc(
    { line: tok.baris, column: tok.kolom },
    { line: tok.baris, column: tok.kolom + raw.length }
  );
  return AST.buatAttributeNode(key, value, attrLoc3);
}

/**
 * Parse target elemen (dipakai di sembunyikan, hapus, kosongkan, dll).
 * Target bisa berupa Selector, Literal teks, atau Identifier.
 */
function parseTargetElemen(parser) {
  var tok = parser.peek();

  // Jika dimulai dengan tag HTML atau selector token
  if (tok.tipe === TT.TK_IDENTIFIER && isHtmlTag(tok.nilai)) {
    return parseSelector(parser);
  }
  if (tok.tipe === TT.TK_ID || tok.tipe === TT.TK_CLASS || tok.tipe === TT.TK_ATRIBUT) {
    return parseSelector(parser);
  }
  if (tok.tipe === TT.TK_FRAGMEN) {
    return parseSelector(parser);
  }
  if (tok.tipe === TT.TK_LITERAL_TEKS) {
    parser.advance();
    return AST.buatLiteral(tok.nilai, 'teks', AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length + 2 }
    ));
  }
  if (tok.tipe === TT.TK_IDENTIFIER) {
    parser.advance();
    return AST.buatIdentifier(tok.nilai, AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + tok.nilai.length }
    ));
  }

  // Error: target tidak dikenali
  return null;
}

/**
 * Cek apakah token berikutnya bisa memulai selector.
 */
function isSelectorStart(parser) {
  var tok = parser.peek();
  if (tok.tipe === TT.TK_IDENTIFIER) return true;
  if (tok.tipe === TT.TK_ID || tok.tipe === TT.TK_CLASS || tok.tipe === TT.TK_ATRIBUT) return true;
  if (tok.tipe === TT.TK_FRAGMEN) return true;
  return false;
}

module.exports = {
  HTML_TAGS: HTML_TAGS,
  isHtmlTag: isHtmlTag,
  parseSelector: parseSelector,
  parseTargetElemen: parseTargetElemen,
  isSelectorStart: isSelectorStart
};
