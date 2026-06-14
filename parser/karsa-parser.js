/**
 * KARSA v0.3.1 — Parser Utama (KarsaParser)
 *
 * Kelas utama parser yang mengkonversi token stream menjadi AST.
 * Menggunakan Recursive Descent untuk statement dan Pratt Parser untuk ekspresi.
 *
 * Berdasarkan: RFC-PARSER-001, parser-charter.md, parser-architecture.md
 */

var TT = require('./token-types');
var AST = require('./ast-factory');
var Err = require('./error-codes');
var Stmt = require('./statement-parser');

/**
 * Konstruktor KarsaParser.
 *
 * @param {Array} tokens - Array token dari Lexer. Token terakhir wajib TK_EOF.
 * @throws {Error} Jika tokens kosong atau token terakhir bukan TK_EOF
 */
function KarsaParser(tokens) {
  if (!tokens || tokens.length === 0) {
    throw new Error('KarsaParser: tokens tidak boleh kosong');
  }

  var lastToken = tokens[tokens.length - 1];
  if (lastToken.tipe !== TT.TK_EOF) {
    throw new Error('KarsaParser: token terakhir wajib berupa TK_EOF');
  }

  this._tokens = tokens;
  this._pos = 0;
  this._errors = [];
  this._parsed = false;
}

// ─── Metode API Publik ─────────────────────────────────────

/**
 * Memulai proses parsing dari root grammar (Program).
 *
 * Jaminan:
 * - Tidak pernah mengembalikan null
 * - ast selalu berupa ProgramNode yang valid (minimal body: [])
 * - errors berisi daftar semua error yang ditemukan selama parsing
 * - Memanggil parse() lebih dari sekali mengembalikan hasil identik (idempoten)
 *
 * @returns {object} ParseResult { ast: ProgramNode, errors: ParseError[] }
 */
KarsaParser.prototype.parse = function () {
  if (this._parsed) {
    return {
      ast: this._ast,
      errors: this._errors
    };
  }

  this._errors = [];
  this._pos = 0;

  var body = [];
  var startLoc = { line: 1, column: 1 };

  // Skip token awal yang bukan statement (baris baru, komentar)
  this._skipNoise();

  // Parse top-level statements
  while (!this.isAtEnd()) {
    this._skipNoise();

    if (this.isAtEnd()) break;

    // Cek apakah token saat ini bisa memulai statement
    var tok = this.peek();
    if (this._isStatementStart(tok)) {
      var stmt = Stmt.parseStatement(this);

      // Cek rantai aksi: jika baris berikutnya dimulai dengan 'lalu'
      if (stmt) {
        this.skipBarisBaru();
        while (this.check(TT.TK_LALU)) {
          var laluToken = this.advance();
          var nextAksi = Stmt.parseAksiTunggal(this);
          stmt = AST.buatRantaiAksi(stmt, [nextAksi],
            AST.gabungLoc(stmt.loc, nextAksi.loc));
          this.skipBarisBaru();
        }
        body.push(stmt);
      }
    } else if (tok.tipe === TT.TK_DEDENT) {
      // DEDENT di top-level: skip (mungkin sisa dari blok sebelumnya)
      this.advance();
    } else if (tok.tipe === TT.TK_BARIS_BARU) {
      this.advance();
    } else {
      // Token tidak dikenali, skip dan catat error
      var errTok = this.advance();
      this.addError('E2010',
        'Token tidak diharapkan di posisi statement: "' + errTok.nilai + '"',
        AST.buatLoc(
          { line: errTok.baris, column: errTok.kolom },
          { line: errTok.baris, column: errTok.kolom + (errTok.nilai || '').length }
        ));
    }
  }

  // Hitung lokasi akhir
  var endLoc = body.length > 0
    ? body[body.length - 1].loc.end
    : startLoc;

  this._ast = AST.buatProgramNode(body,
    AST.buatLoc(startLoc, endLoc));

  this._parsed = true;

  return {
    ast: this._ast,
    errors: this._errors
  };
};

// ─── Metode Konsumsi Token ─────────────────────────────────

/**
 * Melihat token pada posisi current tanpa mengubah state parser.
 * Tidak pernah mengembalikan null; minimal mengembalikan TK_EOF.
 */
KarsaParser.prototype.peek = function (offset) {
  if (offset === undefined) offset = 0;
  var idx = this._pos + offset;
  if (idx < 0 || idx >= this._tokens.length) {
    return this._makeEofToken();
  }
  return this._tokens[idx];
};

/**
 * Mengonsumsi token pada posisi current dan memajukan posisi.
 * Mengembalikan token yang dikonsumsi.
 */
KarsaParser.prototype.advance = function () {
  if (this._pos >= this._tokens.length) {
    return this._makeEofToken();
  }
  var token = this._tokens[this._pos];
  this._pos++;
  return token;
};

/**
 * Mengonsumsi token jika tipenya cocok dengan expected.
 * Jika cocok: memajukan posisi dan mengembalikan token.
 * Jika tidak cocok: TIDAK memajukan posisi, mencatat ParseError, dan mengembalikan null.
 */
KarsaParser.prototype.expect = function (tokenType) {
  var tok = this.peek();
  if (tok.tipe === tokenType) {
    return this.advance();
  }

  // Catat error
  this.addError('E2001',
    'Diharapkan ' + this._describeToken(tokenType) + ', tetapi ditemukan "' + tok.nilai + '" (' + tok.tipe + ')',
    AST.buatLoc(
      { line: tok.baris, column: tok.kolom },
      { line: tok.baris, column: tok.kolom + (tok.nilai || '').length }
    ));

  return null;
};

/**
 * Mengonsumsi token jika tipenya cocok dengan salah satu di expectedTypes.
 */
KarsaParser.prototype.match = function () {
  var args = Array.prototype.slice.call(arguments);
  for (var i = 0; i < args.length; i++) {
    if (this.check(args[i])) {
      return this.advance();
    }
  }
  return null;
};

/**
 * Memeriksa apakah token pada posisi current bertipe tokenType.
 */
KarsaParser.prototype.check = function (tokenType) {
  return this.peek().tipe === tokenType;
};

/**
 * Memeriksa apakah token pada posisi current + offset bertipe tokenType.
 */
KarsaParser.prototype.checkAhead = function (offset, tokenType) {
  return this.peek(offset).tipe === tokenType;
};

/**
 * Memeriksa apakah token pada posisi current bertipe salah satu dari args.
 */
KarsaParser.prototype.checkAny = function () {
  var args = Array.prototype.slice.call(arguments);
  var tok = this.peek();
  for (var i = 0; i < args.length; i++) {
    if (tok.tipe === args[i]) return true;
  }
  return false;
};

/**
 * Mengembalikan true jika posisi current berada di TK_EOF.
 */
KarsaParser.prototype.isAtEnd = function () {
  return this.peek().tipe === TT.TK_EOF;
};

/**
 * Mengembalikan token sebelum posisi current (yang terakhir dikonsumsi).
 */
KarsaParser.prototype.previousToken = function () {
  if (this._pos <= 0) return null;
  return this._tokens[this._pos - 1];
};

/**
 * Mengembalikan posisi current sebagai { line, column }.
 */
KarsaParser.prototype.currentPosition = function () {
  var tok = this.peek();
  return { line: tok.baris, column: tok.kolom };
};

// ─── Metode Skip & Utility ─────────────────────────────────

/**
 * Skip TK_BARIS_BARU dan TK_KOMENTAR_BIASA.
 */
KarsaParser.prototype.skipBarisBaru = function () {
  while (this.check(TT.TK_BARIS_BARU) || this.check(TT.TK_KOMENTAR_BIASA)) {
    this.advance();
  }
};

/**
 * Skip token yang bukan statement (noise di awal).
 */
KarsaParser.prototype._skipNoise = function () {
  while (this.check(TT.TK_BARIS_BARU) ||
         this.check(TT.TK_KOMENTAR_BIASA) ||
         this.check(TT.TK_KOMENTAR_DOC) ||
         this.check(TT.TK_INDENT) ||
         this.check(TT.TK_DEDENT)) {
    this.advance();
  }
};

/**
 * Cek apakah token bisa memulai statement.
 */
KarsaParser.prototype._isStatementStart = function (tok) {
  if (TT.STATEMENT_KEYWORD_TOKENS.indexOf(tok.tipe) !== -1) return true;
  if (tok.tipe === TT.TK_IDENTIFIER) return true; // pemanggilan native
  return false;
};

// ─── Error Handling ─────────────────────────────────────────

/**
 * Menambahkan error ke daftar error parser.
 *
 * @param {string} code - Kode error (E2xxx atau W2xxx)
 * @param {string} message - Pesan error
 * @param {object} loc - SourceLocation
 */
KarsaParser.prototype.addError = function (code, message, loc) {
  this._errors.push(Err.buatParseError(code, loc, {
    message: message
  }));
};

/**
 * Menambahkan warning ke daftar error parser.
 */
KarsaParser.prototype.addWarning = function (code, message, loc) {
  this._errors.push(Err.buatParseError(code, loc, {
    message: message,
    severity: 'warning'
  }));
};

/**
 * Error recovery: sinkronkan ke titik sinkronisasi terdekat.
 * Membuang token hingga menemui TK_BARIS_BARU, TK_DEDENT, TK_EOF,
 * atau keyword statement.
 */
KarsaParser.prototype.synchronize = function () {
  while (!this.isAtEnd()) {
    var tok = this.peek();

    // Titik sinkronisasi utama
    if (tok.tipe === TT.TK_BARIS_BARU ||
        tok.tipe === TT.TK_DEDENT ||
        tok.tipe === TT.TK_EOF) {
      return;
    }

    // Titik sinkronisasi kontekstual: keyword statement
    if (TT.SYNC_STATEMENT_TOKENS.indexOf(tok.tipe) !== -1) {
      return;
    }

    this.advance();
  }
};

// ─── Helper Internal ───────────────────────────────────────

/**
 * Membuat token EOF sintetis.
 */
KarsaParser.prototype._makeEofToken = function () {
  var lastToken = this._tokens[this._tokens.length - 1];
  return {
    tipe: TT.TK_EOF,
    nilai: '',
    baris: lastToken ? lastToken.baris : 1,
    kolom: lastToken ? lastToken.kolom + 1 : 1,
    docstring: null
  };
};

/**
 * Mendeskripsikan tipe token untuk pesan error.
 */
KarsaParser.prototype._describeToken = function (tokenType) {
  var descriptions = {};
  descriptions[TT.TK_TITIK_DUA] = '":"';
  descriptions[TT.TK_PANAH] = '"->"';
  descriptions[TT.TK_KURUNG_TUTUP] = '")"';
  descriptions[TT.TK_KURAWAL_TUTUP] = '"}"';
  descriptions[TT.TK_KURUNG_SIKU_TUTUP] = '"]"';
  descriptions[TT.TK_TANDA_SAMA] = '"="';
  descriptions[TT.TK_KOMA] = '","';
  descriptions[TT.TK_IDENTIFIER] = 'identifier';
  descriptions[TT.TK_LITERAL_TEKS] = 'teks';
  descriptions[TT.TK_LITERAL_ANGKA] = 'angka';
  descriptions[TT.TK_DARI] = '"dari"';
  descriptions[TT.TK_KE] = '"ke"';
  descriptions[TT.TK_DENGAN] = '"dengan"';
  descriptions[TT.TK_DI] = '"di"';
  descriptions[TT.TK_BERUBAH] = '"berubah"';

  return descriptions[tokenType] || '"' + tokenType + '"';
};

module.exports = KarsaParser;
