/**
 * ============================================================================
 *  KARSA v0.3.1 — STANDALONE BUNDLE
 * --------------------------------------------------------------------------
 *  Di-generate oleh scripts/build-standalone.js
 *  Build time: 2026-06-18T08:19:49.163Z
 *
 *  Seluruh modul KARSA dalam satu file untuk penggunaan di browser.
 *  Tanpa memerlukan Node.js, module bundler, atau dependensi lainnya.
 *
 *  Penggunaan:
 *    <script src="karsa.standalone.js"></script>
 *    <script>Karsa.run(source);</script>
 * ============================================================================
 */

// ============================================================
// LEXER (Tahap 1) — KarsaLexer
// ============================================================
/*!
 * ============================================================================
 *  KARSA v0.3.1 — LEXER  (Tahap 1)
 * ----------------------------------------------------------------------------
 *  Mengkonversi stream karakter mentah Karsa (.ks) menjadi stream token
 *  dengan penanganan indentasi 2-spasi yang ketat dan konsisten.
 *
 *  Fitur:
 *    • Tokenisasi keyword, identifier, literal, operator, simbol
 *    • Manajemen INDENT/DEDENT stack (Python-style, kelipatan 2)
 *    • Deteksi tab & indentasi ganjil -> error berkode [E1xxx]
 *    • Longest-match keyword multi-kata via TRIE
 *      (mis. "jika tidak", "tidak sama dengan", "ditinggal-kursor")
 *    • Komentar --! (biasa) dan --? (DocString, sebaris & blok [[ ]] )
 *    • Selektor CSS: #id, .class, [key="value"]
 *    • Region mentah `langsung:` (JS pass-through)
 *    • Pelaporan baris/kolom tepat + saran perbaikan
 *
 *  Murni JavaScript (ES2015), TANPA dependensi, TANDA TypeScript/Python/React.
 *
 *  Catatan resolusi ambiguitas (didokumentasikan di sini):
 *    [A] Simbol "="  -> TK_TANDA_SAMA        (penugasan, EBNF 3.6)
 *        Kata  "sama dengan" -> TK_SAMA_DENGAN (perbandingan, Tabel Token)
 *        Spesifikasi 3.6 & Tabel Token 14 bertabrakan nama; dipisah agar jelas.
 *    [B] "." setelah nama TANPA hyphen -> TK_TITIK + TK_IDENTIFIER
 *            (parser memutuskan: akses-properti vs kelas-selector lewat konteks)
 *        "." setelah nama DENGAN hyphen -> TK_CLASS  (pasti kelas CSS)
 *    [C] "-" diikuti digit & bukan setelah nilai -> LITERAL_ANGKA negatif
 *        "-" lainnya -> TK_MINUS (operator pengurangan)
 *    [D] "[" IDENTIFIER "=" STRING "]" -> TK_ATRIBUT;  "[" lainnya -> TK_KURUNG_SIKU_BUKA
 * ============================================================================
 */
(function (root, factory) {
  "use strict";
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory({});
  } else {
    root.KarsaLexer = factory(root.KarsaLexer || {});
  }
})(typeof self !== "undefined" ? self : this, function (exports) {
  "use strict";

  /* ==========================================================================
   * 1. KONSTANTA TIPE TOKEN
   * ========================================================================== */
  const TT = {
    // Struktur
    TK_BUAT: "TK_BUAT",
    TK_TAMPILKAN: "TK_TAMPILKAN",
    TK_SEMBUNYIKAN: "TK_SEMBUNYIKAN",
    TK_HAPUS: "TK_HAPUS",
    TK_KOSONGKAN: "TK_KOSONGKAN",
    TK_PERBARUI: "TK_PERBARUI",
    // Event / Perilaku
    TK_KETIKA: "TK_KETIKA",
    TK_DIKLIK: "TK_DIKLIK",
    TK_DIKETIK: "TK_DIKETIK",
    TK_DISUBMIT: "TK_DISUBMIT",
    TK_DIMUAT: "TK_DIMUAT",
    TK_DIUBAH: "TK_DIUBAH",
    TK_DIFOKUS: "TK_DIFOKUS",
    TK_DITINGGAL: "TK_DITINGGAL",
    TK_DITEKAN: "TK_DITEKAN",
    TK_DILEPAS: "TK_DILEPAS",
    TK_DIARAHKAN: "TK_DIARAHKAN",
    TK_DITINGGAL_KURSOR: "TK_DITINGGAL_KURSOR",
    TK_DIGULIR: "TK_DIGULIR",
    TK_DIPASANG: "TK_DIPASANG",
    TK_DILEPAS_DARI_DOM: "TK_DILEPAS_DARI_DOM",
    // Alur
    TK_LALU: "TK_LALU",
    TK_SETELAH: "TK_SETELAH",
    // Logika
    TK_JIKA: "TK_JIKA",
    TK_KALAU: "TK_KALAU",
    TK_JIKA_TIDAK: "TK_JIKA_TIDAK",
    TK_ULANGI: "TK_ULANGI",
    TK_SELAMA: "TK_SELAMA",
    TK_BERHENTI: "TK_BERHENTI",
    TK_LEWATI: "TK_LEWATI",
    TK_KEMBALIKAN: "TK_KEMBALIKAN",
    // Data / Reaktif
    TK_DATA: "TK_DATA",
    TK_TURUNAN: "TK_TURUNAN",
    TK_SIMPAN: "TK_SIMPAN",
    TK_AMBIL: "TK_AMBIL",
    TK_TETAP: "TK_TETAP",
    TK_UBAH: "TK_UBAH",
    TK_TAMBAHKAN: "TK_TAMBAHKAN",
    TK_SISIPKAN: "TK_SISIPKAN",
    TK_KURANGI: "TK_KURANGI",
    TK_SAAT: "TK_SAAT",
    TK_BERUBAH: "TK_BERUBAH",
    // Komponen / Fungsi
    TK_KOMPONEN: "TK_KOMPONEN",
    TK_GUNAKAN: "TK_GUNAKAN",
    TK_DENGAN: "TK_DENGAN",
    TK_DI: "TK_DI",
    TK_DARI: "TK_DARI",
    TK_KE: "TK_KE",
    TK_FUNGSI: "TK_FUNGSI",
    TK_JALANKAN: "TK_JALANKAN",
    // Jaringan / Navigasi
    TK_BERHASIL: "TK_BERHASIL",
    TK_GAGAL: "TK_GAGAL",
    TK_SELALU: "TK_SELALU",
    TK_ARAHKAN: "TK_ARAHKAN",
    TK_MUAT_ULANG: "TK_MUAT_ULANG",
    TK_KEMBALI: "TK_KEMBALI",
    // Literal
    TK_BENAR: "TK_BENAR",
    TK_SALAH: "TK_SALAH",
    TK_KOSONG: "TK_KOSONG",
    // Operator kata
    TK_DAN: "TK_DAN",
    TK_ATAU: "TK_ATAU",
    TK_BUKAN: "TK_BUKAN",
    TK_SAMA_DENGAN: "TK_SAMA_DENGAN",
    TK_TIDAK_SAMA_DENGAN: "TK_TIDAK_SAMA_DENGAN",
    TK_LEBIH_DARI: "TK_LEBIH_DARI",
    TK_KURANG_DARI: "TK_KURANG_DARI",
    TK_PALING_SEDIKIT: "TK_PALING_SEDIKIT",
    TK_PALING_BANYAK: "TK_PALING_BANYAK",
    TK_ADA_DI: "TK_ADA_DI",
    TK_TIDAK_ADA_DI: "TK_TIDAK_ADA_DI",
    // Operator aritmatika kata
    TK_MOD: "TK_MOD",
    TK_PANGKAT: "TK_PANGKAT",
    // Simbol / Operator simbol
    TK_PANAH: "TK_PANAH",
    TK_TITIK_DUA: "TK_TITIK_DUA",
    TK_KOMA: "TK_KOMA",
    TK_TITIK: "TK_TITIK",
    TK_PLUS: "TK_PLUS",
    TK_MINUS: "TK_MINUS",
    TK_BINTANG: "TK_BINTANG",
    TK_GARIS_MIRING: "TK_GARIS_MIRING",
    TK_TANDA_SAMA: "TK_TANDA_SAMA",
    // Kurung
    TK_KURUNG_BUKA: "TK_KURUNG_BUKA",
    TK_KURUNG_TUTUP: "TK_KURUNG_TUTUP",
    TK_KURAWAL_BUKA: "TK_KURAWAL_BUKA",
    TK_KURAWAL_TUTUP: "TK_KURAWAL_TUTUP",
    TK_KURUNG_SIKU_BUKA: "TK_KURUNG_SIKU_BUKA",
    TK_KURUNG_SIKU_TUTUP: "TK_KURUNG_SIKU_TUTUP",
    // Selektor
    TK_ID: "TK_ID",
    TK_CLASS: "TK_CLASS",
    TK_ATRIBUT: "TK_ATRIBUT",
    // Identifier / Literal dasar
    TK_IDENTIFIER: "TK_IDENTIFIER",
    TK_LITERAL_TEKS: "TK_LITERAL_TEKS",
    TK_LITERAL_ANGKA: "TK_LITERAL_ANGKA",
    // Komentar (tipe disediakan; --! dilewati, --? jadi docstring)
    TK_KOMENTAR_BIASA: "TK_KOMENTAR_BIASA",
    TK_KOMENTAR_DOC: "TK_KOMENTAR_DOC",
    // Interop / Node
    TK_LANGSUNG: "TK_LANGSUNG",
    TK_BLOK_LANGSUNG: "TK_BLOK_LANGSUNG",
    TK_FRAGMEN: "TK_FRAGMEN",
    // Kontrol whitespace & EOF
    TK_INDENT: "TK_INDENT",
    TK_DEDENT: "TK_DEDENT",
    TK_BARIS_BARU: "TK_BARIS_BARU",
    TK_EOF: "TK_EOF",
  };

  /* ==========================================================================
   * 2. PETA KATA KUNCI  (nilai -> tipe)
   *    Termasuk keyword multi-kata & ber-hyphen. Diurutkan otomatis saat
   *    membangun trie agar longest-match benar.
   * ========================================================================== */
  const KEYWORD_LIST = [
    // Struktur
    ["buat", TT.TK_BUAT],
    ["tampilkan", TT.TK_TAMPILKAN],
    ["sembunyikan", TT.TK_SEMBUNYIKAN],
    ["hapus", TT.TK_HAPUS],
    ["kosongkan", TT.TK_KOSONGKAN],
    ["perbarui", TT.TK_PERBARUI],
    // Event
    ["ketika", TT.TK_KETIKA],
    ["diklik", TT.TK_DIKLIK],
    ["diketik", TT.TK_DIKETIK],
    ["disubmit", TT.TK_DISUBMIT],
    ["dimuat", TT.TK_DIMUAT],
    ["diubah", TT.TK_DIUBAH],
    ["difokus", TT.TK_DIFOKUS],
    ["ditinggal", TT.TK_DITINGGAL],
    ["ditinggal-kursor", TT.TK_DITINGGAL_KURSOR],
    ["ditekan", TT.TK_DITEKAN],
    ["dilepas", TT.TK_DILEPAS],
    ["dilepas-dari-dom", TT.TK_DILEPAS_DARI_DOM],
    ["diarahkan", TT.TK_DIARAHKAN],
    ["digulir", TT.TK_DIGULIR],
    ["dipasang", TT.TK_DIPASANG],
    // Alur
    ["lalu", TT.TK_LALU],
    ["setelah", TT.TK_SETELAH],
    // Logika (multi-kata diurutkan panjang oleh trie)
    ["jika", TT.TK_JIKA],
    ["jika tidak", TT.TK_JIKA_TIDAK],
    ["kalau", TT.TK_KALAU],
    ["ulangi", TT.TK_ULANGI],
    ["selama", TT.TK_SELAMA],
    ["berhenti", TT.TK_BERHENTI],
    ["lewati", TT.TK_LEWATI],
    ["kembalikan", TT.TK_KEMBALIKAN],
    // Data / Reaktif
    ["data", TT.TK_DATA],
    ["turunan", TT.TK_TURUNAN],
    ["simpan", TT.TK_SIMPAN],
    ["ambil", TT.TK_AMBIL],
    ["tetap", TT.TK_TETAP],
    ["ubah", TT.TK_UBAH],
    ["tambahkan", TT.TK_TAMBAHKAN],
    ["sisipkan", TT.TK_SISIPKAN],
    ["kurangi", TT.TK_KURANGI],
    ["saat", TT.TK_SAAT],
    ["berubah", TT.TK_BERUBAH],
    // Komponen / Fungsi
    ["komponen", TT.TK_KOMPONEN],
    ["gunakan", TT.TK_GUNAKAN],
    ["dengan", TT.TK_DENGAN],
    ["di", TT.TK_DI],
    ["dari", TT.TK_DARI],
    ["ke", TT.TK_KE],
    ["fungsi", TT.TK_FUNGSI],
    ["jalankan", TT.TK_JALANKAN],
    // Jaringan / Navigasi
    ["berhasil", TT.TK_BERHASIL],
    ["gagal", TT.TK_GAGAL],
    ["selalu", TT.TK_SELALU],
    ["arahkan", TT.TK_ARAHKAN],
    ["muat ulang", TT.TK_MUAT_ULANG],
    ["kembali", TT.TK_KEMBALI],
    // Literal
    ["benar", TT.TK_BENAR],
    ["salah", TT.TK_SALAH],
    ["kosong", TT.TK_KOSONG],
    // Operator logika
    ["dan", TT.TK_DAN],
    ["atau", TT.TK_ATAU],
    ["bukan", TT.TK_BUKAN],
    // Operator perbandingan kata (multi-kata)
    ["sama dengan", TT.TK_SAMA_DENGAN],
    ["tidak sama dengan", TT.TK_TIDAK_SAMA_DENGAN],
    ["lebih dari", TT.TK_LEBIH_DARI],
    ["kurang dari", TT.TK_KURANG_DARI],
    ["paling sedikit", TT.TK_PALING_SEDIKIT],
    ["paling banyak", TT.TK_PALING_BANYAK],
    ["ada di", TT.TK_ADA_DI],
    ["tidak ada di", TT.TK_TIDAK_ADA_DI],
    // Operator aritmatika kata
    ["mod", TT.TK_MOD],
    ["pangkat", TT.TK_PANGKAT],
    // Interop / Node
    ["langsung", TT.TK_LANGSUNG],
    ["fragmen", TT.TK_FRAGMEN],
  ];

  const KEYWORDS = {};
  for (let i = 0; i < KEYWORD_LIST.length; i++) KEYWORDS[KEYWORD_LIST[i][0]] = KEYWORD_LIST[i][1];

  /* ==========================================================================
   * 3. TRIE KATA KUNCI  (longest-match, O(panjang keyword) per kata)
   * ========================================================================== */
  function buildTrie() {
    const root = { children: Object.create(null), type: null, value: null };
    for (let i = 0; i < KEYWORD_LIST.length; i++) {
      const key = KEYWORD_LIST[i][0];
      const type = KEYWORD_LIST[i][1];
      let node = root;
      for (let j = 0; j < key.length; j++) {
        const ch = key.charAt(j);
        if (!node.children[ch]) {
          node.children[ch] = { children: Object.create(null), type: null, value: null };
        }
        node = node.children[ch];
      }
      node.type = type;
      node.value = key;
    }
    return root;
  }

  const KEYWORD_TRIE = buildTrie();

  /* ==========================================================================
   * 4. KLASIFIKASI KARAKTER
   * ========================================================================== */
  const RE_LETTER = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;
  const RE_IDENT_CONT = /[A-Za-z0-9_\u00C0-\u024F\u1E00-\u1EFF]/;
  const RE_SELECTOR = /[A-Za-z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/;

  function isDigit(c) {
    return c >= "0" && c <= "9";
  }
  function isLetter(c) {
    return !!c && RE_LETTER.test(c);
  }
  function isIdentCont(c) {
    return !!c && RE_IDENT_CONT.test(c);
  }
  function isSelectorChar(c) {
    return !!c && RE_SELECTOR.test(c);
  }
  function isEOL(c) {
    return c === "\n" || c === "\r";
  }

  /**
   * Mencocokkan keyword terpanjang pada src mulai posisi p.
   * Mengembalikan { end, type, value } bila ada keyword valid yang diikuti
   * batas kata (boundary), atau null.
   */
  function trieMatch(root, src, p) {
    let node = root;
    if (!node.children[src.charAt(p)]) return null;
    let i = p;
    const matches = [];
    const len = src.length;
    while (i < len) {
      const ch = src.charAt(i);
      const child = node.children[ch];
      if (!child) break;
      node = child;
      i++;
      if (node.type) matches.push({ end: i, type: node.type, value: node.value });
    }
    // Pilih terminal terpanjang yang batas-katanya valid (karakter setelahnya
    // tidak boleh melanjutkan identifier).
    for (let k = matches.length - 1; k >= 0; k--) {
      const m = matches[k];
      const after = m.end < len ? src.charAt(m.end) : "";
      if (!isIdentCont(after)) return m;
    }
    return null;
  }

  /* ==========================================================================
   * 5. ERROR / WARNING
   * ========================================================================== */
  function LexerError(baris, kolom, kode, pesan, penjelasan, saran) {
    this.baris = baris;
    this.kolom = kolom;
    this.kode = kode;
    this.code = kode;
    this.pesan = pesan;
    this.message = pesan;
    this.penjelasan = penjelasan || "";
    this.saran = saran || "";
    this.suggestion = saran || "";
    this.severity = kode.charAt(0) === 'W' ? 'warning' : 'error';
    this.loc = { start: { line: baris, column: kolom }, end: { line: baris, column: kolom } };
  }
  LexerError.prototype.toString = function () {
    return formatError(this);
  };

  function formatError(e) {
    let s = "✗ Baris " + e.baris + ", Kolom " + e.kolom + " [" + e.kode + "]\n" + e.pesan;
    if (e.penjelasan) s += "\n" + e.penjelasan;
    if (e.saran) s += "\nSaran: " + e.saran;
    return s;
  }

  /* ==========================================================================
   * 6. KELAS LEXER
   * ========================================================================== */
  function Lexer(source, options) {
    this.src = String(source == null ? "" : source);
    this.len = this.src.length;
    this.opt = options || {};
    this.reset();
  }

  Lexer.prototype.reset = function () {
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokens = [];
    this.errors = [];
    this.warnings = [];
    this.indentStack = [0];
    this.atLineStart = true;
    this.bracketDepth = 0;
    this.pendingDoc = null; // docstring menunggu ditempel ke token signifikan berikutnya
    this.last = null; // token terakhir yang di-emit
    this.rawPending = null; // { baseIndent } bila akan menangkap blok langsung:
    return this;
  };

  /* ---------- util emit ---------- */
  Lexer.prototype.emit = function (tipe, nilai, baris, kolom) {
    const tok = { tipe: tipe, nilai: nilai, baris: baris, kolom: kolom, docstring: null };
    if (this.pendingDoc !== null && this.isSignificant(tipe)) {
      tok.docstring = this.pendingDoc;
      this.pendingDoc = null;
    }
    this.tokens.push(tok);
    this.last = tok;
    return tok;
  };

  Lexer.prototype.isSignificant = function (tipe) {
    return (
      tipe !== TT.TK_INDENT &&
      tipe !== TT.TK_DEDENT &&
      tipe !== TT.TK_BARIS_BARU &&
      tipe !== TT.TK_EOF
    );
  };

  Lexer.prototype.error = function (baris, kolom, kode, pesan, penjelasan, saran) {
    this.errors.push(new LexerError(baris, kolom, kode, pesan, penjelasan, saran));
  };

  Lexer.prototype.warning = function (baris, kolom, kode, pesan) {
    this.warnings.push({
      baris: baris, kolom: kolom,
      kode: kode, code: kode,
      pesan: pesan, message: pesan,
      saran: '', suggestion: '',
      severity: 'warning',
      loc: { start: { line: baris, column: kolom }, end: { line: baris, column: kolom } }
    });
  };

  /* ---------- util gerak kursor ---------- */
  Lexer.prototype.consumeNewline = function () {
    if (this.pos >= this.len) return;
    const c = this.src.charAt(this.pos);
    if (c === "\r") {
      this.pos += this.src.charAt(this.pos + 1) === "\n" ? 2 : 1;
    } else if (c === "\n") {
      this.pos += 1;
    } else {
      return; // bukan newline
    }
    this.line++;
    this.col = 1;
  };

  Lexer.prototype.readUntilEOL = function () {
    let buf = "";
    while (this.pos < this.len) {
      const c = this.src.charAt(this.pos);
      if (c === "\n" || c === "\r") break;
      buf += c;
      this.pos++;
      this.col++;
    }
    return buf;
  };

  // Membaca sampai penanda `close` (mis. "]]"). Mengembalikan {text, closed}.
  Lexer.prototype.readUntilClose = function (close) {
    let buf = "";
    const c0 = close.charAt(0);
    const c1 = close.charAt(1);
    while (this.pos < this.len) {
      const ch = this.src.charAt(this.pos);
      if (ch === c0 && this.src.charAt(this.pos + 1) === c1) {
        this.pos += 2;
        this.col += 2;
        return { text: buf, closed: true };
      }
      if (ch === "\n" || ch === "\r") {
        buf += "\n";
        this.consumeNewline();
      } else {
        buf += ch;
        this.pos++;
        this.col++;
      }
    }
    return { text: buf, closed: false };
  };

  Lexer.prototype.unescapeString = function (s) {
    let out = "";
    for (let i = 0; i < s.length; i++) {
      if (s.charAt(i) === "\\" && i + 1 < s.length) {
        const n = s.charAt(i + 1);
        if (n === "n") out += "\n";
        else if (n === "t") out += "\t";
        else if (n === "r") out += "\r";
        else if (n === "\\") out += "\\";
        else if (n === '"') out += '"';
        else if (n === "'") out += "'";
        else if (n === "0") out += "\0";
        else out += n;
        i++;
      } else {
        out += s.charAt(i);
      }
    }
    return out;
  };

  Lexer.prototype.addDocstring = function (text) {
    const t = text.replace(/\r/g, "").trim();
    if (t === "" && this.pendingDoc === null) return; // abaikan docstring kosong pertama
    if (this.pendingDoc === null) this.pendingDoc = t;
    else this.pendingDoc += "\n" + t;
  };

  /* ==========================================================================
   * 7. LOGIKA AWAL BARIS & INDENTASI
   * ========================================================================== */
  Lexer.prototype.processLineStart = function () {
    // Blok langsung: ditangkap sebagai region mentah
    if (this.rawPending) {
      const baseIndent = this.rawPending.baseIndent;
      this.rawPending = null;
      this.captureRawBlock(baseIndent);
      return false;
    }

    // Hitung spasi indentasi
    let spaces = 0;
    while (this.pos < this.len && this.src.charAt(this.pos) === " ") {
      spaces++;
      this.pos++;
      this.col++;
    }

    // Tab di indentasi -> error
    if (this.pos < this.len && this.src.charAt(this.pos) === "\t") {
      this.error(
        this.line,
        spaces + 1,
        "E1002",
        "Indentasi tidak valid: karakter TAB ditemukan.",
        "Karsa hanya memakai spasi (2 per level). Tab tidak diperbolehkan.",
        "ganti semua tab menjadi spasi (2, 4, 6, ...)."
      );
      // pulihkan: lewati sisa baris
      this.readUntilEOL();
      this.consumeNewline();
      return false;
    }

    // Akhir file setelah spasi
    if (this.pos >= this.len) return false;

    const c = this.src.charAt(this.pos);

    // Baris kosong
    if (c === "\n" || c === "\r") {
      this.consumeNewline();
      return false;
    }

    // Baris komentar / docstring (hanya bila marker valid: --! atau --?)
    if (
      c === "-" &&
      this.src.charAt(this.pos + 1) === "-" &&
      (this.src.charAt(this.pos + 2) === "!" || this.src.charAt(this.pos + 2) === "?")
    ) {
      this.handleComment();
      this.consumeNewline();
      return false;
    }

    // Baris berkonten -> validasi & sesuaikan indentasi
    if (spaces % 2 !== 0) {
      this.error(
        this.line,
        spaces,
        "E1001",
        "Indentasi tidak valid: " + spaces + " spasi ditemukan, tetapi Karsa memakai 2 spasi per level.",
        "",
        "gunakan 2, 4, 6, atau 8 spasi (kelipatan 2)."
      );
    }
    // pulihkan: bulatkan ke bawah ke kelipatan 2 agar stack tidak kacau
    const effective = spaces - (spaces % 2);
    this.adjustIndent(effective);
    this.atLineStart = false;
    return true;
  };

  Lexer.prototype.adjustIndent = function (spaces) {
    const top = this.indentStack[this.indentStack.length - 1];
    if (spaces > top) {
      this.indentStack.push(spaces);
      this.emit(TT.TK_INDENT, String(this.indentStack.length - 1), this.line, 1);
    } else if (spaces < top) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > spaces) {
        this.indentStack.pop();
        this.emit(TT.TK_DEDENT, String(this.indentStack.length - 1), this.line, 1);
      }
      if (this.indentStack[this.indentStack.length - 1] !== spaces) {
        this.error(
          this.line,
          1,
          "E1003",
          "Indentasi tidak konsisten: " + spaces + " spasi tidak cocok dengan level indentasi mana pun sebelumnya.",
          "DEDENT harus kembali ke level yang sudah ada pada stack indentasi.",
          "periksa baris di atasnya dan gunakan indentasi yang konsisten (kelipatan 2)."
        );
        this.indentStack.push(spaces); // pulihkan
      }
    }
  };

  /* ---------- komentar / docstring ----------
   * Menangani komentar mulai dari posisi saat ini (bisa di awal baris
   * maupun inline). TIDAK mengonsumsi baris baru penutup — itu tugas
   * pemanggil (processLineStart atau handleNewline via iterasi berikut).
   *
   * Bentuk sebaris : "--! ..." / "--? ..."  -> sampai akhir baris
   * Bentuk blok    : "--! [[ ... ]]" / "--? [[ ... ]]"  -> sampai "]]"
   *                   (karakter SETELAH "]]" pada baris yg sama tetap normal)
   */
  Lexer.prototype.handleComment = function () {
    const bLine = this.line;
    const bCol = this.col;
    const marker = this.src.charAt(this.pos + 2); // '!' atau '?'
    this.pos += 3; // konsumsi "--!" / "--?"
    this.col += 3;
    // spasi opsional sebelum '[['
    while (this.pos < this.len && this.src.charAt(this.pos) === " ") {
      this.pos++;
      this.col++;
    }
    if (this.src.charAt(this.pos) === "[" && this.src.charAt(this.pos + 1) === "[") {
      // bentuk blok
      this.pos += 2;
      this.col += 2;
      const res = this.readUntilClose("]]");
      if (!res.closed) {
        if (marker === "?") {
          this.error(
            bLine,
            bCol,
            "E1006",
            "DocString blok tidak ditutup: penutup \"]]\" tidak ditemukan.",
            "DocString dimulai dengan \"--? [[\" tetapi tidak ditutup.",
            "tambahkan \"]]\" pada akhir DocString blok."
          );
        } else {
          this.error(
            bLine,
            bCol,
            "E1007",
            "Komentar blok tidak ditutup: penutup \"]]\" tidak ditemukan.",
            "Komentar dimulai dengan \"--! [[\" tetapi tidak ditutup.",
            "tambahkan \"]]\" pada akhir komentar blok."
          );
        }
      }
      if (marker === "?") this.addDocstring(res.text);
      // jangan konsumsi sisa baris setelah ]] -> itu konten normal
    } else {
      // bentuk sebaris: semua sisa baris adalah isi komentar/docstring
      const text = this.readUntilEOL();
      if (marker === "?") this.addDocstring(text);
    }
  };

  /* ==========================================================================
   * 8. REGION MENTAH  `langsung:`
   * ========================================================================== */
  Lexer.prototype.maybeEnterRawBlock = function () {
    // Hanya bila sisa baris kosong (spasi lalu newline/EOF)
    let p = this.pos;
    while (p < this.len && this.src.charAt(p) === " ") p++;
    if (p >= this.len || this.src.charAt(p) === "\n" || this.src.charAt(p) === "\r") {
      this.rawPending = { baseIndent: this.indentStack[this.indentStack.length - 1] };
      // konsumsi sisa spasi
      while (this.pos < this.len && this.src.charAt(this.pos) === " ") {
        this.pos++;
        this.col++;
      }
      this.emit(TT.TK_BARIS_BARU, "\n", this.line, this.col);
      this.consumeNewline();
      this.atLineStart = true;
    }
  };

  Lexer.prototype.captureRawBlock = function (baseIndent) {
    const startLine = this.line;
    const lines = [];
    while (this.pos < this.len) {
      const lineStart = this.pos;
      // hitung indentasi (spasi/tab) untuk batas blok
      let p = lineStart;
      let ws = 0;
      while (p < this.len && (this.src.charAt(p) === " " || this.src.charAt(p) === "\t")) {
        ws++;
        p++;
      }
      if (p >= this.len) {
        this.pos = this.len;
        break;
      }
      const ch = this.src.charAt(p);
      if (ch === "\n" || ch === "\r") {
        // baris kosong di dalam blok mentah -> baris kosong dalam JS
        lines.push("");
        this.pos = p;
        this.consumeNewline();
        continue;
      }
      if (ws <= baseIndent) {
        // batas blok: hentikan TANPA mengonsumsi baris ini
        this.pos = lineStart;
        this.col = 1;
        break;
      }
      // baris JS mentah
      let lineEnd = p;
      while (lineEnd < this.len && this.src.charAt(lineEnd) !== "\n" && this.src.charAt(lineEnd) !== "\r") {
        lineEnd++;
      }
      const content = this.src.slice(p, lineEnd);
      const strip = Math.min(baseIndent + 2, ws);
      const keepWs = ws - strip;
      lines.push(spaces(keepWs) + content);
      this.pos = lineEnd;
      if (this.pos < this.len && (this.src.charAt(this.pos) === "\n" || this.src.charAt(this.pos) === "\r")) {
        this.consumeNewline();
      }
    }
    const rawText = lines.join("\n");
    this.emit(TT.TK_BLOK_LANGSUNG, rawText, startLine, 1);
    this.emit(TT.TK_BARIS_BARU, "\n", this.line, 1);
    this.atLineStart = true;
  };

  function spaces(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += " ";
    return s;
  }

  /* ==========================================================================
   * 9. PEMINDAI TOKEN (scanToken)
   * ========================================================================== */
  Lexer.prototype.scanToken = function () {
    const c = this.src.charAt(this.pos);
    const b = this.line;
    const k = this.col;

    // --- Literal teks ---
    if (c === '"' || c === "'") {
      this.scanString();
      return;
    }
    // --- Angka (positif, mulai digit) ---
    if (isDigit(c)) {
      this.scanNumber(false);
      return;
    }
    // --- Kata (keyword / identifier) ---
    if (isLetter(c)) {
      this.scanWord();
      return;
    }
    // --- Selektor ID ---
    if (c === "#") {
      this.scanIdSelector();
      return;
    }
    // --- Titik (kelas / akses-properti) ---
    if (c === ".") {
      this.scanDot();
      return;
    }
    // --- Kurung siku (atribut / array) ---
    if (c === "[") {
      this.scanBracket();
      return;
    }
    // --- Komentar / DocString inline (di mana saja di baris) ---
    //     "--!" atau "--?" lalu sampai akhir baris / blok [[ ]]
    if (c === "-" && this.src.charAt(this.pos + 1) === "-") {
      const mk = this.src.charAt(this.pos + 2);
      if (mk === "!" || mk === "?") {
        this.handleComment();
        return; // sisa baris habis; newline ditangani iterasi berikutnya
      }
    }
    // --- Panah / minus / angka negatif ---
    if (c === "-") {
      if (this.src.charAt(this.pos + 1) === ">") {
        this.emit(TT.TK_PANAH, "->", b, k);
        this.pos += 2;
        this.col += 2;
        return;
      }
      if (isDigit(this.src.charAt(this.pos + 1)) && !this.prevIsValueLike()) {
        this.scanNumber(true);
        return;
      }
      this.emit(TT.TK_MINUS, "-", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === "+") {
      this.emit(TT.TK_PLUS, "+", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === "*") {
      this.emit(TT.TK_BINTANG, "*", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === "/") {
      this.emit(TT.TK_GARIS_MIRING, "/", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === "=") {
      this.emit(TT.TK_TANDA_SAMA, "=", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === ":") {
      this.emit(TT.TK_TITIK_DUA, ":", b, k);
      this.pos++;
      this.col++;
      // deteksi blok mentah `langsung:`
      if (
        this.tokens.length >= 2 &&
        this.tokens[this.tokens.length - 2].tipe === TT.TK_LANGSUNG
      ) {
        this.maybeEnterRawBlock();
      }
      return;
    }
    if (c === ",") {
      this.emit(TT.TK_KOMA, ",", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === "(") {
      this.bracketDepth++;
      this.emit(TT.TK_KURUNG_BUKA, "(", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === ")") {
      if (this.bracketDepth > 0) this.bracketDepth--;
      this.emit(TT.TK_KURUNG_TUTUP, ")", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === "{") {
      this.bracketDepth++;
      this.emit(TT.TK_KURAWAL_BUKA, "{", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === "}") {
      if (this.bracketDepth > 0) this.bracketDepth--;
      this.emit(TT.TK_KURAWAL_TUTUP, "}", b, k);
      this.pos++;
      this.col++;
      return;
    }
    if (c === "]") {
      if (this.bracketDepth > 0) this.bracketDepth--;
      this.emit(TT.TK_KURUNG_SIKU_TUTUP, "]", b, k);
      this.pos++;
      this.col++;
      return;
    }
    // --- Spasi / tab dalam baris (diabaikan) ---
    if (c === " " || c === "\t") {
      while (this.pos < this.len && (this.src.charAt(this.pos) === " " || this.src.charAt(this.pos) === "\t")) {
        this.pos++;
        this.col++;
      }
      return;
    }
    // --- Baris baru ---
    if (c === "\n" || c === "\r") {
      this.handleNewline();
      return;
    }
    // --- Karakter tidak dikenal ---
    this.error(
      b,
      k,
      "E1005",
      "Karakter tidak dikenal: " + JSON.stringify(c) + ".",
      "Karakter ini tidak valid dalam sintaks Karsa.",
      "hapus atau ganti karakter tersebut."
    );
    this.pos++;
    this.col++;
  };

  Lexer.prototype.prevIsValueLike = function () {
    if (!this.last) return false;
    const t = this.last.tipe;
    return (
      t === TT.TK_LITERAL_TEKS ||
      t === TT.TK_LITERAL_ANGKA ||
      t === TT.TK_BENAR ||
      t === TT.TK_SALAH ||
      t === TT.TK_KOSONG ||
      t === TT.TK_IDENTIFIER ||
      t === TT.TK_KURUNG_TUTUP ||
      t === TT.TK_KURUNG_SIKU_TUTUP ||
      t === TT.TK_KURAWAL_TUTUP
    );
  };

  /* ---------- pemindai sub-token ---------- */
  Lexer.prototype.scanString = function () {
    const quote = this.src.charAt(this.pos);
    const b = this.line;
    const k = this.col;
    this.pos++;
    this.col++; // kutip pembuka
    let buf = "";
    let closed = false;
    while (this.pos < this.len) {
      const c = this.src.charAt(this.pos);
      if (c === "\\") {
        const next = this.src.charAt(this.pos + 1);
        if (next === "n") buf += "\n";
        else if (next === "t") buf += "\t";
        else if (next === "r") buf += "\r";
        else if (next === "\\") buf += "\\";
        else if (next === '"') buf += '"';
        else if (next === "'") buf += "'";
        else if (next === "0") buf += "\0";
        else buf += next; // escape tak dikenal: simpan apa adanya
        this.pos += 2;
        this.col += 2;
      } else if (c === quote) {
        this.pos++;
        this.col++;
        closed = true;
        break;
      } else if (c === "\n" || c === "\r") {
        break; // tidak ditutup sebelum newline
      } else {
        buf += c;
        this.pos++;
        this.col++;
      }
    }
    if (!closed) {
      this.error(
        b,
        k,
        "E1004",
        "Literal teks tidak ditutup: tanda kutip penutup tidak ditemukan pada baris yang sama.",
        "String dimulai di kolom " + k + " tetapi tidak ditutup.",
        "tambahkan tanda kutip penutup \"" + quote + "\"."
      );
    }
    const tok = this.emit(TT.TK_LITERAL_TEKS, buf, b, k);
    tok.mentah = quote + buf + (closed ? quote : "");
  };

  Lexer.prototype.scanNumber = function (negative) {
    const b = this.line;
    const k = this.col;
    let buf = "";
    if (negative) {
      buf += "-";
      this.pos++;
      this.col++;
    }
    while (this.pos < this.len && isDigit(this.src.charAt(this.pos))) {
      buf += this.src.charAt(this.pos);
      this.pos++;
      this.col++;
    }
    if (this.src.charAt(this.pos) === "." && isDigit(this.src.charAt(this.pos + 1))) {
      buf += ".";
      this.pos++;
      this.col++;
      while (this.pos < this.len && isDigit(this.src.charAt(this.pos))) {
        buf += this.src.charAt(this.pos);
        this.pos++;
        this.col++;
      }
    }
    const tok = this.emit(TT.TK_LITERAL_ANGKA, buf, b, k);
    tok.angka = Number(buf);
  };

  Lexer.prototype.scanWord = function () {
    const b = this.line;
    const k = this.col;
    const m = trieMatch(KEYWORD_TRIE, this.src, this.pos);
    if (m) {
      const consumed = m.end - this.pos;
      this.pos = m.end;
      this.col += consumed;
      this.emit(m.type, m.value, b, k);
      return;
    }
    let buf = "";
    while (this.pos < this.len && isIdentCont(this.src.charAt(this.pos))) {
      buf += this.src.charAt(this.pos);
      this.pos++;
      this.col++;
    }
    this.emit(TT.TK_IDENTIFIER, buf, b, k);
  };

  Lexer.prototype.scanIdSelector = function () {
    const b = this.line;
    const k = this.col;
    this.pos++;
    this.col++; // '#'
    let name = "";
    while (this.pos < this.len && isSelectorChar(this.src.charAt(this.pos))) {
      name += this.src.charAt(this.pos);
      this.pos++;
      this.col++;
    }
    if (name === "") {
      this.error(
        b,
        k,
        "E1009",
        "Selektor ID kosong: \"#\" harus diikuti nama.",
        "",
        "tulis nama id setelah \"#\", mis. \"#app\"."
      );
    }
    this.emit(TT.TK_ID, name, b, k);
  };

  Lexer.prototype.scanDot = function () {
    const b = this.line;
    const k = this.col;
    this.pos++;
    this.col++; // '.'
    const next = this.src.charAt(this.pos);
    if (!isSelectorChar(next)) {
      // '.' saja (mis. akhir baris) -> TITIK
      this.emit(TT.TK_TITIK, ".", b, k);
      return;
    }
    let name = "";
    while (this.pos < this.len && isSelectorChar(this.src.charAt(this.pos))) {
      name += this.src.charAt(this.pos);
      this.pos++;
      this.col++;
    }
    if (name.indexOf("-") !== -1) {
      // mengandung hyphen -> pasti kelas CSS
      this.emit(TT.TK_CLASS, name, b, k);
    } else {
      // akses-properti atau kelas tanpa-hyphen: TITIK + IDENTIFIER
      // (parser memutuskan makna berdasarkan konteks)
      this.emit(TT.TK_TITIK, ".", b, k);
      this.emit(TT.TK_IDENTIFIER, name, b, k + 1);
    }
  };

  Lexer.prototype.scanBracket = function () {
    const b = this.line;
    const k = this.col;
    if (this.tryAtributSelector(b, k)) return;
    // array literal
    this.bracketDepth++;
    this.emit(TT.TK_KURUNG_SIKU_BUKA, "[", b, k);
    this.pos++;
    this.col++;
  };

  // Mencoba pola [ IDENTIFIER "=" STRING "] ; true bila cocok & diemit.
  Lexer.prototype.tryAtributSelector = function (b, k) {
    let p = this.pos + 1; // lewati '['
    while (this.src.charAt(p) === " ") p++;
    const keyStart = p;
    while (isIdentCont(this.src.charAt(p))) p++;
    const keyEnd = p;
    if (keyEnd === keyStart) return false;
    while (this.src.charAt(p) === " ") p++;
    if (this.src.charAt(p) !== "=") return false;
    p++;
    while (this.src.charAt(p) === " ") p++;
    const q = this.src.charAt(p);
    if (q !== '"' && q !== "'") return false;
    p++;
    const valStart = p;
    while (
      p < this.len &&
      this.src.charAt(p) !== q &&
      this.src.charAt(p) !== "\n" &&
      this.src.charAt(p) !== "\r"
    ) {
      if (this.src.charAt(p) === "\\") p++; // lewati escape
      p++;
    }
    if (this.src.charAt(p) !== q) return false; // tidak ditutup
    const valEnd = p;
    p++; // kutip tutup
    while (this.src.charAt(p) === " ") p++;
    if (this.src.charAt(p) !== "]") return false;
    p++; // ']'
    // sukses -> emit satu token TK_ATRIBUT
    const key = this.src.slice(keyStart, keyEnd);
    const rawVal = this.src.slice(valStart, valEnd);
    const val = this.unescapeString(rawVal);
    const tok = this.emit(TT.TK_ATRIBUT, key + '="' + val + '"', b, k);
    tok.kunci = key;
    tok.nilaiAtribut = val;
    const consumed = p - this.pos;
    this.pos = p;
    this.col += consumed;
    return true;
  };

  Lexer.prototype.handleNewline = function () {
    if (this.bracketDepth > 0) {
      // di dalam kurung: newline diabaikan (lanjutan baris)
      this.consumeNewline();
      while (this.pos < this.len && this.src.charAt(this.pos) === " ") {
        this.pos++;
        this.col++;
      }
      return;
    }
    this.emit(TT.TK_BARIS_BARU, "\n", this.line, this.col);
    this.consumeNewline();
    this.atLineStart = true;
  };

  /* ==========================================================================
   * 10. AKHIR FILE
   * ========================================================================== */
  Lexer.prototype.finish = function () {
    if (!this.atLineStart) {
      this.emit(TT.TK_BARIS_BARU, "\n", this.line, this.col);
    }
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.emit(TT.TK_DEDENT, String(this.indentStack.length - 1), this.line, 1);
    }
    if (this.pendingDoc !== null) {
      this.warning(
        this.line,
        1,
        "W1001",
        "DocString tidak terpakai: \"" + this.pendingDoc.slice(0, 60) + "\" tidak menempel ke node mana pun."
      );
      this.pendingDoc = null;
    }
    this.emit(TT.TK_EOF, "", this.line, this.col);
  };

  /* ==========================================================================
   * 11. ENTRI UTAMA
   * ========================================================================== */
  Lexer.prototype.tokenize = function () {
    while (this.pos < this.len) {
      if (this.atLineStart) {
        if (this.processLineStart() === false) continue;
      }
      this.scanToken();
    }
    this.finish();
    return {
      tokens: this.tokens,
      errors: this.errors,
      warnings: this.warnings,
    };
  };

  /* ---------- API publik ---------- */
  function tokenize(source, options) {
    return new Lexer(source, options).tokenize();
  }

  exports.TT = TT;
  exports.KEYWORDS = KEYWORDS;
  exports.KEYWORD_LIST = KEYWORD_LIST;
  exports.Lexer = Lexer;
  exports.LexerError = LexerError;
  exports.tokenize = tokenize;
  exports.formatError = formatError;

  return exports;
});


// ============================================================
// VISITOR UTILITY — KarsaVisitor
// ============================================================
(function(root) {
  "use strict";

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — Visitor Pattern
   *
   * Implementasi visitor untuk traversing AST KARSA.
   * Berdasarkan: RFC-PARSER-001 §8
   */
  
  var TT = {};
  
  /**
   * Dispatch otomatis ke metode visit yang sesuai berdasarkan node.type.
   *
   * @param {object} node - Node AST
   * @param {object} visitor - Objek visitor dengan metode visit*
   * @returns {*} Hasil dari metode visit
   */
  function accept(node, visitor) {
    if (!node || !node.type) return undefined;
  
    var methodName = 'visit' + node.type;
  
    if (typeof visitor[methodName] === 'function') {
      return visitor[methodName](node);
    }
  
    // Fallback: genericVisit
    if (typeof visitor.genericVisit === 'function') {
      return visitor.genericVisit(node);
    }
  
    return undefined;
  }
  
  /**
   * Melakukan traversing depth-first ke semua anak node.
   *
   * @param {object} node - Node AST
   * @param {object} visitor - Objek visitor
   */
  function traverse(node, visitor) {
    if (!node) return;
  
    // Hanya dispatch ke metode visit; genericVisit yang menangani traversing anak
    accept(node, visitor);
  }
  
  /**
   * Mendapatkan nama properti anak untuk setiap tipe node.
   */
  function getChildKeys(nodeType) {
    switch (nodeType) {
      case 'Program': return ['body'];
      case 'BlockStatement': return ['body'];
      case 'BuatStatement': return ['selector', 'properties', 'body', 'action'];
      case 'TampilkanStatement': return ['target', 'mountTarget'];
      case 'SembunyikanStatement': return ['target'];
      case 'HapusStatement': return ['target'];
      case 'KosongkanStatement': return ['target'];
      case 'PerbaruiStatement': return ['target', 'value'];
      case 'KetikaStatement': return ['target', 'body', 'action'];
      case 'SaatStatement': return ['body'];
      case 'LifecycleStatement': return ['body'];
      case 'SetelahStatement': return ['body', 'action'];
      case 'JikaStatement': return ['condition', 'consequent', 'alternate'];
      case 'UlangiStatement': return ['source', 'body', 'rangeEnd'];
      case 'SelamaStatement': return ['condition', 'body'];
      case 'KembalikanStatement': return ['value'];
      case 'SimpanStatement': return ['value'];
      case 'TambahkanStatement': return ['value'];
      case 'KurangiStatement': return ['value'];
      case 'SisipkanStatement': return ['value'];
      case 'AmbilDomStatement': return ['source'];
      case 'AmbilLuarStatement': return ['url', 'options', 'branches'];
      case 'KomponenDeclaration': return ['params', 'body'];
      case 'FungsiDeclaration': return ['params', 'body'];
      case 'GunakanStatement': return ['props', 'mountTarget'];
      case 'JalankanExpression': return ['arguments', 'withArgs'];
      case 'RantaiAksi': return ['first', 'chain'];
      case 'BinaryExpression': return ['left', 'right'];
      case 'UnaryExpression': return ['operand'];
      case 'MemberExpression': return ['object', 'property'];
      case 'CallExpression': return ['callee', 'arguments'];
      case 'PanggilNativeExpression': return ['callee', 'arguments'];
      case 'ObjectLiteral': return ['properties'];
      case 'ArrayLiteral': return ['elements'];
      case 'Selector': return ['attributes'];
      case 'PropertyNode': return ['value'];
      case 'AttributeNode': return ['value'];
      case 'Parameter': return ['defaultValue'];
      case 'SelfReference': return [];
      case 'DataDeclaration': return ['init'];
      case 'TetapDeclaration': return ['init'];
      case 'UbahDeclaration': return ['init'];
      case 'TurunanDeclaration': return ['init'];
      case 'ArahkanStatement': return ['url'];
      case 'FetchBranch': return ['action'];
      case 'FetchOption': return ['value'];
      default: return [];
    }
  }
  
  /**
   * Base Visitor: implementasi default yang melakukan traversing depth-first.
   * Visitor kustom bisa meng-extend ini dan meng-override metode tertentu.
   */
  function BaseVisitor() {}
  
  BaseVisitor.prototype.genericVisit = function (node) {
    var childKeys = getChildKeys(node.type);
    for (var i = 0; i < childKeys.length; i++) {
      var key = childKeys[i];
      var child = node[key];
      if (Array.isArray(child)) {
        for (var j = 0; j < child.length; j++) {
          if (child[j] && typeof child[j] === 'object' && child[j].type) {
            accept(child[j], this);
          }
        }
      } else if (child && typeof child === 'object' && child.type) {
        accept(child, this);
      }
    }
  };
  
  // Buat metode visit untuk setiap tipe node yang meneruskan ke genericVisit
  var nodeTypes = [
    'Program', 'BlockStatement',
    'DataDeclaration', 'TetapDeclaration', 'UbahDeclaration', 'TurunanDeclaration',
    'KomponenDeclaration', 'FungsiDeclaration',
    'BuatStatement', 'TampilkanStatement', 'SembunyikanStatement',
    'HapusStatement', 'KosongkanStatement', 'PerbaruiStatement',
    'KetikaStatement', 'SaatStatement', 'LifecycleStatement', 'SetelahStatement',
    'JikaStatement', 'UlangiStatement', 'SelamaStatement',
    'BerhentiStatement', 'LewatiStatement', 'KembalikanStatement',
    'SimpanStatement', 'TambahkanStatement', 'KurangiStatement', 'SisipkanStatement',
    'AmbilDomStatement', 'AmbilLuarStatement',
    'GunakanStatement', 'ArahkanStatement', 'MuatUlangStatement', 'KembaliStatement',
    'LangsungBlock', 'JalankanExpression', 'PanggilNativeExpression',
    'RantaiAksi',
    'Literal', 'Identifier', 'BinaryExpression', 'UnaryExpression',
    'MemberExpression', 'CallExpression', 'ObjectLiteral', 'ArrayLiteral',
    'Selector', 'PropertyNode', 'AttributeNode', 'Parameter',
    'FetchBranch', 'FetchOption',
    'SelfReference',
    'ErrorNode'
  ];
  
  nodeTypes.forEach(function (type) {
    BaseVisitor.prototype['visit' + type] = function (node) {
      return this.genericVisit(node);
    };
  });
  
  /**
   * CollectingVisitor: mengumpulkan semua node bertipe tertentu.
   */
  function CollectingVisitor(targetType) {
    this.targetType = targetType;
    this.results = [];
  }
  
  CollectingVisitor.prototype = Object.create(BaseVisitor.prototype);
  CollectingVisitor.prototype.constructor = CollectingVisitor;
  
  CollectingVisitor.prototype.genericVisit = function (node) {
    if (node.type === this.targetType) {
      this.results.push(node);
    }
    // Jangan traverse lagi — BaseVisitor.prototype.genericVisit sudah dipanggil
    // oleh metode visit* yang mewarisi dari BaseVisitor
    var childKeys = getChildKeys(node.type);
    for (var i = 0; i < childKeys.length; i++) {
      var key = childKeys[i];
      var child = node[key];
      if (Array.isArray(child)) {
        for (var j = 0; j < child.length; j++) {
          if (child[j] && typeof child[j] === 'object' && child[j].type) {
            accept(child[j], this);
          }
        }
      } else if (child && typeof child === 'object' && child.type) {
        accept(child, this);
      }
    }
  };
  
  /**
   * Format AST menjadi string yang bisa dibaca.
   */
  function formatAST(node, indent) {
    if (!indent) indent = 0;
    if (!node) return 'null';
  
    var pad = '';
    for (var i = 0; i < indent; i++) pad += '  ';
  
    if (typeof node !== 'object') return String(node);
  
    var result = pad + node.type;
    if (node.loc) {
      result += ' @' + node.loc.start.line + ':' + node.loc.start.column;
    }
  
    var childKeys = getChildKeys(node.type);
    var scalarProps = [];
  
    // Tampilkan properti skalar
    for (var key in node) {
      if (node.hasOwnProperty(key) &&
          key !== 'type' && key !== 'loc' && key !== 'docstring' &&
          childKeys.indexOf(key) === -1 &&
          typeof node[key] !== 'object') {
        scalarProps.push(key + ': ' + JSON.stringify(node[key]));
      }
    }
  
    if (scalarProps.length > 0) {
      result += ' (' + scalarProps.join(', ') + ')';
    }
  
    result += '\n';
  
    // Tampilkan anak-anak
    for (var c = 0; c < childKeys.length; c++) {
      var ckey = childKeys[c];
      var child = node[ckey];
      if (Array.isArray(child)) {
        for (var j = 0; j < child.length; j++) {
          result += formatAST(child[j], indent + 1);
        }
      } else if (child && typeof child === 'object') {
        result += formatAST(child, indent + 1);
      }
    }
  
    return result;
  }
  
  module.exports = {
    accept: accept,
    traverse: traverse,
    getChildKeys: getChildKeys,
    BaseVisitor: BaseVisitor,
    CollectingVisitor: CollectingVisitor,
    formatAST: formatAST,
    nodeTypes: nodeTypes
  };
  

  root.KarsaVisitor = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// PARSER (Tahap 2) — KarsaParser
// ============================================================
(function(root) {
  "use strict";

  // Registry modul internal parser
  var __mods = {};

  // Fungsi require internal yang resolve dari registry + globals
  function require(name) {
    // Cross-module references (ke modul lain di luar parser)
    if (name === "../utils/visitor" || name === "./visitor") return root.KarsaVisitor;
    if (name === "../lexer/karsa-lexer") return root.KarsaLexer;
    // Internal references — normalize path
    var resolved = name;
    if (name.indexOf("./") === 0) resolved = name.substring(2);
    if (name.indexOf("../parser/") === 0) resolved = name.substring(10);
    if (__mods[resolved]) return __mods[resolved];
    return {};
  }

  // --- parser/token-types.js ---
  (function() {
    var module = { exports: {} };
    /**
     * KARSA v0.3.1 — Konstanta Tipe Token
     *
     * Daftar lengkap tipe token yang dikenali Parser KARSA.
     * Konstanta ini wajib digunakan alih-alih string literal hard-coded.
     * Berdasarkan: RFC-PARSER-001 §2.3 dan KARSA-grammar-spec_v0.3.1 §14
     */
    
    // ─── Struktur ──────────────────────────────────────────────
    var TK_BUAT = 'TK_BUAT';
    var TK_TAMPILKAN = 'TK_TAMPILKAN';
    var TK_SEMBUNYIKAN = 'TK_SEMBUNYIKAN';
    var TK_HAPUS = 'TK_HAPUS';
    var TK_KOSONGKAN = 'TK_KOSONGKAN';
    var TK_PERBARUI = 'TK_PERBARUI';
    
    // ─── Event / Perilaku ──────────────────────────────────────
    var TK_KETIKA = 'TK_KETIKA';
    var TK_DIKLIK = 'TK_DIKLIK';
    var TK_DIKETIK = 'TK_DIKETIK';
    var TK_DISUBMIT = 'TK_DISUBMIT';
    var TK_DIMUAT = 'TK_DIMUAT';
    var TK_DIUBAH = 'TK_DIUBAH';
    var TK_DIFOKUS = 'TK_DIFOKUS';
    var TK_DITINGGAL = 'TK_DITINGGAL';
    var TK_DITEKAN = 'TK_DITEKAN';
    var TK_DILEPAS = 'TK_DILEPAS';
    var TK_DIARAHKAN = 'TK_DIARAHKAN';
    var TK_DITINGGAL_KURSOR = 'TK_DITINGGAL_KURSOR';
    var TK_DIGULIR = 'TK_DIGULIR';
    var TK_DIPASANG = 'TK_DIPASANG';
    var TK_DILEPAS_DARI_DOM = 'TK_DILEPAS_DARI_DOM';
    
    // ─── Alur ──────────────────────────────────────────────────
    var TK_LALU = 'TK_LALU';
    var TK_SETELAH = 'TK_SETELAH';
    
    // ─── Logika ────────────────────────────────────────────────
    var TK_JIKA = 'TK_JIKA';
    var TK_KALAU = 'TK_KALAU';
    var TK_JIKA_TIDAK = 'TK_JIKA_TIDAK';
    var TK_ULANGI = 'TK_ULANGI';
    var TK_SELAMA = 'TK_SELAMA';
    var TK_BERHENTI = 'TK_BERHENTI';
    var TK_LEWATI = 'TK_LEWATI';
    var TK_KEMBALIKAN = 'TK_KEMBALIKAN';
    
    // ─── Data / Reaktif ────────────────────────────────────────
    var TK_DATA = 'TK_DATA';
    var TK_TURUNAN = 'TK_TURUNAN';
    var TK_SIMPAN = 'TK_SIMPAN';
    var TK_AMBIL = 'TK_AMBIL';
    var TK_TETAP = 'TK_TETAP';
    var TK_UBAH = 'TK_UBAH';
    var TK_TAMBAHKAN = 'TK_TAMBAHKAN';
    var TK_SISIPKAN = 'TK_SISIPKAN';
    var TK_KURANGI = 'TK_KURANGI';
    var TK_SAAT = 'TK_SAAT';
    var TK_BERUBAH = 'TK_BERUBAH';
    
    // ─── Komponen / Fungsi ─────────────────────────────────────
    var TK_KOMPONEN = 'TK_KOMPONEN';
    var TK_GUNAKAN = 'TK_GUNAKAN';
    var TK_DENGAN = 'TK_DENGAN';
    var TK_DI = 'TK_DI';
    var TK_DARI = 'TK_DARI';
    var TK_KE = 'TK_KE';
    var TK_FUNGSI = 'TK_FUNGSI';
    var TK_JALANKAN = 'TK_JALANKAN';
    
    // ─── Jaringan / Navigasi ───────────────────────────────────
    var TK_BERHASIL = 'TK_BERHASIL';
    var TK_GAGAL = 'TK_GAGAL';
    var TK_SELALU = 'TK_SELALU';
    var TK_ARAHKAN = 'TK_ARAHKAN';
    var TK_MUAT_ULANG = 'TK_MUAT_ULANG';
    var TK_KEMBALI = 'TK_KEMBALI';
    
    // ─── Literal ───────────────────────────────────────────────
    var TK_BENAR = 'TK_BENAR';
    var TK_SALAH = 'TK_SALAH';
    var TK_KOSONG = 'TK_KOSONG';
    var TK_LITERAL_TEKS = 'TK_LITERAL_TEKS';
    var TK_LITERAL_ANGKA = 'TK_LITERAL_ANGKA';
    
    // ─── Operator Kata ─────────────────────────────────────────
    var TK_DAN = 'TK_DAN';
    var TK_ATAU = 'TK_ATAU';
    var TK_BUKAN = 'TK_BUKAN';
    var TK_SAMA_DENGAN = 'TK_SAMA_DENGAN';
    var TK_TIDAK_SAMA_DENGAN = 'TK_TIDAK_SAMA_DENGAN';
    var TK_LEBIH_DARI = 'TK_LEBIH_DARI';
    var TK_KURANG_DARI = 'TK_KURANG_DARI';
    var TK_PALING_SEDIKIT = 'TK_PALING_SEDIKIT';
    var TK_PALING_BANYAK = 'TK_PALING_BANYAK';
    var TK_ADA_DI = 'TK_ADA_DI';
    var TK_TIDAK_ADA_DI = 'TK_TIDAK_ADA_DI';
    
    // ─── Operator Aritmatika Kata ──────────────────────────────────────────────
    var TK_MOD = 'TK_MOD';
    var TK_PANGKAT = 'TK_PANGKAT';
    
    // ─── Operator Simbol ───────────────────────────────────────
    var TK_PANAH = 'TK_PANAH';
    var TK_TITIK_DUA = 'TK_TITIK_DUA';
    var TK_KOMA = 'TK_KOMA';
    var TK_TITIK = 'TK_TITIK';
    var TK_PLUS = 'TK_PLUS';
    var TK_MINUS = 'TK_MINUS';
    var TK_BINTANG = 'TK_BINTANG';
    var TK_GARIS_MIRING = 'TK_GARIS_MIRING';
    var TK_TANDA_SAMA = 'TK_TANDA_SAMA';
    
    // ─── Kurung ────────────────────────────────────────────────
    var TK_KURUNG_BUKA = 'TK_KURUNG_BUKA';
    var TK_KURUNG_TUTUP = 'TK_KURUNG_TUTUP';
    var TK_KURAWAL_BUKA = 'TK_KURAWAL_BUKA';
    var TK_KURAWAL_TUTUP = 'TK_KURAWAL_TUTUP';
    var TK_KURUNG_SIKU_BUKA = 'TK_KURUNG_SIKU_BUKA';
    var TK_KURUNG_SIKU_TUTUP = 'TK_KURUNG_SIKU_TUTUP';
    
    // ─── Selektor ──────────────────────────────────────────────
    var TK_ID = 'TK_ID';
    var TK_CLASS = 'TK_CLASS';
    var TK_ATRIBUT = 'TK_ATRIBUT';
    
    // ─── Identifier ────────────────────────────────────────────
    var TK_IDENTIFIER = 'TK_IDENTIFIER';
    
    // ─── Komentar ──────────────────────────────────────────────
    var TK_KOMENTAR_BIASA = 'TK_KOMENTAR_BIASA';
    var TK_KOMENTAR_DOC = 'TK_KOMENTAR_DOC';
    
    // ─── Interop / Node ────────────────────────────────────────
    var TK_LANGSUNG = 'TK_LANGSUNG';
    var TK_BLOK_LANGSUNG = 'TK_BLOK_LANGSUNG';
    var TK_FRAGMEN = 'TK_FRAGMEN';
    
    // ─── Kontrol Whitespace & EOF ──────────────────────────────
    var TK_INDENT = 'TK_INDENT';
    var TK_DEDENT = 'TK_DEDENT';
    var TK_BARIS_BARU = 'TK_BARIS_BARU';
    var TK_EOF = 'TK_EOF';
    
    // ─── Event Token Set ───────────────────────────────────────
    var EVENT_TOKENS = [
      TK_DIKLIK, TK_DIKETIK, TK_DISUBMIT, TK_DIMUAT,
      TK_DIUBAH, TK_DIFOKUS, TK_DITINGGAL, TK_DITEKAN,
      TK_DILEPAS, TK_DIARAHKAN, TK_DITINGGAL_KURSOR,
      TK_DIGULIR, TK_DIPASANG, TK_DILEPAS_DARI_DOM
    ];
    
    // ─── Keyword Statement Dispatch Map ────────────────────────
    var STATEMENT_KEYWORD_TOKENS = [
      TK_BUAT, TK_TAMPILKAN, TK_SEMBUNYIKAN, TK_HAPUS,
      TK_KOSONGKAN, TK_PERBARUI, TK_KETIKA, TK_SAAT,
      TK_SETELAH, TK_JIKA, TK_ULANGI, TK_SELAMA,
      TK_BERHENTI, TK_LEWATI, TK_KEMBALIKAN, TK_DATA,
      TK_TETAP, TK_UBAH, TK_TURUNAN, TK_SIMPAN,
      TK_TAMBAHKAN, TK_KURANGI, TK_SISIPKAN, TK_AMBIL,
      TK_KOMPONEN, TK_GUNAKAN, TK_FUNGSI, TK_JALANKAN,
      TK_ARAHKAN, TK_MUAT_ULANG, TK_KEMBALI, TK_LANGSUNG
    ];
    
    // ─── Sinkronisasi Kontekstual ──────────────────────────────
    var SYNC_STATEMENT_TOKENS = STATEMENT_KEYWORD_TOKENS.slice();
    
    // Ekspresi infix operator tokens
    var INFIX_OPERATOR_TOKENS = [
      TK_PLUS, TK_MINUS, TK_BINTANG, TK_GARIS_MIRING,
      TK_MOD, TK_PANGKAT,
      TK_DAN, TK_ATAU,
      TK_SAMA_DENGAN, TK_TIDAK_SAMA_DENGAN,
      TK_LEBIH_DARI, TK_KURANG_DARI,
      TK_PALING_SEDIKIT, TK_PALING_BANYAK,
      TK_ADA_DI, TK_TIDAK_ADA_DI
    ];
    
    module.exports = {
      TK_BUAT, TK_TAMPILKAN, TK_SEMBUNYIKAN, TK_HAPUS, TK_KOSONGKAN, TK_PERBARUI,
      TK_KETIKA, TK_DIKLIK, TK_DIKETIK, TK_DISUBMIT, TK_DIMUAT, TK_DIUBAH,
      TK_DIFOKUS, TK_DITINGGAL, TK_DITEKAN, TK_DILEPAS, TK_DIARAHKAN,
      TK_DITINGGAL_KURSOR, TK_DIGULIR, TK_DIPASANG, TK_DILEPAS_DARI_DOM,
      TK_LALU, TK_SETELAH,
      TK_JIKA, TK_KALAU, TK_JIKA_TIDAK, TK_ULANGI, TK_SELAMA,
      TK_BERHENTI, TK_LEWATI, TK_KEMBALIKAN,
      TK_DATA, TK_TURUNAN, TK_SIMPAN, TK_AMBIL, TK_TETAP, TK_UBAH,
      TK_TAMBAHKAN, TK_SISIPKAN, TK_KURANGI, TK_SAAT, TK_BERUBAH,
      TK_KOMPONEN, TK_GUNAKAN, TK_DENGAN, TK_DI, TK_DARI, TK_KE,
      TK_FUNGSI, TK_JALANKAN,
      TK_BERHASIL, TK_GAGAL, TK_SELALU, TK_ARAHKAN, TK_MUAT_ULANG, TK_KEMBALI,
      TK_BENAR, TK_SALAH, TK_KOSONG, TK_LITERAL_TEKS, TK_LITERAL_ANGKA,
      TK_DAN, TK_ATAU, TK_BUKAN, TK_SAMA_DENGAN, TK_TIDAK_SAMA_DENGAN,
      TK_LEBIH_DARI, TK_KURANG_DARI, TK_PALING_SEDIKIT, TK_PALING_BANYAK,
      TK_ADA_DI, TK_TIDAK_ADA_DI,
      TK_MOD, TK_PANGKAT,
      TK_PANAH, TK_TITIK_DUA, TK_KOMA, TK_TITIK, TK_PLUS, TK_MINUS,
      TK_BINTANG, TK_GARIS_MIRING, TK_TANDA_SAMA,
      TK_KURUNG_BUKA, TK_KURUNG_TUTUP, TK_KURAWAL_BUKA, TK_KURAWAL_TUTUP,
      TK_KURUNG_SIKU_BUKA, TK_KURUNG_SIKU_TUTUP,
      TK_ID, TK_CLASS, TK_ATRIBUT, TK_IDENTIFIER,
      TK_KOMENTAR_BIASA, TK_KOMENTAR_DOC,
      TK_LANGSUNG, TK_BLOK_LANGSUNG, TK_FRAGMEN,
      TK_INDENT, TK_DEDENT, TK_BARIS_BARU, TK_EOF,
      EVENT_TOKENS, STATEMENT_KEYWORD_TOKENS, SYNC_STATEMENT_TOKENS,
      INFIX_OPERATOR_TOKENS
    };
    
    __mods["token-types"] = module.exports;
  })();

  // --- parser/binding-powers.js ---
  (function() {
    var module = { exports: {} };
    /**
     * KARSA v0.3.1 — Tabel Binding Power Pratt Parser
     *
     * Spesifikasi binding power berdasarkan RFC-PARSER-001 §6.
     * Semakin tinggi bp, semakin kuat ikatannya (dievaluasi lebih dulu).
     *
     * Format: { left: number, right: number }
     * - Prefix operator: hanya right (left tidak dipakai)
     * - Infix operator: left = bp sisi kiri, right = bp sisi kanan
     * - Asosiatif kiri: left > right
     */
    
    var TT = require('./token-types');
    
    var BINDING_POWERS = {};
    
    // ─── Level 1: atau (disjungsi logika) ──────────────────────
    BINDING_POWERS[TT.TK_ATAU] = { left: 2, right: 1 };
    
    // ─── Level 2: dan (konjungsi logika) ───────────────────────
    BINDING_POWERS[TT.TK_DAN] = { left: 4, right: 3 };
    
    // ─── Level 4: perbandingan ─────────────────────────────────
    BINDING_POWERS[TT.TK_SAMA_DENGAN] = { left: 7, right: 6 };
    BINDING_POWERS[TT.TK_TIDAK_SAMA_DENGAN] = { left: 7, right: 6 };
    BINDING_POWERS[TT.TK_LEBIH_DARI] = { left: 7, right: 6 };
    BINDING_POWERS[TT.TK_KURANG_DARI] = { left: 7, right: 6 };
    BINDING_POWERS[TT.TK_PALING_SEDIKIT] = { left: 7, right: 6 };
    BINDING_POWERS[TT.TK_PALING_BANYAK] = { left: 7, right: 6 };
    BINDING_POWERS[TT.TK_ADA_DI] = { left: 7, right: 6 };
    BINDING_POWERS[TT.TK_TIDAK_ADA_DI] = { left: 7, right: 6 };
    
    // ─── Level 5: additive ─────────────────────────────────────
    BINDING_POWERS[TT.TK_PLUS] = { left: 9, right: 8 };
    BINDING_POWERS[TT.TK_MINUS] = { left: 9, right: 8 };
    
    // ─── Level 6: multiplicative ───────────────────────────────
    BINDING_POWERS[TT.TK_BINTANG] = { left: 11, right: 10 };
    BINDING_POWERS[TT.TK_GARIS_MIRING] = { left: 11, right: 10 };
    BINDING_POWERS[TT.TK_MOD] = { left: 11, right: 10 };
    
    // Level 6b: exponentiation (right-associative, binds tighter than multiplicative)
    BINDING_POWERS[TT.TK_PANGKAT] = { left: 13, right: 12 };
    
    // ─── Level 7: unary prefix minus ───────────────────────────
    // TK_MINUS sebagai prefix: right = 12 (dipakai di parsePrefix)
    
    // ─── Level 8: postfix (member access, function call) ───────
    BINDING_POWERS[TT.TK_TITIK] = { left: 15, right: 14 };
    // TK_KURUNG_BUKA sebagai postfix call: { left: 15, right: 14 }
    
    // ─── Level 9: grouping prefix ──────────────────────────────
    // TK_KURUNG_BUKA sebagai prefix: right = 16 (dipakai di parsePrefix)
    
    // ─── Level 3: bukan (unary prefix) ─────────────────────────
    // TK_BUKAN sebagai prefix: right = 5
    
    /**
     * Prefix binding powers (hanya sisi kanan).
     */
    var PREFIX_BP = {};
    PREFIX_BP[TT.TK_BUKAN] = 5;
    PREFIX_BP[TT.TK_MINUS] = 12;     // unary minus
    PREFIX_BP[TT.TK_KURUNG_BUKA] = 16; // grouping
    
    /**
     * Mendapatkan binding power infix/postfix untuk token.
     * @param {string} tokenType - Tipe token
     * @returns {object|null} { left, right } atau null
     */
    function getInfixBp(tokenType) {
      return BINDING_POWERS[tokenType] || null;
    }
    
    /**
     * Mendapatkan binding power prefix untuk token.
     * @param {string} tokenType - Tipe token
     * @returns {number|null} right bp atau null
     */
    function getPrefixBp(tokenType) {
      return PREFIX_BP[tokenType] || null;
    }
    
    /**
     * Memeriksa apakah token adalah infix operator.
     */
    function isInfixOperator(tokenType) {
      return BINDING_POWERS.hasOwnProperty(tokenType);
    }
    
    /**
     * Memeriksa apakah token adalah prefix operator.
     */
    function isPrefixOperator(tokenType) {
      return PREFIX_BP.hasOwnProperty(tokenType);
    }
    
    /**
     * Mendapatkan string operator dari token KARSA.
     * Digunakan untuk mengisi field `operator` pada BinaryExpression.
     */
    function operatorFromToken(tokenType, tokenNilai) {
      switch (tokenType) {
        case TT.TK_PLUS: return '+';
        case TT.TK_MINUS: return '-';
        case TT.TK_BINTANG: return '*';
        case TT.TK_GARIS_MIRING: return '/';
        case TT.TK_MOD: return 'mod';
        case TT.TK_PANGKAT: return 'pangkat';
        case TT.TK_DAN: return 'dan';
        case TT.TK_ATAU: return 'atau';
        case TT.TK_SAMA_DENGAN: return 'sama dengan';
        case TT.TK_TIDAK_SAMA_DENGAN: return 'tidak sama dengan';
        case TT.TK_LEBIH_DARI: return 'lebih dari';
        case TT.TK_KURANG_DARI: return 'kurang dari';
        case TT.TK_PALING_SEDIKIT: return 'paling sedikit';
        case TT.TK_PALING_BANYAK: return 'paling banyak';
        case TT.TK_ADA_DI: return 'ada di';
        case TT.TK_TIDAK_ADA_DI: return 'tidak ada di';
        default: return tokenNilai;
      }
    }
    
    module.exports = {
      BINDING_POWERS: BINDING_POWERS,
      PREFIX_BP: PREFIX_BP,
      getInfixBp: getInfixBp,
      getPrefixBp: getPrefixBp,
      isInfixOperator: isInfixOperator,
      isPrefixOperator: isPrefixOperator,
      operatorFromToken: operatorFromToken
    };
    
    __mods["binding-powers"] = module.exports;
  })();

  // --- parser/error-codes.js ---
  (function() {
    var module = { exports: {} };
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
    var W4101 = 'W4101'; // Simbol dideklarasikan tetapi tidak pernah digunakan
    var W4102 = 'W4102'; // Simbol ditulis tetapi tidak pernah dibaca
    var E4101 = 'E4101'; // Target tidak dapat ditulis berdasarkan metadata isWritable
    var W4103 = 'W4103'; // Data reaktif dimutasi tetapi tidak pernah dibaca
    var W4104 = 'W4104'; // Watcher target bukan data reaktif menurut analyzer
    var E4201 = 'E4201'; // Dependency cycle pada data turunan
    
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
    var W0000 = 'W0000'; // System warning (fallback untuk warning tanpa kode spesifik)
    
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
    ERROR_MESSAGES[W4101] = 'Simbol "{name}" dideklarasikan tetapi tidak pernah digunakan';
    ERROR_MESSAGES[W4102] = 'Simbol "{name}" ditulis tetapi tidak pernah dibaca';
    ERROR_MESSAGES[E4101] = 'Target tidak dapat ditulis';
    ERROR_MESSAGES[W4103] = 'Data reaktif dimutasi tetapi tidak pernah dibaca';
    ERROR_MESSAGES[W4104] = 'Watcher target bukan data reaktif';
    ERROR_MESSAGES[E4201] = 'Dependency cycle pada data turunan';
    
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
    ERROR_MESSAGES[W0000] = 'Peringatan sistem';
    
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
    ERROR_SUGGESTIONS[W4101] = 'Hapus deklarasi jika tidak diperlukan, atau gunakan simbol tersebut.';
    ERROR_SUGGESTIONS[W4102] = 'Pastikan nilai yang ditulis benar-benar dibaca, atau hapus penulisan yang tidak perlu.';
    ERROR_SUGGESTIONS[E4101] = 'Gunakan target yang writable atau ubah deklarasi menjadi data/ubah sesuai kebutuhan.';
    ERROR_SUGGESTIONS[W4103] = 'Jika state reaktif tidak pernah dibaca, pertimbangkan ubah biasa atau hapus mutasinya.';
    ERROR_SUGGESTIONS[W4104] = 'Gunakan data/turunan reaktif sebagai target watcher.';
    ERROR_SUGGESTIONS[E4201] = 'Ubah salah satu ekspresi turunan agar tidak saling bergantung secara melingkar.';
    
    // -- Compiler --
    ERROR_SUGGESTIONS[E5001] = 'Periksa apakah node type sudah didukung oleh compiler';
    ERROR_SUGGESTIONS[E5002] = 'Sederhanakan ekspresi atau gunakan "langsung:" untuk JS interop';
    ERROR_SUGGESTIONS[E5003] = 'Periksa format selector CSS';
    
    // -- Runtime --
    ERROR_SUGGESTIONS[E6001] = '"berhenti" hanya valid di dalam loop atau event handler';
    ERROR_SUGGESTIONS[E6002] = 'Gunakan "lewati" hanya di dalam "ulangi" atau "selama"';
    ERROR_SUGGESTIONS[E6003] = 'Gunakan "kembalikan" hanya di dalam fungsi atau komponen';
    ERROR_SUGGESTIONS[E6004] = 'Lihat detail error pada tahap yang gagal';
    
    // -- System --
    ERROR_SUGGESTIONS[E0000] = 'Periksa stack trace atau laporkan sebagai bug';
    ERROR_SUGGESTIONS[W0000] = 'Periksa detail peringatan untuk informasi lebih lanjut';
    
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
      W4101: W4101, W4102: W4102, E4101: E4101, W4103: W4103, W4104: W4104, E4201: E4201,
    
      // Compiler errors
      E5001: E5001, E5002: E5002, E5003: E5003,
      W5001: W5001, W5002: W5002,
    
      // Runtime errors
      E6001: E6001, E6002: E6002, E6003: E6003, E6004: E6004,
    
      // System errors
      E0000: E0000,
      W0000: W0000,
    
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
    
    __mods["error-codes"] = module.exports;
  })();

  // --- parser/ast-factory.js ---
  (function() {
    var module = { exports: {} };
    /**
     * KARSA v0.3.1 — AST Node Factory
     *
     * Fungsi pembuatan node AST yang menjamin:
     * - Setiap node memiliki `type` dan `loc` (TIDAK PERNAH null/undefined)
     * - `loc` mengikuti format SourceLocation { start: Position, end: Position }
     * - Properti anak berupa array, bukan null
     * - ErrorNode digunakan sebagai pengganti null pada posisi anak
     * - Jika loc tidak disediakan, digunakan UNKNOWN_LOC (0:0-0:0)
     *
     * Berdasarkan: AST Specification v1.0.0
     */
    
    /**
     * Lokasi default untuk node yang tidak memiliki informasi posisi.
     * Digunakan sebagai fallback ketika parser tidak menyediakan loc.
     */
    var UNKNOWN_LOC = {
      start: { line: 0, column: 0 },
      end: { line: 0, column: 0 }
    };
    
    /**
     * Memastikan loc selalu valid. Jika loc null/undefined, kembalikan UNKNOWN_LOC.
     * @param {object|null|undefined} loc
     * @returns {object} SourceLocation yang valid
     */
    function ensureLoc(loc) {
      if (!loc) return UNKNOWN_LOC;
      if (!loc.start) return UNKNOWN_LOC;
      return loc;
    }
    
    /**
     * Membuat SourceLocation dari token atau dua posisi.
     * @param {object} start - { line, column } atau Token
     * @param {object} end - { line, column } atau Token
     * @returns {object} SourceLocation
     */
    function buatLoc(start, end) {
      // Jika keduanya tidak ada, kembalikan UNKNOWN_LOC
      if (!start && !end) return UNKNOWN_LOC;
    
      var s = start;
      var e = end;
      // Jika start adalah token, ambil posisinya
      if (start && start.baris !== undefined) {
        s = { line: start.baris, column: start.kolom };
      }
      if (end && end.baris !== undefined) {
        e = { line: end.baris, column: end.kolom };
      }
      // Jika end tidak diberikan, gunakan start
      if (!e) {
        e = s;
      }
      // Jika start masih tidak valid, kembalikan UNKNOWN_LOC
      if (!s) return UNKNOWN_LOC;
      return {
        start: { line: s.line, column: s.column },
        end: { line: e.line, column: e.column }
      };
    }
    
    /**
     * Membuat lokasi dari token awal dan token akhir.
     */
    function locFromTokens(startToken, endToken) {
      return buatLoc(
        { line: startToken.baris, column: startToken.kolom },
        { line: endToken.baris, column: endToken.kolom + (endToken.nilai ? endToken.nilai.length : 1) }
      );
    }
    
    /**
     * Menggabungkan dua SourceLocation, mengembalikan rentang terluas.
     */
    function gabungLoc(locA, locB) {
      if (!locA) return locB;
      if (!locB) return locA;
      return {
        start: {
          line: Math.min(locA.start.line, locB.start.line),
          column: locA.start.line <= locB.start.line ? locA.start.column : locB.start.column
        },
        end: {
          line: Math.max(locA.end.line, locB.end.line),
          column: locA.end.line >= locB.end.line ? locA.end.column : locB.end.column
        }
      };
    }
    
    // ─── Root Node ─────────────────────────────────────────────
    
    function buatProgramNode(body, loc, source) {
      return {
        type: 'Program',
        loc: ensureLoc(loc) || buatLoc({ line: 1, column: 1 }, { line: 1, column: 1 }),
        body: body || [],
        source: source || undefined
      };
    }
    
    // ─── Declaration Nodes ─────────────────────────────────────
    
    function buatDataDeclaration(name, typeHint, init, loc, docstring) {
      return {
        type: 'DataDeclaration',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        name: name,
        typeHint: typeHint || undefined,
        init: init
      };
    }
    
    function buatTetapDeclaration(name, typeHint, init, loc, docstring) {
      return {
        type: 'TetapDeclaration',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        name: name,
        typeHint: typeHint || undefined,
        init: init
      };
    }
    
    function buatUbahDeclaration(name, typeHint, init, loc, docstring) {
      return {
        type: 'UbahDeclaration',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        name: name,
        typeHint: typeHint || undefined,
        init: init
      };
    }
    
    function buatTurunanDeclaration(name, typeHint, init, loc, docstring) {
      return {
        type: 'TurunanDeclaration',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        name: name,
        typeHint: typeHint || undefined,
        init: init
      };
    }
    
    function buatKomponenDeclaration(name, params, body, loc, docstring, returnType) {
      return {
        type: 'KomponenDeclaration',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        name: name,
        params: params || [],
        returnType: returnType || undefined,
        body: body
      };
    }
    
    function buatFungsiDeclaration(name, params, body, loc, docstring, returnType) {
      return {
        type: 'FungsiDeclaration',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        name: name,
        params: params || [],
        returnType: returnType || undefined,
        body: body
      };
    }
    
    // ─── Statement Nodes ───────────────────────────────────────
    
    function buatBlockStatement(body, loc) {
      return {
        type: 'BlockStatement',
        loc: ensureLoc(loc),
        body: body || []
      };
    }
    
    function buatBuatStatement(selector, loc, docstring, properties, body, action) {
      var node = {
        type: 'BuatStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        selector: selector
      };
      if (properties && properties.length > 0) {
        node.properties = properties;
      }
      if (body) {
        node.body = body;
      }
      if (action) {
        node.action = action;
      }
      return node;
    }
    
    function buatTampilkanStatement(target, loc, docstring, mountTarget, mode, messageKind) {
      var node = {
        type: 'TampilkanStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        target: target
      };
      if (mountTarget) node.mountTarget = mountTarget;
      if (mode) node.mode = mode;
      if (messageKind) node.messageKind = messageKind;
      return node;
    }
    
    function buatSembunyikanStatement(target, loc, docstring) {
      return {
        type: 'SembunyikanStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        target: target
      };
    }
    
    function buatHapusStatement(target, loc, docstring) {
      return {
        type: 'HapusStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        target: target
      };
    }
    
    function buatHapusDariStatement(item, fromArray, loc, docstring) {
      return {
        type: 'HapusDariStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        item: item,
        fromArray: fromArray
      };
    }
    
    function buatKosongkanStatement(target, loc, docstring) {
      return {
        type: 'KosongkanStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        target: target
      };
    }
    
    function buatPerbaruiStatement(property, target, value, loc, docstring) {
      return {
        type: 'PerbaruiStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        property: property,
        target: target,
        value: value
      };
    }
    
    function buatKetikaStatement(event, loc, docstring, target, body, action) {
      var node = {
        type: 'KetikaStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        event: event
      };
      if (target) node.target = target;
      if (body) node.body = body;
      if (action) node.action = action;
      return node;
    }
    
    function buatSaatStatement(target, body, loc, docstring) {
      return {
        type: 'SaatStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        target: target,
        body: body
      };
    }
    
    function buatLifecycleStatement(kind, body, loc, docstring) {
      return {
        type: 'LifecycleStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        kind: kind,
        body: body
      };
    }
    
    function buatSetelahStatement(target, loc, docstring, body, action) {
      var node = {
        type: 'SetelahStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        target: target
      };
      if (body) node.body = body;
      if (action) node.action = action;
      return node;
    }
    
    function buatJikaStatement(condition, consequent, loc, docstring, alternate) {
      var node = {
        type: 'JikaStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        condition: condition,
        consequent: consequent
      };
      if (alternate) node.alternate = alternate;
      return node;
    }
    
    function buatUlangiStatement(iteratorName, source, body, kind, loc, docstring, rangeEnd) {
      var node = {
        type: 'UlangiStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        iteratorName: iteratorName,
        source: source,
        body: body,
        kind: kind
      };
      if (rangeEnd !== undefined && rangeEnd !== null) node.rangeEnd = rangeEnd;
      return node;
    }
    
    function buatSelamaStatement(condition, body, loc, docstring) {
      return {
        type: 'SelamaStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        condition: condition,
        body: body
      };
    }
    
    function buatBerhentiStatement(loc) {
      return { type: 'BerhentiStatement', loc: ensureLoc(loc) };
    }
    
    function buatLewatiStatement(loc) {
      return { type: 'LewatiStatement', loc: ensureLoc(loc) };
    }
    
    function buatKembalikanStatement(loc, value) {
      var node = { type: 'KembalikanStatement', loc: ensureLoc(loc) };
      if (value) node.value = value;
      return node;
    }
    
    function buatSimpanStatement(value, target, kind, loc, docstring) {
      return {
        type: 'SimpanStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        value: value,
        target: target,
        kind: kind
      };
    }
    
    function buatTambahkanStatement(value, target, loc, docstring) {
      return {
        type: 'TambahkanStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        value: value,
        target: target
      };
    }
    
    function buatKurangiStatement(target, loc, docstring, value) {
      var node = {
        type: 'KurangiStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        target: target
      };
      if (value) node.value = value;
      return node;
    }
    
    function buatSisipkanStatement(value, target, loc, docstring) {
      return {
        type: 'SisipkanStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        value: value,
        target: target
      };
    }
    
    function buatAmbilDomStatement(kind, source, target, loc, docstring, attributeName) {
      var node = {
        type: 'AmbilDomStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        kind: kind,
        source: source,
        target: target
      };
      if (attributeName) node.attributeName = attributeName;
      return node;
    }
    
    function buatAmbilLuarStatement(url, branches, loc, docstring, options) {
      var node = {
        type: 'AmbilLuarStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        url: url,
        branches: branches || []
      };
      if (options && options.length > 0) node.options = options;
      return node;
    }
    
    function buatGunakanStatement(componentName, loc, docstring, props, mountTarget) {
      var node = {
        type: 'GunakanStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        componentName: componentName
      };
      if (props && props.length > 0) node.props = props;
      if (mountTarget) node.mountTarget = mountTarget;
      return node;
    }
    
    function buatArahkanStatement(url, loc, docstring) {
      return {
        type: 'ArahkanStatement',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        url: url
      };
    }
    
    function buatMuatUlangStatement(loc) {
      return { type: 'MuatUlangStatement', loc: ensureLoc(loc) };
    }
    
    function buatKembaliStatement(loc) {
      return { type: 'KembaliStatement', loc: ensureLoc(loc) };
    }
    
    function buatLangsungBlock(content, loc) {
      return {
        type: 'LangsungBlock',
        loc: ensureLoc(loc),
        content: content
      };
    }
    
    function buatJalankanExpression(callee, kind, loc, docstring, arguments_, withArgs) {
      var node = {
        type: 'JalankanExpression',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        callee: callee,
        kind: kind
      };
      if (arguments_ && arguments_.length > 0) node.arguments = arguments_;
      if (withArgs && withArgs.length > 0) node.withArgs = withArgs;
      return node;
    }
    
    function buatPanggilNativeExpression(callee, arguments_, loc, docstring) {
      return {
        type: 'PanggilNativeExpression',
        loc: ensureLoc(loc),
        docstring: docstring || undefined,
        callee: callee,
        arguments: arguments_ || []
      };
    }
    
    function buatRantaiAksi(first, chain, loc) {
      return {
        type: 'RantaiAksi',
        loc: ensureLoc(loc),
        first: first,
        chain: chain
      };
    }
    
    // ─── Expression Nodes ──────────────────────────────────────
    
    function buatLiteral(value, kind, loc) {
      return {
        type: 'Literal',
        loc: ensureLoc(loc),
        value: value,
        kind: kind
      };
    }
    
    function buatIdentifier(name, loc) {
      return {
        type: 'Identifier',
        loc: ensureLoc(loc),
        name: name
      };
    }
    
    function buatBinaryExpression(operator, left, right, loc) {
      return {
        type: 'BinaryExpression',
        loc: ensureLoc(loc),
        operator: operator,
        left: left,
        right: right
      };
    }
    
    function buatUnaryExpression(operator, operand, loc, prefix) {
      return {
        type: 'UnaryExpression',
        loc: ensureLoc(loc),
        operator: operator,
        operand: operand,
        prefix: prefix !== false
      };
    }
    
    function buatMemberExpression(object, property, loc) {
      return {
        type: 'MemberExpression',
        loc: ensureLoc(loc),
        object: object,
        property: property
      };
    }
    
    function buatCallExpression(callee, arguments_, loc) {
      return {
        type: 'CallExpression',
        loc: ensureLoc(loc),
        callee: callee,
        arguments: arguments_ || []
      };
    }
    
    function buatObjectLiteral(properties, loc) {
      return {
        type: 'ObjectLiteral',
        loc: ensureLoc(loc),
        properties: properties || []
      };
    }
    
    function buatArrayLiteral(elements, loc) {
      return {
        type: 'ArrayLiteral',
        loc: ensureLoc(loc),
        elements: elements || []
      };
    }
    
    // ─── UI & Selector Nodes ───────────────────────────────────
    
    function buatSelector(tag, loc, id, classes, attributes) {
      return {
        type: 'Selector',
        loc: ensureLoc(loc),
        tag: tag,
        id: id || undefined,
        classes: classes || [],
        attributes: attributes || []
      };
    }
    
    function buatPropertyNode(key, value, loc, shorthand) {
      return {
        type: 'PropertyNode',
        loc: ensureLoc(loc),
        key: key,
        value: value,
        shorthand: !!shorthand
      };
    }
    
    function buatAttributeNode(key, value, loc) {
      return {
        type: 'AttributeNode',
        loc: ensureLoc(loc),
        key: key,
        value: value
      };
    }
    
    // ─── Special Nodes ─────────────────────────────────────────
    
    function buatErrorNode(code, message, loc, originalToken) {
      var node = {
        type: 'ErrorNode',
        loc: ensureLoc(loc),
        code: code,
        kode: code,
        message: message,
        pesan: message
      };
      if (originalToken) node.originalToken = originalToken;
      return node;
    }
    
    // ─── Shared Types ──────────────────────────────────────────
    
    function buatParameter(name, loc, typeHint, defaultValue) {
      var param = {
        type: 'Parameter',
        loc: ensureLoc(loc),
        name: name
      };
      if (typeHint) param.typeHint = typeHint;
      if (defaultValue) param.defaultValue = defaultValue;
      return param;
    }
    
    function buatFetchBranch(kind, action, loc) {
      return {
        type: 'FetchBranch',
        loc: ensureLoc(loc),
        kind: kind,
        action: action
      };
    }
    
    function buatFetchOption(key, value, loc) {
      return {
        type: 'FetchOption',
        key: key,
        value: value,
        loc: ensureLoc(loc)
      };
    }
    
    module.exports = {
      UNKNOWN_LOC: UNKNOWN_LOC,
      ensureLoc: ensureLoc,
      buatLoc: buatLoc,
      locFromTokens: locFromTokens,
      gabungLoc: gabungLoc,
      buatProgramNode: buatProgramNode,
      buatDataDeclaration: buatDataDeclaration,
      buatTetapDeclaration: buatTetapDeclaration,
      buatUbahDeclaration: buatUbahDeclaration,
      buatTurunanDeclaration: buatTurunanDeclaration,
      buatKomponenDeclaration: buatKomponenDeclaration,
      buatFungsiDeclaration: buatFungsiDeclaration,
      buatBlockStatement: buatBlockStatement,
      buatBuatStatement: buatBuatStatement,
      buatTampilkanStatement: buatTampilkanStatement,
      buatSembunyikanStatement: buatSembunyikanStatement,
      buatHapusStatement: buatHapusStatement,
      buatHapusDariStatement: buatHapusDariStatement,
      buatKosongkanStatement: buatKosongkanStatement,
      buatPerbaruiStatement: buatPerbaruiStatement,
      buatKetikaStatement: buatKetikaStatement,
      buatSaatStatement: buatSaatStatement,
      buatLifecycleStatement: buatLifecycleStatement,
      buatSetelahStatement: buatSetelahStatement,
      buatJikaStatement: buatJikaStatement,
      buatUlangiStatement: buatUlangiStatement,
      buatSelamaStatement: buatSelamaStatement,
      buatBerhentiStatement: buatBerhentiStatement,
      buatLewatiStatement: buatLewatiStatement,
      buatKembalikanStatement: buatKembalikanStatement,
      buatSimpanStatement: buatSimpanStatement,
      buatTambahkanStatement: buatTambahkanStatement,
      buatKurangiStatement: buatKurangiStatement,
      buatSisipkanStatement: buatSisipkanStatement,
      buatAmbilDomStatement: buatAmbilDomStatement,
      buatAmbilLuarStatement: buatAmbilLuarStatement,
      buatGunakanStatement: buatGunakanStatement,
      buatArahkanStatement: buatArahkanStatement,
      buatMuatUlangStatement: buatMuatUlangStatement,
      buatKembaliStatement: buatKembaliStatement,
      buatLangsungBlock: buatLangsungBlock,
      buatJalankanExpression: buatJalankanExpression,
      buatPanggilNativeExpression: buatPanggilNativeExpression,
      buatRantaiAksi: buatRantaiAksi,
      buatLiteral: buatLiteral,
      buatIdentifier: buatIdentifier,
      buatBinaryExpression: buatBinaryExpression,
      buatUnaryExpression: buatUnaryExpression,
      buatMemberExpression: buatMemberExpression,
      buatCallExpression: buatCallExpression,
      buatObjectLiteral: buatObjectLiteral,
      buatArrayLiteral: buatArrayLiteral,
      buatSelector: buatSelector,
      buatPropertyNode: buatPropertyNode,
      buatAttributeNode: buatAttributeNode,
      buatErrorNode: buatErrorNode,
      buatParameter: buatParameter,
      buatFetchBranch: buatFetchBranch,
      buatFetchOption: buatFetchOption
    };
    
    __mods["ast-factory"] = module.exports;
  })();

  // --- parser/selector-parser.js ---
  (function() {
    var module = { exports: {} };
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
    
    __mods["selector-parser"] = module.exports;
  })();

  // --- parser/expression-parser.js ---
  (function() {
    var module = { exports: {} };
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
    
    var _stmtParser = null;
    function getStmtParser() {
      if (!_stmtParser) _stmtParser = require('./statement-parser');
      return _stmtParser;
    }
    
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
        var stmtParser = getStmtParser();
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
    
    __mods["expression-parser"] = module.exports;
  })();

  // --- parser/statement-parser.js ---
  (function() {
    var module = { exports: {} };
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
     * parseHapusStatement:
     *   "hapus" target_elemen                            (DOM removal)
     * | "hapus" item "dari" IDENTIFIER                    (array item removal)
     */
    function parseHapusStatement(parser) {
      var startToken = parser.advance();
      var docstring = startToken.docstring;
    
      // Parse the first target/item
      var item = Sel.parseTargetElemen(parser);
    
      // Check if followed by "dari" → array item removal syntax
      if (parser.check(TT.TK_DARI)) {
        parser.advance(); // consume "dari"
        var arrayToken = parser.expect(TT.TK_IDENTIFIER);
        if (!arrayToken) {
          parser.addError('E2025', 'Diharapkan nama array setelah "dari"',
            AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
          return AST.buatErrorNode('E2025', 'Diharapkan nama array setelah "dari"',
            AST.buatLoc({ line: startToken.baris, column: startToken.kolom }, null));
        }
        var fromArray = arrayToken.nilai;
        var endLoc = { line: arrayToken.baris, column: arrayToken.kolom + fromArray.length };
        return AST.buatHapusDariStatement(item, fromArray,
          AST.buatLoc(
            { line: startToken.baris, column: startToken.kolom },
            endLoc
          ),
          docstring);
      }
    
      // No "dari" → regular DOM removal
      return AST.buatHapusStatement(item,
        AST.buatLoc(
          { line: startToken.baris, column: startToken.kolom },
          item ? item.loc.end : { line: startToken.baris, column: startToken.kolom + 1 }
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
    
    __mods["statement-parser"] = module.exports;
  })();

  // --- parser/karsa-parser.js ---
  (function() {
    var module = { exports: {} };
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
    
    __mods["karsa-parser"] = module.exports;
  })();

  // --- parser/index.js (entry point) ---
  (function() {
    var module = { exports: {} };
    /**
     * KARSA v0.3.1 — Parser Public API
     *
     * Entry point publik untuk modul parser KARSA.
     * Berdasarkan: RFC-PARSER-001 §3
     */
    
    var KarsaParser = require('./karsa-parser');
    var Visitor = require('../utils/visitor');
    var AST = require('./ast-factory');
    var Err = require('./error-codes');
    var TT = require('./token-types');
    
    /**
     * Mem-parse token stream menjadi AST.
     *
     * @param {Array} tokens - Array token dari Lexer
     * @returns {object} ParseResult { ast: ProgramNode, errors: ParseError[] }
     */
    function parse(tokens) {
      var parser = new KarsaParser(tokens);
      return parser.parse();
    }
    
    /**
     * Membuat instance parser baru.
     *
     * @param {Array} tokens - Array token dari Lexer
     * @returns {KarsaParser} Instance parser
     */
    function createParser(tokens) {
      return new KarsaParser(tokens);
    }
    
    // Re-ekspor untuk akses langsung
    module.exports = {
      parse: parse,
      createParser: createParser,
      KarsaParser: KarsaParser,
      Visitor: Visitor,
      AST: AST,
      ErrorCodes: Err,
      TokenTypes: TT,
    
      // Shorthand
      formatAST: Visitor.formatAST,
      formatError: Err.formatError,
      BaseVisitor: Visitor.BaseVisitor,
      CollectingVisitor: Visitor.CollectingVisitor
    };
    
    root.KarsaParser = module.exports;
  })();

})(typeof self !== "undefined" ? self : this);

// ============================================================
// RESOLVER (Tahap 3) — KarsaResolver
// ============================================================
(function(root) {
  "use strict";

  function require(name) {
    if (name === "../utils/visitor") return root.KarsaVisitor;
    if (name === "../parser/error-codes") return root.KarsaParser.ErrorCodes;
    return undefined;
  }

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — RESOLVER (Merged)
   * ============================================================================
   * Menggabungkan kelebihan Tim A & Tim B:
   *   - Model SemanticSymbol lengkap (B)
   *   - Scope management, deteksi duplikat & shadowing (B)
   *   - Usage tracking: read/write count, references (B)
   *   - Alias properti Indonesia → JS (A)
   *   - Self-reference "ketika" tanpa target (A)
   *   - Penanganan JS Interop (`jalankan`) agar tidak dianggap undefined (A)
   *   - Kode error & warning terpadu
   *
   * v0.3.1-patch1: Perbaikan bug kritikal
   *   - [C2] Fix node.args → node.arguments di visitJalankanExpression
   *   - [C3] Emit E3001 untuk identifier yang tidak dideklarasikan
   *   - [C4] Emit E3003 untuk penulisan ke variabel tetap (const)
   *   - [H1] E5001 → E3005 untuk error "ketika tanpa target"
   *   - [H2] Standardisasi format objek error (code/message/severity/loc/suggestion)
   *   - [H3] Tambah visitor: visitSelamaStatement, visitPerbaruiStatement,
   *          visitGunakanStatement, visitTambahkanStatement, visitKurangiStatement,
   *          visitSisipkanStatement, visitSetelahStatement, visitTampilkanStatement,
   *          visitSembunyikanStatement, visitHapusStatement, visitKosongkanStatement,
   *          visitArahkanStatement, visitAmbilDomStatement, visitAmbilLuarStatement
   *   - [M2] Write tracking untuk tambahkan/kurangi/sisipkan
   *   - [M4] W3001 di saatStatement → W3003 (kode baru untuk non-reaktif watcher)
   */
  
  const { BaseVisitor, accept } = require('../utils/visitor');
  const Err = require('../parser/error-codes');
  
  // ============================================================================
  // ALIAS PROPERTI (dari Tim A)
  // ============================================================================
  const ALIAS_PROPERTI = {
    'panjang': 'length',
    'nilai': 'value',
    'teks': 'innerText',
    'html': 'innerHTML',
    'tipe': 'type',
    'nama': 'name',
    'ditandai': 'checked',
    'nonaktif': 'disabled',
    'anak': 'children',
    'induk': 'parentElement',
    'fokus': 'focus',
    'atribut': 'getAttribute',
    'sumber': 'src',
    'tautan': 'href',
    'kelas': 'className',
    'gaya': 'style',
    'placeholder': 'placeholder'
  };
  
  // ============================================================================
  // ALIAS METHOD — Indonesian method names → JavaScript method names
  // Digunakan untuk akses method pada objek (arr.untukSetiap → arr.forEach)
  // ============================================================================
  const ALIAS_METHOD = {
    'untukSetiap': 'forEach',
    'untukSetiapItem': 'forEach',
    'sisip': 'push',
    'sisipAkhir': 'push',
    'ambilAkhir': 'pop',
    'ambilAwal': 'shift',
    'sisipAwal': 'unshift',
    'gabung': 'join',
    'saring': 'filter',
    'pilih': 'map',
    'kurangi': 'reduce',
    'temukan': 'find',
    'temukanIndex': 'findIndex',
    'apakahAda': 'includes',
    'urutkan': 'sort',
    'balik': 'reverse',
    'potong': 'slice',
    'sambung': 'splice',
    'isi': 'fill',
    'keTeks': 'toString',
    'gabungTeks': 'join',
    'setiap': 'every',
    'beberapa': 'some',
    'indeksDari': 'indexOf',
    'indeksTerakhir': 'lastIndexOf',
    'datar': 'flat',
    'petakanDatar': 'flatMap'
  };
  
  // ============================================================================
  // FUNGSI BAWAAN (Builtins) — Indonesian function names → JS equivalents
  // Digunakan saat nama fungsi dipanggil sebagai CallExpression: panjang(arr)
  // Tidak sama dengan ALIAS_PROPERTI yang hanya bekerja di MemberExpression.
  // ============================================================================
  const BUILTIN_FUNCTIONS = {
    // Array/string utilities
    'panjang': { jsName: '__karsa_panjang', helper: true },
    'tipeData': { jsName: 'typeof', helper: false, prefix: true },
    'apakahArray': { jsName: 'Array.isArray', helper: false },
    'keTeks': { jsName: 'String', helper: false },
    'keAngka': { jsName: 'Number', helper: false },
    'keTeksAngka': { jsName: 'parseInt', helper: false },
    'keAngkaDesimal': { jsName: 'parseFloat', helper: false },
    'apakahKosong': { jsName: '__karsa_apakahKosong', helper: true },
    'gabung': { jsName: '__karsa_gabung', helper: true },
    'saring': { jsName: '__karsa_saring', helper: true },
    'pilih': { jsName: '__karsa_pilih', helper: true },
    'urutkan': { jsName: '__karsa_urutkan', helper: true },
    'balik': { jsName: '__karsa_balik', helper: true },
    'temukan': { jsName: '__karsa_temukan', helper: true },
    'apakahAda': { jsName: '__karsa_apakahAda', helper: true }
  };
  
  // ============================================================================
  // EVENT NAMES yang valid untuk ketika (dari spesifikasi KARSA)
  // ============================================================================
  const VALID_EVENT_NAMES = new Set([
    'diklik', 'diketik', 'ditekan', 'dilepas', 'dilewat', 'ditinggal',
    'difokus', 'diblur', 'diubah', 'diseret', 'diubahukuran',
    'dipindah', 'dikirim', 'direset', 'digulir', 'dikonteks',
    'masuk', 'keluar', 'aktif', 'nonaktif', 'muat', 'salah',
    'disubmit', 'dimuat', 'diarahkan', 'ditinggal-kursor',
    'dipasang', 'dilepas-dari-dom'
  ]);
  
  // ============================================================================
  // PROPERTI PERBARUI yang valid
  // ============================================================================
  const VALID_PERBARUI_PROPERTIES = new Set([
    'teks', 'html', 'kelas', 'src', 'href', 'nilai', 'tipe',
    'nama', 'ditandai', 'nonaktif', 'placeholder', 'gaya', 'atribut'
  ]);
  
  // ============================================================================
  // SEMANTIC SYMBOL (dari Tim B)
  // ============================================================================
  function SemanticSymbol(name, kind, node, scope, metadata = {}) {
    this.name = name;
    this.kind = kind;          // 'data','tetap','ubah','turunan','fungsi','komponen','parameter'
    this.id = metadata.id || null;
    this.declarationNode = node;
    this.scope = scope;
    this.scopeId = metadata.scopeId || null;
  
    // Properti dari Tim B
    this.isReactive  = metadata.isReactive  || false;
    this.isWritable  = metadata.isWritable  || false;
    this.isComputed  = (kind === 'turunan');
    this.isParameter = (kind === 'parameter');
    this.isComponent = (kind === 'komponen');
    this.isFunction  = (kind === 'fungsi');
  
    // Shadowing (Tim B)
    this.shadowedSymbol = metadata.shadowedSymbol || null;
  
    // Usage tracking (Tim B)
    this.references = [];
    this.readCount  = 0;
    this.writeCount = 0;
  }
  
  // ============================================================================
  // SCOPE (dari Tim B, sedikit penyesuaian)
  // ============================================================================
  function Scope(type, parent) {
    this.id = 'scope_' + (++Scope._nextId);
    this.type = type;   // 'global','blok','komponen','iterasi','watcher'
    this.parent = parent;
    this.symbols = new Map();
  }
  Scope._nextId = 0;
  
  Scope.prototype.define = function(name, symbol) {
    this.symbols.set(name, symbol);
  };
  
  Scope.prototype.lookup = function(name) {
    if (this.symbols.has(name)) return this.symbols.get(name);
    if (this.parent) return this.parent.lookup(name);
    return null;
  };
  
  // ============================================================================
  // RESOLVER ENGINE (utama)
  // ============================================================================
  function KarsaResolver() {
    BaseVisitor.call(this);
    this.errors = [];
    this.warnings = [];
    this.currentScope = null;
    this.buatStack = [];
    this.allSymbols = [];
    this.currentJalankanCallee = null;
    this._symbolIdCounter = 0;
  }
  
  KarsaResolver.prototype = Object.create(BaseVisitor.prototype);
  KarsaResolver.prototype.constructor = KarsaResolver;
  
  // ─── Entry Point ───────────────────────────────────────────
  KarsaResolver.prototype.resolve = function(ast) {
    this.errors = [];
    this.warnings = [];
    Scope._nextId = 0;
    this._symbolIdCounter = 0;
    this.currentScope = new Scope('global', null);
    this.allSymbols = [];
  
    // Pass 1: Hoisting deklarasi global (menggunakan addSymbol untuk deteksi duplikat)
    this.gatherGlobals(ast);
  
    // Pass 2: Deep resolution
    accept(ast, this);
  
    // Tempelkan metadata untuk Analyzer (Tim B)
    ast.semantic = {
      symbols: this.allSymbols,
      globalScope: this.currentScope
    };
  
    return { ast, errors: this.errors, warnings: this.warnings };
  };
  
  // ─── Utility: menambah simbol (dari Tim B) ─────────────────
  KarsaResolver.prototype.addSymbol = function(name, kind, node, metadata = {}) {
    // Deteksi duplikat (E3002 - Tim B)
    const existing = this.currentScope.symbols.get(name);
    if (existing) {
      this.errors.push(Err.createError('E3002', node.loc, {
        message: `Simbol "${name}" sudah dideklarasikan dalam scope yang sama.`,
        suggestion: `Deklarasi pertama ada di Baris ${existing.declarationNode.loc.start.line}.`
      }));
      return null;
    }
  
    // Shadowing (Tim B) → W3002
    const shadowed = this.currentScope.parent 
      ? this.currentScope.parent.lookup(name) 
      : null;
  
    if (shadowed) {
      this.warnings.push(Err.createError('W3002', node.loc, {
        message: `Variabel "${name}" menyembunyikan variabel dengan nama sama di scope luar.`,
        suggestion: 'Gunakan nama yang berbeda untuk menghindari kebingungan.',
        relatedInformation: [{
          message: `Deklarasi yang disembunyikan: "${name}" (${shadowed.kind}).`,
          loc: shadowed.declarationNode && shadowed.declarationNode.loc ? shadowed.declarationNode.loc : null
        }]
      }));
    }
  
    const symbol = new SemanticSymbol(name, kind, node, this.currentScope.type, {
      ...metadata,
      id: 'sym_' + (++this._symbolIdCounter),
      scopeId: this.currentScope.id,
      shadowedSymbol: shadowed
    });
  
    this.currentScope.define(name, symbol);
    this.allSymbols.push(symbol);
  
    // Ikat simbol ke node (untuk akses mudah)
    node.symbol = symbol;
    return symbol;
  };
  
  // ─── Global Hoisting (modifikasi dari Tim B) ───────────────
  KarsaResolver.prototype.gatherGlobals = function(ast) {
    if (!ast.body) return;
    ast.body.forEach(node => {
      if (node.type === 'DataDeclaration') 
        this.addSymbol(node.name, 'data', node, { isReactive: true, isWritable: true });
      else if (node.type === 'TetapDeclaration') 
        this.addSymbol(node.name, 'tetap', node, { isWritable: false });
      else if (node.type === 'UbahDeclaration') 
        this.addSymbol(node.name, 'ubah', node, { isWritable: true });
      else if (node.type === 'TurunanDeclaration') 
        this.addSymbol(node.name, 'turunan', node, { isReactive: true, isWritable: false });
      else if (node.type === 'FungsiDeclaration') 
        this.addSymbol(node.name, 'fungsi', node, { isWritable: false });
      else if (node.type === 'KomponenDeclaration') 
        this.addSymbol(node.name, 'komponen', node, { isWritable: false });
    });
  };
  
  // ============================================================================
  // VISITOR METHODS
  // ============================================================================
  
  // ─── Identifier (gabungan) ─────────────────────────────────
  KarsaResolver.prototype.visitIdentifier = function(node) {
    // Abaikan jika ini adalah nama callee dari "jalankan"
    if (node.isCalleeJS || 
        (this.currentJalankanCallee && node.name === this.currentJalankanCallee)) {
      return;
    }
  
    // [BUG-3 FIX] Abaikan jika ini adalah nama fungsi bawaan (builtin)
    // Fungsi bawaan seperti panjang(), tipeData(), dll. tidak dideklarasikan
    // dalam scope, tapi tetap valid sebagai callee di CallExpression.
    if (node.isBuiltinCallee && BUILTIN_FUNCTIONS[node.name]) {
      node.resolved = { kind: 'builtin', name: node.name, isReactive: false, isWritable: false };
      return;
    }
  
    const symbol = this.currentScope.lookup(node.name);
    if (symbol) {
      node.resolved = symbol;
      node.semantic = { symbol };
      symbol.readCount++;
      symbol.references.push(node);
    } else {
      // Jika identifier adalah nama fungsi bawaan, jangan emit E3001
      // (akan ditangani di visitCallExpression sebagai builtin)
      if (BUILTIN_FUNCTIONS[node.name]) {
        node.resolved = { kind: 'builtin', name: node.name, isReactive: false, isWritable: false };
        return;
      }
  
      // [C3 FIX] Emit E3001 untuk identifier yang tidak dideklarasikan
      node.isUndefined = true;
      this.errors.push(Err.createError('E3001', node.loc, {
        message: `Identifier "${node.name}" tidak dideklarasikan.`,
        suggestion: 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.'
      }));
    }
  };
  
  // ─── MemberExpression (dari Tim A: alias properti) ─────────
  KarsaResolver.prototype.visitMemberExpression = function(node) {
    // Visit object (kiri)
    accept(node.object, this);
  
    // Resolusi alias properti dan method (Tim A + fix BUG-5)
    if (node.property.type === 'Identifier') {
      const propName = node.property.name;
  
      // Khusus .indeks dalam scope iterasi (virtual)
      if (propName === 'indeks') {
        node.property.isVirtual = true;
      }
  
      // Cek alias properti terlebih dahulu
      if (ALIAS_PROPERTI[propName]) {
        node.property.originalName = propName;
        node.property.name = ALIAS_PROPERTI[propName];
        node.isTranslatedAlias = true;
      }
      // Cek alias method (untukSetiap → forEach, sisip → push, dll)
      else if (ALIAS_METHOD[propName]) {
        node.property.originalName = propName;
        node.property.name = ALIAS_METHOD[propName];
        node.isTranslatedMethodAlias = true;
        // Tandai jika method ini bermutasi array (perlu trigger reaktivitas)
        const MUTATING_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill']);
        node.isMutatingMethod = MUTATING_METHODS.has(ALIAS_METHOD[propName]);
      }
    }
  };
  
  KarsaResolver.prototype.visitCallExpression = function(node) {
    // Visit callee
    accept(node.callee, this);
  
    // Visit arguments
    if (node.arguments && node.arguments.length > 0) {
      node.arguments.forEach(arg => accept(arg, this));
    }
  
    // Cek apakah callee adalah Identifier yang cocok dengan fungsi bawaan
    if (node.callee && node.callee.type === 'Identifier') {
      const calleeName = node.callee.name;
      if (BUILTIN_FUNCTIONS[calleeName]) {
        const builtin = BUILTIN_FUNCTIONS[calleeName];
        node.isBuiltin = true;
        node.builtinInfo = builtin;
        node.callee.originalName = calleeName;
  
        // Jika builtin adalah prefix operator (seperti typeof), tandai khusus
        if (builtin.prefix) {
          node.isPrefixBuiltin = true;
        }
  
        // Jika builtin memerlukan runtime helper, tandai untuk compiler
        if (builtin.helper) {
          node.needsRuntimeHelper = true;
        }
      }
    }
  
    // Cek jika callee adalah MemberExpression dengan method alias yang bermutasi
    if (node.callee && node.callee.type === 'MemberExpression' && node.callee.isMutatingMethod) {
      node.isMutatingMethodCall = true;
      node.mutatingMethodName = node.callee.property.name; // already translated
    }
  };
  
  // ─── JalankanExpression (Tim A: JS Interop) ───────────────
  KarsaResolver.prototype.visitJalankanExpression = function(node) {
    // Simpan nama fungsi yang dipanggil (callee)
    const prevCallee = this.currentJalankanCallee;
    this.currentJalankanCallee = node.callee; // node.callee adalah string
  
    // [C2 FIX] node.args → node.arguments (sesuai AST factory)
    if (node.arguments && node.arguments.length > 0) {
      node.arguments.forEach(arg => accept(arg, this));
    }
    if (node.withArgs && node.withArgs.length > 0) {
      node.withArgs.forEach(arg => accept(arg, this));
    }
  
    // Kembalikan ke nilai sebelumnya (null jika tidak ada nested jalankan)
    this.currentJalankanCallee = prevCallee;
  };
  
  KarsaResolver.prototype.markAsJSExternal = function(node) {
    if (node.type === 'Identifier') {
      node.isCalleeJS = true;
    } else if (node.type === 'MemberExpression') {
      this.markAsJSExternal(node.object);
    }
  };
  
  // ─── Write-Tracking Helper ────────────────────────────────
  /**
   * Melacak penulisan ke variabel dan memvalidasi isWritable.
   * Digunakan oleh simpan, tambahkan, kurangi, sisipkan, perbarui.
   */
  KarsaResolver.prototype._trackWrite = function(targetName, node) {
    if (!targetName) return;
    const symbol = this.currentScope.lookup(targetName);
    if (symbol) {
      symbol.writeCount++;
      node.targetSymbol = symbol;  // untuk Analyzer (proteksi read-only)
  
      // [C4 FIX] Emit E3003 jika menulis ke variabel tetap (const)
      if (!symbol.isWritable) {
        this.errors.push(Err.createError('E3003', node.loc, {
          message: `Variabel tetap "${targetName}" tidak dapat diubah setelah inisialisasi.`,
          suggestion: 'Gunakan "ubah" jika variabel perlu diubah, bukan "tetap".'
        }));
      }
    }
  };
  
  // ─── SimpanStatement (Tim B: write tracking) ──────────────
  KarsaResolver.prototype.visitSimpanStatement = function(node) {
    // Catat penulisan jika target berupa identifier (node.target adalah string nama)
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else if (node.target && node.target.type === 'Identifier') {
      this._trackWrite(node.target.name, node);
    }
    this.genericVisit(node);
  };
  
  // ─── Mutation Statements: Write Tracking (M2 FIX) ─────────
  KarsaResolver.prototype.visitTambahkanStatement = function(node) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else if (node.target && node.target.type === 'Identifier') {
      this._trackWrite(node.target.name, node);
    }
    this.genericVisit(node);
  };
  
  KarsaResolver.prototype.visitKurangiStatement = function(node) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else if (node.target && node.target.type === 'Identifier') {
      this._trackWrite(node.target.name, node);
    }
    this.genericVisit(node);
  };
  
  KarsaResolver.prototype.visitSisipkanStatement = function(node) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else if (node.target && node.target.type === 'Identifier') {
      this._trackWrite(node.target.name, node);
    }
    this.genericVisit(node);
  };
  
  // ─── PerbaruiStatement (H3 FIX: visitor baru) ──────────────
  KarsaResolver.prototype.visitPerbaruiStatement = function(node) {
    // Resolve target jika berupa identifier
    if (node.target) {
      if (typeof node.target === 'string') {
        this._trackWrite(node.target, node);
      } else {
        accept(node.target, this);
        // Jika target adalah identifier, lacak penulisan
        if (node.target.type === 'Identifier' && node.target.name) {
          this._trackWrite(node.target.name, node);
        }
      }
    }
  
    // Resolve value expression
    if (node.value) accept(node.value, this);
  
    // Validasi properti perbarui
    if (node.property && typeof node.property === 'string') {
      if (!VALID_PERBARUI_PROPERTIES.has(node.property)) {
        this.warnings.push(Err.createError('E4008', node.loc, {
          message: `Properti perbarui "${node.property}" mungkin tidak didukung.`,
          suggestion: 'Gunakan properti yang didukung: teks, html, kelas, src, href, nilai, dll.'
        }));
      }
    }
  };
  
  // ─── GunakanStatement (H3 FIX: visitor baru) ───────────────
  KarsaResolver.prototype.visitGunakanStatement = function(node) {
    // Validasi bahwa nama komponen terdaftar
    if (node.componentName) {
      const symbol = this.currentScope.lookup(node.componentName);
      if (!symbol) {
        // [E3004] Komponen tidak dideklarasikan
        this.errors.push(Err.createError('E3004', node.loc, {
          message: `Komponen "${node.componentName}" digunakan sebelum dideklarasi.`,
          suggestion: 'Pindahkan deklarasi komponen sebelum penggunaannya.'
        }));
      } else if (symbol.kind !== 'komponen') {
        // [E4010] gunakan untuk non-komponen
        this.errors.push(Err.createError('E4010', node.loc, {
          message: `"${node.componentName}" bukan komponen, tidak dapat digunakan dengan "gunakan".`,
          suggestion: 'Pastikan nama yang direferensikan adalah komponen (PascalCase).'
        }));
      }
    }
  
    // Resolve props jika ada
    if (node.props) {
      node.props.forEach(prop => {
        if (prop.value) accept(prop.value, this);
      });
    }
  
    this.genericVisit(node);
  };
  
  // ─── TampilkanStatement (H3 FIX) ───────────────────────────
  KarsaResolver.prototype.visitTampilkanStatement = function(node) {
    if (node.target) accept(node.target, this);
    this.genericVisit(node);
  };
  
  // ─── SembunyikanStatement (H3 FIX) ─────────────────────────
  KarsaResolver.prototype.visitSembunyikanStatement = function(node) {
    if (node.target) accept(node.target, this);
    this.genericVisit(node);
  };
  
  // ─── HapusStatement (H3 FIX) ───────────────────────────────
  KarsaResolver.prototype.visitHapusStatement = function(node) {
    if (node.target) accept(node.target, this);
    this.genericVisit(node);
  };
  
  KarsaResolver.prototype.visitHapusDariStatement = function(node) {
    // Resolve the item expression
    if (node.item) accept(node.item, this);
    // Resolve the array identifier and attach metadata
    var symbol = this.currentScope.lookup(node.fromArray);
    if (symbol) {
      node.fromArraySymbol = symbol;
      node.fromArrayReactive = (symbol.kind === 'data' || symbol.kind === 'turunan');
    } else {
      this.addError('E3001', 'Identifier "' + node.fromArray + '" tidak dideklarasikan', node.loc);
    }
  };
  
  // ─── KosongkanStatement (H3 FIX) ───────────────────────────
  KarsaResolver.prototype.visitKosongkanStatement = function(node) {
    if (node.target) accept(node.target, this);
    this.genericVisit(node);
  };
  
  // ─── ArahkanStatement (H3 FIX) ─────────────────────────────
  KarsaResolver.prototype.visitArahkanStatement = function(node) {
    if (node.url) accept(node.url, this);
    this.genericVisit(node);
  };
  
  // ─── SetelahStatement (H3 FIX + Bug 3 FIX) ─────────────────
  KarsaResolver.prototype.visitSetelahStatement = function(node) {
    // [Bug 3 FIX] Resolve target symbol dan lampirkan ke node,
    // supaya compiler bisa membedakan fungsi KARSA vs external variable.
    if (node.target) {
      const symbol = this.currentScope.lookup(node.target);
      if (symbol) {
        node.targetSymbol = symbol;
      }
    }
    this.genericVisit(node);
  };
  
  // ─── AmbilDomStatement (H3 FIX) ────────────────────────────
  KarsaResolver.prototype.visitAmbilDomStatement = function(node) {
    if (node.source) accept(node.source, this);
    this.genericVisit(node);
  };
  
  // ─── AmbilLuarStatement (H3 FIX) ───────────────────────────
  KarsaResolver.prototype.visitAmbilLuarStatement = function(node) {
    if (node.url) accept(node.url, this);
  
    // Buat scope untuk callback
    const prevScope = this.currentScope;
    this.currentScope = new Scope('blok', prevScope);
  
    if (node.saveTarget) {
      this.addSymbol(node.saveTarget, 'ubah', node, { isWritable: true });
    }
  
    this.genericVisit(node);
    this.currentScope = prevScope;
  };
  
  // ─── SelamaStatement (H3 FIX: scope untuk loop body) ───────
  KarsaResolver.prototype.visitSelamaStatement = function(node) {
    // Resolve kondisi di scope sekarang
    if (node.condition) accept(node.condition, this);
  
    const prevScope = this.currentScope;
    this.currentScope = new Scope('blok', prevScope);
    if (node.body) accept(node.body, this);
    this.currentScope = prevScope;
  };
  
  // ─── Scope: Blok, Fungsi, Komponen, Ulangi (Tim B, disempurnakan) ──
  KarsaResolver.prototype.visitBlockStatement = function(node) {
    const prevScope = this.currentScope;
    this.currentScope = new Scope('blok', prevScope);
    this.genericVisit(node);
    this.currentScope = prevScope;
  };
  
  KarsaResolver.prototype.visitFungsiDeclaration = function(node) {
    const prevScope = this.currentScope;
    this.currentScope = new Scope('blok', prevScope);
  
    if (node.params) {
      node.params.forEach(p => 
        this.addSymbol(p.name, 'parameter', p, { isReactive: false, isWritable: true })
      );
    }
  
    this.genericVisit(node);
    this.currentScope = prevScope;
  };
  
  KarsaResolver.prototype.visitKomponenDeclaration = function(node) {
    const prevScope = this.currentScope;
    this.currentScope = new Scope('komponen', prevScope);
  
    if (node.params) {
      node.params.forEach(p => 
        this.addSymbol(p.name, 'parameter', p, { isReactive: true, isWritable: true })
      );
    }
  
    // Komponen juga berperan sebagai elemen untuk self-reference "ketika"
    this.buatStack.push(node);
    this.genericVisit(node);
    this.buatStack.pop();
  
    this.currentScope = prevScope;
  };
  
  KarsaResolver.prototype.visitUlangiStatement = function(node) {
    // Resolve source di scope sekarang (Tim B sudah benar)
    accept(node.source, this);
  
    const prevScope = this.currentScope;
    this.currentScope = new Scope('iterasi', prevScope);
  
    if (node.iteratorName) {
      this.addSymbol(node.iteratorName, 'ubah', node, { isWritable: false });
    }
  
    accept(node.body, this);
    this.currentScope = prevScope;
  };
  
  // ─── BuatStatement (Tim A: untuk self-reference "ketika") ──
  KarsaResolver.prototype.visitBuatStatement = function(node) {
    this.buatStack.push(node);
    this.genericVisit(node);
    this.buatStack.pop();
  };
  
  // ─── KetikaStatement (Tim A: self-reference) ──────────────
  KarsaResolver.prototype.visitKetikaStatement = function(node) {
    // Tangani target kosong (self-reference)
    if (!node.target) {
      if (this.buatStack.length > 0) {
        const parentNode = this.buatStack[this.buatStack.length - 1];
        node.target = {
          type: 'SelfReference',
          referencedNode: parentNode,
          loc: node.loc
        };
      } else {
        // [H1 FIX] E5001 → E3005 (kode error resolver, bukan compiler)
        this.errors.push(Err.createError('E3005', node.loc, {
          message: 'Event listener "ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen".',
          suggestion: 'Tambahkan target pada "ketika" atau letakkan di dalam blok "buat"/"komponen".'
        }));
      }
    } else {
      accept(node.target, this);
    }
  
    // Validasi event name jika tersedia
    if (node.event && typeof node.event === 'string' && !VALID_EVENT_NAMES.has(node.event)) {
      this.warnings.push(Err.createError('E4009', node.loc, {
        message: `Event name "${node.event}" mungkin tidak dikenali.`,
        suggestion: 'Gunakan nama event yang valid: diklik, diketik, ditekan, dll.'
      }));
    }
  
    // Watcher-like scope (Tim A)
    const prevScope = this.currentScope;
    this.currentScope = new Scope('watcher', prevScope);
    if (node.body) accept(node.body, this);
    if (node.action) accept(node.action, this);
    this.currentScope = prevScope;
  };
  
  // ─── SaatStatement (Tim B, dilengkapi) ────────────────────
  KarsaResolver.prototype.visitSaatStatement = function(node) {
    // Resolve target reaktif
    const binding = this.currentScope.lookup(node.target);
    if (!binding) {
      // Emit E3001 untuk watcher target yang tidak dideklarasikan
      node.isUndefined = true;
      this.errors.push(Err.createError('E3001', node.loc, {
        message: `Identifier "${node.target}" tidak dideklarasikan.`,
        suggestion: 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.'
      }));
    } else if (!binding.isReactive) {
      // [M4 FIX] W3001 → W3003 (kode baru khusus: watcher target non-reaktif)
      this.warnings.push(Err.createError('W3003', node.loc, {
        message: `Variabel "${node.target}" bukan data reaktif. Watcher mungkin tidak akan pernah terpicu.`,
        suggestion: 'Gunakan "data" (var) reaktif sebagai target watcher.'
      }));
    }
  
    const prevScope = this.currentScope;
    this.currentScope = new Scope('watcher', prevScope);
    this.genericVisit(node);
    this.currentScope = prevScope;
  };
  
  // ─── Deklarasi Lokal (Tim B, pengecekan agar tidak duplikasi global) ──
  KarsaResolver.prototype.visitDataDeclaration = function(node) {
    if (!this.currentScope.symbols.has(node.name)) {
      this.addSymbol(node.name, 'data', node, { isReactive: true, isWritable: true });
    }
    this.genericVisit(node);
  };
  
  KarsaResolver.prototype.visitTetapDeclaration = function(node) {
    if (!this.currentScope.symbols.has(node.name)) {
      this.addSymbol(node.name, 'tetap', node, { isWritable: false });
    }
    // [W4003] Warning: tetap tanpa nilai awal
    if (!node.init) {
      this.warnings.push(Err.createError('W4003', node.loc, {
        message: `Deklarasi "tetap" untuk "${node.name}" tanpa nilai awal.`,
        suggestion: 'Berikan nilai awal untuk konstanta.'
      }));
    }
    this.genericVisit(node);
  };
  
  KarsaResolver.prototype.visitUbahDeclaration = function(node) {
    if (!this.currentScope.symbols.has(node.name)) {
      this.addSymbol(node.name, 'ubah', node, { isWritable: true });
    }
    this.genericVisit(node);
  };
  
  KarsaResolver.prototype.visitTurunanDeclaration = function(node) {
    if (!this.currentScope.symbols.has(node.name)) {
      this.addSymbol(node.name, 'turunan', node, { isReactive: true, isWritable: false });
    }
    this.genericVisit(node);
  };
  
  // ─── Error Helper ──────────────────────────────────────────
  KarsaResolver.prototype.addError = function(code, message, loc, suggestion) {
    this.errors.push(Err.createError(code, loc, {
      message: message,
      suggestion: suggestion || ''
    }));
  };
  
  KarsaResolver.prototype.addWarning = function(code, message, loc, suggestion) {
    this.warnings.push(Err.createError(code, loc, {
      message: message,
      suggestion: suggestion || ''
    }));
  };
  
  module.exports = KarsaResolver;
  

  root.KarsaResolver = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// DEPENDENCY GRAPH UTILITY — KarsaDependencyGraph
// ============================================================
(function(root) {
  "use strict";

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — Dependency Graph Utilities
   * ----------------------------------------------------------------------------
   * Refinement lvl.2: membangun dependency graph static sederhana dari metadata
   * resolver, terutama untuk `turunan` dan watcher `saat`.
   */
  
  'use strict';
  
  function locKey(loc) {
    if (!loc || !loc.start) return 'unknown';
    return String(loc.start.line) + ':' + String(loc.start.column);
  }
  
  function isAstNode(value) {
    return value && typeof value === 'object' && typeof value.type === 'string';
  }
  
  function collectIdentifierReferences(node, out, seen) {
    if (!node || typeof node !== 'object') return out;
    if (!seen) seen = new Set();
    if (seen.has(node)) return out;
    seen.add(node);
  
    if (node.type === 'Identifier' && node.resolved) {
      out.push({
        name: node.name,
        symbol: node.resolved,
        loc: node.loc || null
      });
      return out;
    }
  
    Object.keys(node).forEach(function(key) {
      // Hindari circular/internal metadata.
      if (key === 'loc' || key === 'symbol' || key === 'resolved' || key === 'semantic' ||
          key === 'targetSymbol' || key === 'declarationNode' || key === 'shadowedSymbol' ||
          key === 'references' || key === 'scope' || key === 'parent') {
        return;
      }
      var value = node[key];
      if (Array.isArray(value)) {
        value.forEach(function(item) {
          if (isAstNode(item) || (item && typeof item === 'object')) collectIdentifierReferences(item, out, seen);
        });
      } else if (isAstNode(value) || (value && typeof value === 'object' && !value.start && !value.end)) {
        collectIdentifierReferences(value, out, seen);
      }
    });
  
    return out;
  }
  
  function traverseAst(node, visit, seen) {
    if (!node || typeof node !== 'object') return;
    if (!seen) seen = new Set();
    if (seen.has(node)) return;
    seen.add(node);
  
    if (node.type) visit(node);
  
    Object.keys(node).forEach(function(key) {
      if (key === 'loc' || key === 'symbol' || key === 'resolved' || key === 'semantic' ||
          key === 'targetSymbol' || key === 'declarationNode' || key === 'shadowedSymbol' ||
          key === 'references' || key === 'scope' || key === 'parent') {
        return;
      }
      var value = node[key];
      if (Array.isArray(value)) value.forEach(function(item) { traverseAst(item, visit, seen); });
      else if (value && typeof value === 'object') traverseAst(value, visit, seen);
    });
  }
  
  function buildDependencyGraph(ast) {
    var semantic = ast && ast.semantic ? ast.semantic : null;
    var symbols = semantic && semantic.symbols ? semantic.symbols : [];
    var dependencies = [];
  
    symbols.forEach(function(sym) {
      if (!sym || sym.kind !== 'turunan' || !sym.declarationNode) return;
      var init = sym.declarationNode.init;
      var refs = collectIdentifierReferences(init, []);
      refs.forEach(function(ref) {
        if (!ref.symbol || !ref.symbol.id || ref.symbol.id === sym.id) return;
        dependencies.push({
          from: sym.name,
          fromSymbolId: sym.id || null,
          to: ref.symbol.name,
          toSymbolId: ref.symbol.id || null,
          kind: 'computed',
          loc: ref.loc
        });
      });
    });
  
    traverseAst(ast, function(node) {
      if (node.type !== 'SaatStatement') return;
      var targetSymbol = null;
      if (node.target && typeof node.target === 'string') {
        for (var i = 0; i < symbols.length; i++) {
          if (symbols[i].name === node.target) {
            targetSymbol = symbols[i];
            break;
          }
        }
      }
      if (targetSymbol) {
        dependencies.push({
          from: 'watcher@' + locKey(node.loc),
          fromSymbolId: null,
          to: targetSymbol.name,
          toSymbolId: targetSymbol.id || null,
          kind: 'watcher-target',
          loc: node.loc || null
        });
      }
  
      var bodyRefs = collectIdentifierReferences(node.body, []);
      bodyRefs.forEach(function(ref) {
        if (!ref.symbol) return;
        dependencies.push({
          from: 'watcher@' + locKey(node.loc),
          fromSymbolId: null,
          to: ref.symbol.name,
          toSymbolId: ref.symbol.id || null,
          kind: 'watcher-body-read',
          loc: ref.loc
        });
      });
    });
  
    var cycles = detectCycles(dependencies);
    return {
      dependencies: dependencies,
      cycles: cycles
    };
  }
  
  function detectCycles(edges) {
    var graph = new Map();
    edges.forEach(function(edge) {
      // Cycle detection hanya untuk symbol-to-symbol computed dependencies.
      if (edge.kind !== 'computed' || !edge.fromSymbolId || !edge.toSymbolId) return;
      if (!graph.has(edge.fromSymbolId)) graph.set(edge.fromSymbolId, []);
      graph.get(edge.fromSymbolId).push(edge.toSymbolId);
    });
  
    var visited = new Set();
    var active = new Set();
    var stack = [];
    var cycles = [];
    var seenCycleKeys = new Set();
  
    function dfs(node) {
      visited.add(node);
      active.add(node);
      stack.push(node);
  
      var nexts = graph.get(node) || [];
      for (var i = 0; i < nexts.length; i++) {
        var next = nexts[i];
        if (!visited.has(next)) {
          dfs(next);
        } else if (active.has(next)) {
          var startIndex = stack.indexOf(next);
          var cycle = stack.slice(startIndex).concat([next]);
          var key = cycle.join('>');
          if (!seenCycleKeys.has(key)) {
            seenCycleKeys.add(key);
            cycles.push({ symbolIds: cycle });
          }
        }
      }
  
      stack.pop();
      active.delete(node);
    }
  
    Array.from(graph.keys()).forEach(function(node) {
      if (!visited.has(node)) dfs(node);
    });
  
    return cycles;
  }
  
  function normalizeSemantic(ast) {
    var semantic = ast && ast.semantic ? ast.semantic : null;
    var symbols = semantic && semantic.symbols ? semantic.symbols : [];
    var deps = semantic && semantic.dependencies ? semantic.dependencies : [];
    var cycles = semantic && semantic.dependencyCycles ? semantic.dependencyCycles : [];
  
    var publicSymbols = symbols.map(function(sym) {
      return {
        id: sym.id || null,
        name: sym.name,
        kind: sym.kind,
        loc: sym.declarationNode && sym.declarationNode.loc ? sym.declarationNode.loc : null,
        scope: sym.scope || null,
        scopeId: sym.scopeId || null,
        isReactive: !!sym.isReactive,
        isWritable: !!sym.isWritable,
        isComputed: !!sym.isComputed,
        isParameter: !!sym.isParameter,
        isComponent: !!sym.isComponent,
        isFunction: !!sym.isFunction,
        readCount: sym.readCount || 0,
        writeCount: sym.writeCount || 0,
        shadowedSymbolId: sym.shadowedSymbol ? (sym.shadowedSymbol.id || null) : null
      };
    });
  
    var references = [];
    symbols.forEach(function(sym) {
      (sym.references || []).forEach(function(ref) {
        references.push({
          symbolId: sym.id || null,
          name: sym.name,
          loc: ref.loc || null
        });
      });
    });
  
    return {
      symbols: publicSymbols,
      references: references,
      dependencies: deps.map(function(dep) {
        return {
          from: dep.from,
          fromSymbolId: dep.fromSymbolId || null,
          to: dep.to,
          toSymbolId: dep.toSymbolId || null,
          kind: dep.kind,
          loc: dep.loc || null
        };
      }),
      cycles: cycles.map(function(cycle) {
        return { symbolIds: cycle.symbolIds ? cycle.symbolIds.slice() : [] };
      })
    };
  }
  
  module.exports = {
    collectIdentifierReferences: collectIdentifierReferences,
    buildDependencyGraph: buildDependencyGraph,
    detectCycles: detectCycles,
    normalizeSemantic: normalizeSemantic
  };
  

  root.KarsaDependencyGraph = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// ANALYZER (Tahap 4) — KarsaAnalyzer
// ============================================================
(function(root) {
  "use strict";

  function require(name) {
    if (name === "../utils/visitor") return root.KarsaVisitor;
    if (name === "../parser/error-codes") return root.KarsaParser.ErrorCodes;
    if (name === "./dependency-graph") return root.KarsaDependencyGraph;
    return undefined;
  }

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — ANALYZER (Tahap 4)
   * ----------------------------------------------------------------------------
   * Melakukan validasi semantik: tipe, reaktivitas, kontrol alur, dan lifecycle.
   *
   * Sesuai Spesifikasi: KARSA-grammar-spec_v0_3_1.md
   *
   * v0.3.1-patch1: Perbaikan bug kritikal
   *   - [C5] Tambah visitPerbaruiStatement + checkWriteToTurunan
   *   - [H4] Tambah visitor: visitGunakanStatement, visitSetelahStatement,
   *          visitTampilkanStatement, visitSembunyikanStatement, visitHapusStatement,
   *          visitKosongkanStatement, visitArahkanStatement, visitAmbilDomStatement,
   *          visitAmbilLuarStatement, visitTambahkanStatement, visitKurangiStatement,
   *          visitSisipkanStatement
   *   - [H6] E6001/E6002/E6003 → E4011/E4012/E4013 (kode analyzer, bukan runtime)
   *   - [H2] Standardisasi format error menggunakan Err.createError
   *   - [M1] Tambah cek inTurunanExpr untuk tambahkan/kurangi/sisipkan
   */
  
  const { BaseVisitor, accept } = require('../utils/visitor');
  const Err = require('../parser/error-codes');
  const DependencyGraph = require('./dependency-graph');
  
  function KarsaAnalyzer() {
    BaseVisitor.call(this);
    this.errors = [];
    this.warnings = [];
    this._currentAst = null;
    this.options = {};
    
    // Context stacks
    this.context = {
      inComponent: false,
      inFunction: false,
      loopDepth: 0,
      handlerDepth: 0,
      inTurunanExpr: false
    };
  }
  
  KarsaAnalyzer.prototype = Object.create(BaseVisitor.prototype);
  KarsaAnalyzer.prototype.constructor = KarsaAnalyzer;
  
  KarsaAnalyzer.prototype.analyze = function(ast, options) {
    this.errors = [];
    this.warnings = [];
    this._currentAst = ast;
    this.options = options || {};
    // [Bug 4 FIX] Build Map sekali untuk lookup O(1)
    this._symbolMap = null;
    this._symbolsByName = null;
    if (ast && ast.semantic && ast.semantic.symbols) {
      this._symbolMap = new Map();
      this._symbolsByName = new Map();
      ast.semantic.symbols.forEach(function(sym) {
        // Jangan overwrite symbol pertama: shadowing ditangani lewat node.resolved/targetSymbol.
        if (!this._symbolMap.has(sym.name)) this._symbolMap.set(sym.name, sym);
        if (!this._symbolsByName.has(sym.name)) this._symbolsByName.set(sym.name, []);
        this._symbolsByName.get(sym.name).push(sym);
      }.bind(this));
    }
    accept(ast, this);
    this.buildSemanticGraph();
    this.emitUsageWarnings();
    return {
      ast: ast,
      errors: this.errors,
      warnings: this.warnings
    };
  };
  
  // --- Helpers ---
  
  KarsaAnalyzer.prototype.addError = function(code, pesan, loc, saran) {
    this.errors.push(Err.createError(code, loc, {
      message: pesan,
      suggestion: saran || ''
    }));
  };
  
  KarsaAnalyzer.prototype.addWarning = function(code, pesan, loc, saran) {
    this.warnings.push(Err.createError(code, loc, {
      message: pesan,
      suggestion: saran || ''
    }));
  };
  
  /**
   * Validasi Tipe Dasar (Section 7.3)
   */
  KarsaAnalyzer.prototype.checkTypeHint = function(typeHint, valueNode) {
    if (!typeHint || !valueNode || valueNode.type === 'ErrorNode') return;
  
    let actualType = '';
    if (valueNode.type === 'Literal') {
      if (typeof valueNode.value === 'number') actualType = 'angka';
      else if (typeof valueNode.value === 'string') actualType = 'teks';
      else if (typeof valueNode.value === 'boolean') actualType = 'benar-salah';
    }
    else if (valueNode.type === 'ObjectLiteral') actualType = 'objek';
    else if (valueNode.type === 'ArrayLiteral') actualType = 'array';
    else if (valueNode.type === 'CallExpression') {
      // Try to infer from callee name
      var callee = valueNode.callee;
      if (callee && callee.type === 'Identifier') {
        var name = callee.name;
        if (name && name.indexOf('ambil') === 0) actualType = 'teks';
        // Otherwise unknown — don't emit warning (too many false positives)
      }
    }
    else if (valueNode.type === 'BinaryExpression') {
      var op = valueNode.operator;
      if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') {
        actualType = 'angka';
      } else {
        // Comparison or logic operators -> boolean
        actualType = 'benar-salah';
      }
    }
    else if (valueNode.type === 'UnaryExpression') {
      if (valueNode.operator === 'bukan') {
        actualType = 'benar-salah';
      } else if (valueNode.operator === '-') {
        actualType = 'angka';
      }
    }
    else if (valueNode.type === 'MemberExpression') {
      // .panjang/.length -> angka, otherwise unknown
      var prop = valueNode.property;
      if (prop && prop.type === 'Identifier' && (prop.name === 'panjang' || prop.name === 'length')) {
        actualType = 'angka';
      }
      // Otherwise unknown — don't emit warning
    }
  
    // Both expected and actualType use Karsa type names
    if (actualType && typeHint !== actualType) {
      this.addWarning('W4001', 
        `Type hint "${typeHint}" tidak cocok dengan nilai awal bertipe "${actualType}".`, 
        valueNode.loc, 
        `Gunakan nilai yang sesuai atau ubah type hint menjadi yang benar.`);
    }
  };
  
  // --- Symbol Lookup ---
  
  KarsaAnalyzer.prototype.lookupSymbol = function(name) {
    // [Bug 4 FIX] Lookup O(1) via Map, bukan O(n) linear scan
    if (this._symbolMap) {
      return this._symbolMap.get(name) || null;
    }
    // Fallback jika Map belum dibangun
    if (!this._currentAst || !this._currentAst.semantic || !this._currentAst.semantic.symbols) {
      return null;
    }
    var symbols = this._currentAst.semantic.symbols;
    for (var i = 0; i < symbols.length; i++) {
      if (symbols[i].name === name) {
        return symbols[i];
      }
    }
    return null;
  };
  
  /**
   * Cek apakah target adalah data turunan (read-only).
   * Digunakan oleh simpan, tambahkan, kurangi, sisipkan, perbarui.
   */
  KarsaAnalyzer.prototype.checkWriteToTurunan = function(node) {
    if (!node.target) return;
    var targetName = (typeof node.target === 'string') ? node.target : (node.target.name || null);
    if (!targetName) return;
    var symbol = node.targetSymbol || this.lookupSymbol(targetName);
    if (symbol && symbol.kind === 'turunan') {
      this.addError('E4004', 
        `Data turunan "${targetName}" bersifat read-only dan tidak boleh diubah.`, 
        node.loc, 
        'Gunakan data (var) biasa jika perlu mengubah nilainya.');
      return;
    }
    if (symbol && symbol.isWritable === false) {
      this.addError('E4101',
        `Target "${targetName}" tidak dapat ditulis berdasarkan metadata semantic.`,
        node.loc,
        'Gunakan target yang writable atau ubah deklarasi menjadi data/ubah sesuai kebutuhan.');
    }
  };
  
  /**
   * Cek apakah statement berada di dalam ekspresi turunan (side-effect check).
   */
  KarsaAnalyzer.prototype.checkSideEffectInTurunan = function(node) {
    if (this.context.inTurunanExpr) {
      this.addError('E4002', 
        'Ekspresi turunan tidak boleh mengandung aksi side-effect.', 
        node.loc, 
        'Hapus aksi simpan/tambahkan/kurangi/sisipkan dari ekspresi turunan.');
    }
  };
  
  
  
  /**
   * Refinement lvl.2: bangun dependency graph static dan normalized semantic view.
   */
  KarsaAnalyzer.prototype.buildSemanticGraph = function() {
    if (!this._currentAst || !this._currentAst.semantic) return;
  
    var graph = DependencyGraph.buildDependencyGraph(this._currentAst);
    this._currentAst.semantic.dependencies = graph.dependencies;
    this._currentAst.semantic.dependencyCycles = graph.cycles;
  
    if (graph.cycles && graph.cycles.length > 0) {
      for (var i = 0; i < graph.cycles.length; i++) {
        var cycle = graph.cycles[i];
        var names = this._symbolNamesFromIds(cycle.symbolIds || []);
        this.addError('E4201',
          'Dependency cycle pada data turunan: ' + names.join(' -> '),
          null,
          'Ubah salah satu ekspresi turunan agar tidak saling bergantung secara melingkar.');
      }
    }
  
    this._currentAst.semantic.normalized = DependencyGraph.normalizeSemantic(this._currentAst);
  };
  
  KarsaAnalyzer.prototype._symbolNamesFromIds = function(ids) {
    var symbols = this._currentAst && this._currentAst.semantic ? this._currentAst.semantic.symbols || [] : [];
    return ids.map(function(id) {
      for (var i = 0; i < symbols.length; i++) {
        if (symbols[i].id === id) return symbols[i].name;
      }
      return id;
    });
  };
  
  /**
   * Refinement lvl.1: gunakan metadata resolver untuk diagnostics usage dasar.
   * Rule ini sengaja konservatif: parameter tidak dilaporkan agar tidak bising,
   * dan declaration node tanpa loc valid dilewati.
   */
  KarsaAnalyzer.prototype.emitUsageWarnings = function() {
    if (!this._currentAst || !this._currentAst.semantic || !this._currentAst.semantic.symbols) return;
  
    var usageMode = this.options.usageWarnings || 'normal';
    if (usageMode === false || usageMode === 'off') return;
    var strictUsage = usageMode === 'strict';
  
    var symbols = this._currentAst.semantic.symbols;
    for (var i = 0; i < symbols.length; i++) {
      var sym = symbols[i];
      if (!sym || !sym.name || sym.kind === 'parameter') continue;
  
      // Mode normal sengaja tidak memperingatkan fungsi/komponen top-level agar
      // tidak bising pada library/component catalog. Gunakan --strict-usage untuk itu.
      if (!strictUsage && (sym.kind === 'fungsi' || sym.kind === 'komponen')) continue;
  
      // Hindari warning turunan jika sudah ada error fatal pada declaration node.
      if (sym.declarationNode && sym.declarationNode.type === 'ErrorNode') continue;
  
      var loc = sym.declarationNode && sym.declarationNode.loc ? sym.declarationNode.loc : null;
      var name = sym.name;
      var readCount = sym.readCount || 0;
      var writeCount = sym.writeCount || 0;
  
      // Deklarasi yang sama sekali tidak pernah dibaca atau ditulis setelah deklarasi.
      if (readCount === 0 && writeCount === 0) {
        this.addWarning('W4101',
          `Simbol "${name}" dideklarasikan tetapi tidak pernah digunakan.`,
          loc,
          'Hapus deklarasi jika tidak diperlukan, atau gunakan simbol tersebut.');
        continue;
      }
  
      // Data reaktif yang dimutasi tetapi tidak pernah dibaca adalah dead reactive state.
      if (sym.isReactive && sym.kind === 'data' && writeCount > 0 && readCount === 0) {
        this.addWarning('W4103',
          `Data reaktif "${name}" dimutasi ${writeCount} kali tetapi tidak pernah dibaca.`,
          loc,
          'Jika state reaktif tidak pernah dibaca, pertimbangkan ubah biasa atau hapus mutasinya.');
        continue;
      }
  
      // Simbol dimutasi tetapi nilainya tidak pernah dibaca.
      if (writeCount > 0 && readCount === 0) {
        this.addWarning('W4102',
          `Simbol "${name}" ditulis ${writeCount} kali tetapi tidak pernah dibaca.`,
          loc,
          'Pastikan nilai yang ditulis benar-benar dibaca, atau hapus penulisan yang tidak perlu.');
      }
    }
  };
  
  // --- Visitor Methods ---
  
  /**
   * Validasi Komponen (Section 8)
   */
  KarsaAnalyzer.prototype.visitKomponenDeclaration = function(node) {
    const prevInComponent = this.context.inComponent;
    this.context.inComponent = true;
  
    // 1. Validasi Parameter (Section 15.3 context)
    const paramNames = new Set();
    let foundDefault = false;
  
    if (node.params) {
      node.params.forEach(p => {
        // Duplicate check
        if (paramNames.has(p.name)) {
          this.addError('E4005', `Parameter "${p.name}" duplikat dalam komponen "${node.name}".`, p.loc, "Hapus salah satu deklarasi parameter.");
        }
        paramNames.add(p.name);
  
        // Default param order check
        if (p.defaultValue) {
          foundDefault = true;
        } else if (foundDefault) {
          this.addError('E4006', `Parameter tanpa nilai default tidak boleh diletakkan setelah parameter dengan default.`, p.loc, "Pindahkan parameter dengan default ke akhir daftar.");
        }
  
        if (p.defaultValue) this.checkTypeHint(p.typeHint, p.defaultValue);
      });
    }
  
    this.genericVisit(node);
    this.context.inComponent = prevInComponent;
  };
  
  /**
   * Validasi Lifecycle Hook (Section 5.4 / 8.5)
   */
  KarsaAnalyzer.prototype.visitLifecycleStatement = function(node) {
    if (!this.context.inComponent) {
      this.addError('E4001', `Lifecycle hook "saat komponen ${node.kind}" hanya valid di dalam komponen.`, node.loc, "Pindahkan blok ini ke dalam definisi komponen.");
    }
    
    if (this.context.loopDepth > 0 || this.context.handlerDepth > 0) {
      this.addWarning('W4002', `Lifecycle hook sebaiknya tidak diletakkan di dalam loop atau handler.`, node.loc);
    }
  
    this.genericVisit(node);
  };
  
  /**
   * Validasi Turunan (Section 7.4)
   */
  KarsaAnalyzer.prototype.visitTurunanDeclaration = function(node) {
    const prevInTurunan = this.context.inTurunanExpr;
    this.context.inTurunanExpr = true;
    
    this.genericVisit(node);
    this.context.inTurunanExpr = prevInTurunan;
  };
  
  /**
   * Validasi Type Hint pada Deklarasi Data (Section 7.3)
   */
  KarsaAnalyzer.prototype.visitDataDeclaration = function(node) {
    if (node.typeHint && node.init) {
      this.checkTypeHint(node.typeHint, node.init);
    }
    this.genericVisit(node);
  };
  
  KarsaAnalyzer.prototype.visitTetapDeclaration = function(node) {
    if (node.typeHint && node.init) {
      this.checkTypeHint(node.typeHint, node.init);
    }
    // W4003: tetap tanpa nilai awal
    if (!node.init) {
      this.addWarning('W4003', `Deklarasi "tetap" untuk "${node.name}" tanpa nilai awal.`, node.loc, 'Berikan nilai awal untuk konstanta.');
    }
    this.genericVisit(node);
  };
  
  KarsaAnalyzer.prototype.visitUbahDeclaration = function(node) {
    if (node.typeHint && node.init) {
      this.checkTypeHint(node.typeHint, node.init);
    }
    this.genericVisit(node);
  };
  
  /**
   * Validasi Reaktivitas & Assignment (Section 7.5)
   */
  KarsaAnalyzer.prototype.visitSimpanStatement = function(node) {
    // Cek side-effect dalam turunan
    this.checkSideEffectInTurunan(node);
    // Cek apakah target adalah turunan (read-only)
    this.checkWriteToTurunan(node);
  
    this.genericVisit(node);
  };
  
  // ─── Mutation Statements (C5/M1 FIX) ──────────────────────
  
  KarsaAnalyzer.prototype.visitTambahkanStatement = function(node) {
    this.checkSideEffectInTurunan(node);
    this.checkWriteToTurunan(node);
    this.genericVisit(node);
  };
  
  KarsaAnalyzer.prototype.visitKurangiStatement = function(node) {
    this.checkSideEffectInTurunan(node);
    this.checkWriteToTurunan(node);
    this.genericVisit(node);
  };
  
  KarsaAnalyzer.prototype.visitSisipkanStatement = function(node) {
    this.checkSideEffectInTurunan(node);
    this.checkWriteToTurunan(node);
    this.genericVisit(node);
  };
  
  // ─── PerbaruiStatement (C5 FIX) ────────────────────────────
  KarsaAnalyzer.prototype.visitPerbaruiStatement = function(node) {
    // Cek side-effect dalam turunan
    this.checkSideEffectInTurunan(node);
    // Cek apakah target adalah turunan (read-only)
    this.checkWriteToTurunan(node);
    this.genericVisit(node);
  };
  
  // ─── GunakanStatement (H4 FIX) ─────────────────────────────
  KarsaAnalyzer.prototype.visitGunakanStatement = function(node) {
    if (node.componentName) {
      var symbol = this.lookupSymbol(node.componentName);
      if (symbol && symbol.kind !== 'komponen') {
        this.addError('E4010', `"${node.componentName}" bukan komponen, tidak dapat digunakan dengan "gunakan".`, node.loc, 'Pastikan nama yang direferensikan adalah komponen (PascalCase).');
      }
    }
    this.genericVisit(node);
  };
  
  // ─── TampilkanStatement (H4 FIX) ───────────────────────────
  KarsaAnalyzer.prototype.visitTampilkanStatement = function(node) {
    const validModes = ["tambahkan", "ganti", "awalan", "sebelum", "sesudah"];
    if (node.mode && validModes.indexOf(node.mode) === -1) {
      this.addError('E4007', `Mode "${node.mode}" tidak dikenal.`, node.loc, `Mode yang valid: ${validModes.join(", ")}.`);
    }
    this.genericVisit(node);
  };
  
  // ─── SembunyikanStatement (H4 FIX) ─────────────────────────
  KarsaAnalyzer.prototype.visitSembunyikanStatement = function(node) {
    this.genericVisit(node);
  };
  
  // ─── HapusStatement (H4 FIX) ───────────────────────────────
  KarsaAnalyzer.prototype.visitHapusStatement = function(node) {
    this.genericVisit(node);
  };
  
  // ─── KosongkanStatement (H4 FIX) ───────────────────────────
  KarsaAnalyzer.prototype.visitKosongkanStatement = function(node) {
    this.genericVisit(node);
  };
  
  // ─── ArahkanStatement (H4 FIX) ─────────────────────────────
  KarsaAnalyzer.prototype.visitArahkanStatement = function(node) {
    this.genericVisit(node);
  };
  
  // ─── SetelahStatement (H4 FIX) ─────────────────────────────
  KarsaAnalyzer.prototype.visitSetelahStatement = function(node) {
    this.genericVisit(node);
  };
  
  // ─── AmbilDomStatement (H4 FIX) ────────────────────────────
  KarsaAnalyzer.prototype.visitAmbilDomStatement = function(node) {
    this.genericVisit(node);
  };
  
  // ─── AmbilLuarStatement (H4 FIX) ───────────────────────────
  KarsaAnalyzer.prototype.visitAmbilLuarStatement = function(node) {
    this.genericVisit(node);
  };
  
  /**
   * Validasi Kontrol Alur (Section 6.5)
   * [H6 FIX] E6xxx → E4xxx baru
   */
  KarsaAnalyzer.prototype.visitBerhentiStatement = function(node) {
    const isValid = this.context.loopDepth > 0 || this.context.handlerDepth > 0;
    if (!isValid) {
      this.addError('E4011', '"berhenti" tidak valid di luar loop atau event handler.', node.loc, '"berhenti" hanya valid di dalam loop atau event handler.');
    }
    if (this.context.inFunction && this.context.loopDepth === 0 && this.context.handlerDepth === 0) {
      this.addError('E4011', '"berhenti" di dalam fungsi (bukan loop/handler) tidak valid.', node.loc, 'Gunakan "kembalikan" untuk keluar dari fungsi.');
    }
  };
  
  KarsaAnalyzer.prototype.visitLewatiStatement = function(node) {
    if (this.context.loopDepth === 0) {
      this.addError('E4012', '"lewati" tidak valid di luar loop.', node.loc, 'Gunakan "lewati" hanya di dalam "ulangi" atau "selama".');
    }
  };
  
  KarsaAnalyzer.prototype.visitKembalikanStatement = function(node) {
    if (!this.context.inFunction && !this.context.inComponent) {
      this.addError('E4013', '"kembalikan" tidak valid di luar fungsi atau komponen.', node.loc, 'Gunakan "kembalikan" hanya di dalam fungsi atau komponen.');
    }
  };
  
  /**
   * Validasi Konteks Loop & Handler
   */
  KarsaAnalyzer.prototype.visitUlangiStatement = function(node) {
    this.context.loopDepth++;
    this.genericVisit(node);
    this.context.loopDepth--;
  };
  
  KarsaAnalyzer.prototype.visitSelamaStatement = function(node) {
    this.context.loopDepth++;
    this.genericVisit(node);
    this.context.loopDepth--;
  };
  
  KarsaAnalyzer.prototype.visitKetikaStatement = function(node) {
    this.context.handlerDepth++;
    this.genericVisit(node);
    this.context.handlerDepth--;
  };
  
  KarsaAnalyzer.prototype.visitFungsiDeclaration = function(node) {
    const prevInFunc = this.context.inFunction;
    this.context.inFunction = true;
    this.genericVisit(node);
    this.context.inFunction = prevInFunc;
  };
  
  /**
   * Validasi Watcher (Section 7.6)
   */
  KarsaAnalyzer.prototype.visitSaatStatement = function(node) {
    var symbol = node.targetSymbol || this.lookupSymbol(node.target);
    if (symbol && symbol.isReactive === false) {
      this.addWarning('W4104',
        `Watcher target "${node.target}" bukan data reaktif menurut analyzer.`,
        node.loc,
        'Gunakan data/turunan reaktif sebagai target watcher.');
    }
    this.genericVisit(node);
  };
  
  module.exports = KarsaAnalyzer;

  root.KarsaAnalyzer = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// COMPILER RUNTIME EMITTER — KarsaRuntimeEmitter
// ============================================================
(function(root) {
  "use strict";

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — Runtime Helper Emitter
   * ----------------------------------------------------------------------------
   * Refinement lvl.4C: runtime helper emitter dipisah dari compiler utama.
   */
  
  'use strict';
  
  const RUNTIME_HELPERS = `
  const __subscribers = new WeakMap();
  const __effectMap = new WeakMap();
  let __activeEffect = null;
  let __effectId = 0;
  
  function __createReactive(val) {
    const obj = { value: val, __id: ++__effectId };
    const proxy = new Proxy(obj, {
      get(target, prop) {
        if (__activeEffect && prop === 'value') {
          let subs = __subscribers.get(proxy) || new Set();
          subs.add(__activeEffect);
          __subscribers.set(proxy, subs);
          if (__activeEffect.__deps) __activeEffect.__deps.add(proxy);
        }
        return target[prop];
      },
      set(target, prop, newVal) {
        const oldVal = target[prop];
        target[prop] = newVal;
        if (prop === 'value' && oldVal !== newVal) {
          const subs = __subscribers.get(proxy);
          if (subs) {
            const subsCopy = Array.from(subs);
            for (let i = 0; i < subsCopy.length; i++) subsCopy[i](newVal, oldVal);
          }
        }
        return true;
      }
    });
    return proxy;
  }
  
  function __createComputed(fn) {
    const reactive = __createReactive(null);
    const effect = function computedEffect() {
      __activeEffect = effect;
      try { reactive.value = fn(); } catch(e) { /* defer if deps not ready */ }
      __activeEffect = null;
    };
    effect.__deps = new Set();
    effect.__isComputed = true;
    effect();
    __effectMap.set(reactive, effect);
    return reactive;
  }
  
  function __watch(reactive, cb) {
    const effect = function watchEffect(n, o) { cb(n, o); };
    effect.__deps = new Set();
    let subs = __subscribers.get(reactive) || new Set();
    subs.add(effect);
    __subscribers.set(reactive, subs);
    const unsub = function unsubscribe() {
      const subs = __subscribers.get(reactive);
      if (subs) subs.delete(effect);
    };
    return unsub;
  }
  
  function __setState(reactive, val) {
    reactive.value = val;
  }
  
  function __createElement(tag, props, children) {
    if (!props) props = {};
    if (!children) children = [];
    const el = document.createElement(tag === 'fragmen' ? 'div' : tag);
    if (props.id) el.id = props.id;
    if (props.className) el.className = props.className;
    if (props.innerText) el.innerText = props.innerText;
    if (props.src) el.src = props.src;
    if (props.href) el.href = props.href;
    children.forEach(function(child) { el.appendChild(child); });
    return el;
  }
  
  function __mount(target, parent) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) {
      if (parent) {
        const parentEl = typeof parent === 'string' ? document.querySelector(parent) : parent;
        if (parentEl) parentEl.appendChild(el);
      } else {
        document.body.appendChild(el);
      }
    }
  }
  
  function __cleanup(reactive) {
    const effect = __effectMap.get(reactive);
    if (effect && effect.__deps) {
      effect.__deps.forEach(function(dep) {
        const subs = __subscribers.get(dep);
        if (subs) subs.delete(effect);
      });
      effect.__deps.clear();
    }
    const subs = __subscribers.get(reactive);
    if (subs) subs.clear();
  }
  
  // ============================================================================
  // KARSA Builtin Helper Functions — Fungsi bawaan KARSA
  // ============================================================================
  // Catatan: panjang() diterjemahkan langsung ke .length oleh expression lowering,
  // jadi tidak perlu runtime helper. Helper di bawah ini untuk builtins yang
  // memerlukan logika tambahan.
  
  function __karsa_panjang(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'string' || Array.isArray(val)) return val.length;
    if (typeof val === 'object' && val.hasOwnProperty('value')) return __karsa_panjang(val.value);
    return 0;
  }
  
  function __karsa_apakahKosong(val) {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string' && val === '') return true;
    if (Array.isArray(val) && val.length === 0) return true;
    if (typeof val === 'object' && val.hasOwnProperty('value')) return __karsa_apakahKosong(val.value);
    return false;
  }
  
  function __karsa_apakahAda(arr, item) {
    if (arr === null || arr === undefined) return false;
    if (typeof arr === 'object' && arr.hasOwnProperty('value')) return __karsa_apakahAda(arr.value, item);
    if (Array.isArray(arr)) return arr.includes(item);
    if (typeof arr === 'string') return arr.indexOf(item) !== -1;
    return false;
  }
  `;
  
  function emitRuntimeHelpers(compiler) {
    compiler.emit("// === Runtime Helpers ===");
    compiler.output.push(RUNTIME_HELPERS.trim());
    compiler.emit("");
  }
  
  module.exports = {
    RUNTIME_HELPERS,
    emitRuntimeHelpers
  };
  

  root.KarsaRuntimeEmitter = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// COMPILER CODEGEN UTILS — KarsaCodegen
// ============================================================
(function(root) {
  "use strict";

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — Compiler Codegen Utilities
   * ----------------------------------------------------------------------------
   * Refinement lvl.4D: utilitas codegen dasar dipisah dari compiler utama.
   */
  
  'use strict';
  
  function emit(ctx, code) {
    const spacing = '  '.repeat(ctx.indent || 0);
    ctx.output.push(spacing + code);
  }
  
  function genVar(ctx, prefix) {
    prefix = prefix || 'v';
    ctx.varCounter = (ctx.varCounter || 0) + 1;
    return `__${prefix}_${ctx.varCounter}`;
  }
  
  function escapeString(value) {
    return JSON.stringify(String(value));
  }
  
  module.exports = {
    emit,
    genVar,
    escapeString
  };
  

  root.KarsaCodegen = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// EXPRESSION LOWERING — KarsaExpressionLowering
// ============================================================
(function(root) {
  "use strict";

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — Expression Lowering
   * ----------------------------------------------------------------------------
   * Refinement lvl.4E: expression lowering dipisah dari compiler utama.
   *
   * v0.3.1-patch2: Fix BUG-3, BUG-4, BUG-5
   *   - Built-in function calls (panjang, tipeData, apakahArray, dll.) 
   *     diturunkan ke JavaScript yang benar
   *   - Mutating array methods pada variabel reaktif (push, pop, splice, dll.)
   *     sekarang memicu reaktivitas dengan spread assignment
   *   - Alias method Indonesia (untukSetiap, sisip, dll.) diterjemahkan
   *     oleh resolver dan ditangani di sini
   */
  
  'use strict';
  
  // Method yang bermutasi array (tidak mengubah reference, jadi Proxy setter tidak terpicu)
  const MUTATING_ARRAY_METHODS = new Set([
    'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill'
  ]);
  
  function lowerExpression(compiler, node) {
    if (!node) return 'undefined';
    
    switch(node.type) {
      case 'Literal':
        return JSON.stringify(node.value);
      case 'Identifier':
        if (node.resolved && (node.resolved.kind === 'data' || node.resolved.kind === 'turunan')) {
          return `${node.name}.value`;
        }
        return node.name;
      case 'BinaryExpression':
        const ops = { 
          'sama dengan': '===', 
          'tidak sama dengan': '!==', 
          'dan': '&&', 
          'atau': '||',
          'paling sedikit': '>=',   
          'paling banyak': '<=',      
          'lebih dari': '>',       
          'kurang dari': '<',
          'tambah': '+',
          'kurang': '-',
          'kali': '*',
          'bagi': '/',
          'mod': '%',
          'pangkat': '**'
        };
        const op = ops[node.operator] || node.operator;
        return `(${lowerExpression(compiler, node.left)} ${op} ${lowerExpression(compiler, node.right)})`;
      case 'UnaryExpression':
        const unaryOps = {
          'tidak': '!',
          'negatif': '-'
        };
        const uop = unaryOps[node.operator] || node.operator;
        if (node.prefix !== false) {
          return `(${uop}${lowerExpression(compiler, node.operand)})`;
        }
        return `(${lowerExpression(compiler, node.operand)}${uop})`;
      case 'MemberExpression':
        let prop = node.property.name;
        const objCode = lowerExpression(compiler, node.object);
        // Jika objek adalah identifier reaktif (data/turunan), ekspresi sudah menghasilkan .value
        // Jadi kita bisa langsung akses properti method array seperti push, forEach, dll
        return `${objCode}.${prop}`;
      case 'CallExpression':
        return lowerCallExpression(compiler, node);
      case 'ObjectLiteral':
        if (node.properties && node.properties.length > 0) {
          const pairs = node.properties.map(p => {
            const val = lowerExpression(compiler, p.value);
            return `"${p.key}": ${val}`;
          });
          return `{ ${pairs.join(', ')} }`;
        }
        return '{}';
      case 'ArrayLiteral':
        if (node.elements && node.elements.length > 0) {
          const elems = node.elements.map(e => lowerExpression(compiler, e));
          return `[${elems.join(', ')}]`;
        }
        return '[]';
      case 'JalankanExpression':
        return compiler.visitJalankanExpression(node);
      case 'PanggilNativeExpression':
        return compiler.visitPanggilNativeExpression(node);
      case 'Selector':
        return compiler.resolveTarget(node);
      case 'PropertyNode':
        return lowerExpression(compiler, node.value);
      case 'FetchBranch':
      case 'FetchOption':
        return 'undefined';
      case 'ErrorNode':
        return 'undefined';
      default:
        // Unknown node type — emit warning comment
        console.warn(`[KARSA Compiler] Unknown expression type: ${node.type}`);
        return 'undefined';
    }
  }
  
  /**
   * Menurunkan CallExpression ke JavaScript.
   * Menangani:
   *   - Fungsi bawaan (builtins): panjang(arr) → arr.value.length, dll.
   *   - Method call pada variabel reaktif: arr.push(x) → arr.value.push(x); arr.value = [...arr.value]
   *   - Method call non-mutating: arr.forEach(...) → arr.value.forEach(...)
   *   - Panggilan fungsi biasa: myFunc(args)
   */
  function lowerCallExpression(compiler, node) {
    // ── Kasus 1: Fungsi bawaan (builtin) ──────────────────────────────
    if (node.isBuiltin && node.builtinInfo) {
      return lowerBuiltinCall(compiler, node);
    }
  
    // ── Kasus 2: Method call pada objek reaktif ───────────────────────
    if (node.callee && node.callee.type === 'MemberExpression') {
      return lowerMethodCall(compiler, node);
    }
  
    // ── Kasus 3: Panggilan fungsi biasa ───────────────────────────────
    const callArgs = node.arguments.map(a => lowerExpression(compiler, a)).join(', ');
    const calleeCode = lowerExpression(compiler, node.callee);
    return `${calleeCode}(${callArgs})`;
  }
  
  /**
   * Menurunkan panggilan fungsi bawaan (builtin) ke JavaScript.
   * panjang(arr) → arr.value.length  (atau arr.length jika bukan reaktif)
   * tipeData(x) → typeof x
   * apakahArray(x) → Array.isArray(x)
   * dll.
   */
  function lowerBuiltinCall(compiler, node) {
    const builtin = node.builtinInfo;
    const args = node.arguments.map(a => lowerExpression(compiler, a));
  
    // Prefix operator (typeof)
    if (node.isPrefixBuiltin || builtin.prefix) {
      return `${builtin.jsName} ${args[0]}`;
    }
  
    // Helper functions yang memerlukan runtime helper
    if (builtin.helper) {
      switch (builtin.jsName) {
        case '__karsa_panjang': {
          // panjang(arr) → arr.length (unwrap .value jika reaktif, arg sudah di-lower)
          // arg sudah di-lower oleh lowerExpression, jadi jika reaktif sudah ada .value
          return `${args[0]}.length`;
        }
        case '__karsa_apakahKosong': {
          // apakahKosong(arr) → (Array.isArray(x) ? x.length === 0 : x === null || x === undefined || x === '')
          return `(${args[0]} === null || ${args[0]} === undefined || (Array.isArray(${args[0]}) && ${args[0]}.length === 0) || ${args[0]} === '')`;
        }
        case '__karsa_gabung': {
          // gabung(arr, pemisah) → arr.join(pemisah)
          const separator = args[1] || '","';
          return `${args[0]}.join(${separator})`;
        }
        case '__karsa_saring': {
          // saring(arr, fn) → arr.filter(fn)
          return `${args[0]}.filter(${args[1]})`;
        }
        case '__karsa_pilih': {
          // pilih(arr, fn) → arr.map(fn)
          return `${args[0]}.map(${args[1]})`;
        }
        case '__karsa_urutkan': {
          // urutkan(arr) → [...arr].sort() (salin dulu agar tidak bermutasi)
          return `[...${args[0]}].sort(${args[1] || ''})`;
        }
        case '__karsa_balik': {
          // balik(arr) → [...arr].reverse() (salin dulu agar tidak bermutasi)
          return `[...${args[0]}].reverse()`;
        }
        case '__karsa_temukan': {
          // temukan(arr, fn) → arr.find(fn)
          return `${args[0]}.find(${args[1]})`;
        }
        case '__karsa_apakahAda': {
          // apakahAda(arr, item) → arr.includes(item)
          return `${args[0]}.includes(${args[1]})`;
        }
        default:
          // Fallback: gunakan jsName langsung
          return `${builtin.jsName}(${args.join(', ')})`;
      }
    }
  
    // Non-helper builtins (langsung ke JS native)
    // keTeks(x) → String(x), keAngka(x) → Number(x), dll.
    return `${builtin.jsName}(${args.join(', ')})`;
  }
  
  /**
   * Menurunkan method call pada objek (arr.method(args)).
   * Menangani:
   *   - Mutating methods pada variabel reaktif: picu reaktivitas
   *   - Non-mutating methods: langsung panggil
   */
  function lowerMethodCall(compiler, node) {
    const callArgs = node.arguments.map(a => lowerExpression(compiler, a)).join(', ');
    const calleeCode = lowerExpression(compiler, node.callee);
    const methodName = node.callee.property.name; // sudah ditranslasi oleh resolver
  
    // Cek apakah ini mutating method pada variabel reaktif
    const isMutating = MUTATING_ARRAY_METHODS.has(methodName);
    const objectIsReactive = isObjectReactive(node.callee.object);
  
    if (isMutating && objectIsReactive) {
      // [BUG-4 FIX] Method yang bermutasi array pada variabel reaktif
      // harus memicu Proxy setter dengan assignment baru.
      // arr.value.push(x) → (arr.value.push(x), arr.value = [...arr.value])
      // Menggunakan comma operator agar ekspresi mengembalikan hasil push
      // sekaligus memicu reaktivitas.
      const objExpr = lowerExpression(compiler, node.callee.object);
      // objExpr sudah mengandung .value karena reaktif
      return `(function() { var __r = ${calleeCode}(${callArgs}); ${objExpr} = [...${objExpr}]; return __r; })()`;
    }
  
    // Non-mutating atau non-reaktif: panggil biasa
    return `${calleeCode}(${callArgs})`;
  }
  
  /**
   * Cek apakah objek ekspresi adalah variabel reaktif (data/turunan).
   * Menggunakan metadata resolver yang dilampirkan ke Identifier node.
   */
  function isObjectReactive(objectNode) {
    if (!objectNode) return false;
  
    // Jika node adalah Identifier, cek metadata resolved
    if (objectNode.type === 'Identifier' && objectNode.resolved) {
      return objectNode.resolved.kind === 'data' || objectNode.resolved.kind === 'turunan';
    }
  
    // Jika node adalah MemberExpression yang mengakses .value dari reaktif,
    // maka .object dari MemberExpression parent adalah reaktif
    if (objectNode.type === 'MemberExpression') {
      return isObjectReactive(objectNode.object);
    }
  
    // Default: anggap tidak reaktif
    return false;
  }
  
  module.exports = { lowerExpression };
  

  root.KarsaExpressionLowering = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// STATEMENT EMITTERS — KarsaStatementEmitters
// ============================================================
(function(root) {
  "use strict";

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — Statement Emitters
   * ----------------------------------------------------------------------------
   * Refinement lvl.4F: statement visitor emitters dipisah dari compiler utama.
   */
  
  'use strict';
  
  function install(KarsaCompiler, accept) {
    // ═══════════════════════════════════════════════════════════
    // VISITOR IMPLEMENTATIONS — DECLARATIONS
    // ═══════════════════════════════════════════════════════════
  
    KarsaCompiler.prototype.visitDataDeclaration = function(node) {
      const initVal = this.lowerExpression(node.init);
      this.emit(`const ${node.name} = __createReactive(${initVal});`);
    };
  
    KarsaCompiler.prototype.visitTetapDeclaration = function(node) {
      const initVal = this.lowerExpression(node.init);
      this.emit(`const ${node.name} = ${initVal};`);
    };
  
    KarsaCompiler.prototype.visitUbahDeclaration = function(node) {
      const initVal = this.lowerExpression(node.init);
      this.emit(`let ${node.name} = ${initVal};`);
    };
  
    KarsaCompiler.prototype.visitTurunanDeclaration = function(node) {
      const expr = this.lowerExpression(node.init);
      this.emit(`const ${node.name} = __createComputed(() => ${expr});`);
    };
  
    KarsaCompiler.prototype.visitKomponenDeclaration = function(node) {
      // Component = factory function yang mengembalikan DOM element
      const params = node.params.map(p => p.name).join(', ');
      const componentVar = `__komp_${node.name}`;
  
      this.emit(`function ${componentVar}(${params}) {`);
      this.indent++;
      this.emit(`// Component: ${node.name}`);
      this.emit(`const __root = document.createElement("div");`);
  
      // Set currentParent agar child elements di-append ke __root
      const prevParent = this.currentParent;
      this.currentParent = '__root';
  
      // Visit body (berisi buat, ketika, dll)
      if (node.body) accept(node.body, this);
  
      this.currentParent = prevParent;
  
      // Register lifecycle hooks jika ada
      this.emit(`return __root;`);
      this.indent--;
      this.emit(`}`);
  
      // Expose component factory globally
      this.emit(`window.${node.name} = ${componentVar};`);
    };
  
    KarsaCompiler.prototype.visitFungsiDeclaration = function(node) {
      const params = node.params.map(p => p.name).join(', ');
      this.emit(`function ${node.name}(${params}) {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit("}");
    };
  
    // ═══════════════════════════════════════════════════════════
    // VISITOR IMPLEMENTATIONS — DOM STRUCTURE
    // ═══════════════════════════════════════════════════════════
  
    KarsaCompiler.prototype.visitBuatStatement = function(node) {
      const varName = this.genVar('el');
      node.compiledVarName = varName; // Simpan untuk child reference
  
      // Tag alias mapping
      const tagAliases = {
        'tombol': 'button',
        'ruang': 'div',
        'judul': 'h1',
        'subjudul': 'h2',
        'paragraf': 'p',
        'gambar': 'img',
        'tautan': 'a',
        'masukan': 'input',
        'pilihan': 'select',
        'kolom': 'textarea',
        'tabel': 'table',
        'artikel': 'article',
        'kanvas': 'canvas',
        'opsi': 'option',
        'fragmen': 'fragment',
        'wadjud': 'h1',
        'wadah': 'div',
        'kotak': 'div',
        'frm': 'form',
        'frmMasuk': 'form'
      };
  
      const tag = tagAliases[node.selector.tag] || node.selector.tag;
      this.emit(`const ${varName} = document.createElement("${tag}");`);
  
      if (node.selector.id) {
        this.emit(`${varName}.id = "${node.selector.id}";`);
      }
      if (node.selector.classes && node.selector.classes.length > 0) {
        this.emit(`${varName}.className = "${node.selector.classes.join(' ')}";`);
      }
  
      // Attributes dari selector
      if (node.selector.attributes && node.selector.attributes.length > 0) {
        node.selector.attributes.forEach(attr => {
          const attrVal = attr.value ? this.lowerExpression(attr.value) : '""';
          this.emit(`${varName}.setAttribute("${attr.key}", ${attrVal});`);
        });
      }
  
      // Properti
      if (node.properties) {
        node.properties.forEach(p => {
          const val = this.lowerExpression(p.value);
          if (p.key === 'teks') this.emit(`${varName}.innerText = ${val};`);
          else if (p.key === 'html') this.emit(`${varName}.innerHTML = ${val};`);
          else if (p.key === 'nilai') this.emit(`${varName}.value = ${val};`);
          else this.emit(`${varName}.setAttribute("${p.key}", ${val});`);
        });
      }
  
      // Simpan parent current untuk append
      const prevParent = this.currentParent;
      this.currentParent = varName;
  
      if (node.body) accept(node.body, this);
      if (node.action) accept(node.action, this);
  
      this.currentParent = prevParent;
  
      if (!this.currentParent) {
        this.emit(`document.body.appendChild(${varName});`);
      } else {
        this.emit(`${this.currentParent}.appendChild(${varName});`);
      }
    };
  
    KarsaCompiler.prototype.visitTampilkanStatement = function(node) {
      // Handle message kinds: pesan, pesan-error, notifikasi
      if (node.messageKind) {
        const msgVal = this.lowerExpression(node.target);
        if (node.messageKind === 'pesan') {
          this.emit(`alert(${msgVal});`);
        } else if (node.messageKind === 'pesan-error') {
          this.emit(`console.error(${msgVal});`);
        } else if (node.messageKind === 'notifikasi') {
          this.emit(`if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { new Notification(${msgVal}); } else { alert(${msgVal}); };`);
        }
        return;
      }
  
      // Normal element show/mount
      const target = this.resolveTarget(node.target);
      const mountTarget = node.mountTarget ? this.resolveTarget(node.mountTarget) : null;
  
      if (mountTarget) {
        this.emit(`__mount(${target}, ${mountTarget});`);
      } else {
        // Show element (remove display:none if hidden)
        this.emit(`{ const __el = ${target}; if (__el) __el.style.display = ''; };`);
      }
    };
  
    KarsaCompiler.prototype.visitSembunyikanStatement = function(node) {
      const target = this.resolveTarget(node.target);
      this.emit(`{ const __el = ${target}; if (__el) __el.style.display = 'none'; };`);
    };
  
    KarsaCompiler.prototype.visitHapusStatement = function(node) {
      const target = this.resolveTarget(node.target);
      this.emit(`{ const __el = ${target}; if (__el && __el.parentElement) __el.parentElement.removeChild(__el); };`);
    };
  
    KarsaCompiler.prototype.visitHapusDariStatement = function(node) {
      const item = this.lowerExpression(node.item);
      const arr = node.fromArray;
      const isReactive = node.fromArrayReactive;
  
      if (isReactive) {
        // Reactive array: use filter to remove item and trigger Proxy setter
        // arr.value = arr.value.filter(__item => __item !== item)
        this.emit(`${arr}.value = ${arr}.value.filter((__item) => __item !== ${item});`);
      } else {
        // Non-reactive array: use filter with assignment
        this.emit(`${arr} = ${arr}.filter((__item) => __item !== ${item});`);
      }
    };
  
    KarsaCompiler.prototype.visitKosongkanStatement = function(node) {
      const target = this.resolveTarget(node.target);
      this.emit(`{ const __el = ${target}; if (__el) __el.innerHTML = ''; };`);
    };
  
    KarsaCompiler.prototype.visitPerbaruiStatement = function(node) {
      const val = this.lowerExpression(node.value);
      const target = this.resolveTarget(node.target);
  
      const propertyMap = {
        'teks': 'innerText',
        'html': 'innerHTML',
        'nilai': 'value',
        'kelas': 'className',
        'gaya': 'style.cssText',
        'sumber': 'src',
        'src': 'src',
        'tautan': 'href',
        'href': 'href',
        'tipe': 'type',
        'nama': 'name',
        'ditandai': 'checked',
        'nonaktif': 'disabled',
        'placeholder': 'placeholder',
        'atribut': 'setAttribute'
      };
  
      const jsProp = propertyMap[node.property];
      if (jsProp) {
        this.emit(`${target}.${jsProp} = ${val};`);
      } else {
        this.emit(`${target}.setAttribute("${node.property}", ${val});`);
      }
    };
  
    // ═══════════════════════════════════════════════════════════
    // VISITOR IMPLEMENTATIONS — BEHAVIOR & EVENTS
    // ═══════════════════════════════════════════════════════════
  
    KarsaCompiler.prototype.visitKetikaStatement = function(node) {
      const eventMap = {
        'diklik': 'click',
        'diketik': 'input',
        'disubmit': 'submit',
        'diubah': 'change',
        'ditekan': 'keydown',
        'dilepas': 'keyup',
        'dimuat': 'DOMContentLoaded',
        'difokus': 'focus',
        'diblur': 'blur',
        'ditinggal': 'blur',
        'diarahkan': 'mouseover',
        'ditinggal-kursor': 'mouseout',
        'digulir': 'scroll',
        'diseret': 'dragstart',
        'diubahukuran': 'resize',
        'dipindah': 'drag',
        'dikirim': 'submit',
        'direset': 'reset',
        'dikonteks': 'contextmenu',
        'dilewat': 'paste',
        'masuk': 'mouseenter',
        'keluar': 'mouseleave',
        'aktif': 'focus',
        'nonaktif': 'blur',
        'muat': 'load',
        'salah': 'error',
        'dipasang': '__karsa_mounted',
        'dilepas-dari-dom': '__karsa_unmounted'
      };
  
      const eventName = eventMap[node.event] || node.event;
      let target = 'document';
  
      if (node.target) {
        if (node.target.type === 'SelfReference') {
          target = node.target.referencedNode.compiledVarName || 'null';
        } else if (node.target.type === 'Identifier') {
          if (node.target.name === 'halaman') {
            target = 'document';
          } else {
            target = node.target.name;
          }
        } else if (node.target.type === 'Selector') {
          target = this.resolveTarget(node.target);
        } else if (node.target.type === 'Literal') {
          target = `document.querySelector("${node.target.value}")`;
        }
      }
  
      // Custom events (mounted/unmounted) need MutationObserver
      if (eventName === '__karsa_mounted' || eventName === '__karsa_unmounted') {
        const domEvent = eventName === '__karsa_mounted' ? 'DOMNodeInserted' : 'DOMNodeRemoved';
        this.emit(`${target}.addEventListener("${domEvent}", (event) => {`);
      } else if (eventName === 'DOMContentLoaded') {
        this.emit(`document.addEventListener("DOMContentLoaded", (event) => {`);
      } else {
        this.emit(`${target}.addEventListener("${eventName}", (event) => {`);
      }
  
      this.indent++;
      if (node.event === 'disubmit') this.emit("event.preventDefault();");
  
      if (node.body) accept(node.body, this);
      if (node.action) accept(node.action, this);
  
      this.indent--;
      this.emit("});");
    };
  
    KarsaCompiler.prototype.visitSaatStatement = function(node) {
      this.emit(`__watch(${node.target}, (nilaiBaru, nilaiLama) => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit("});");
    };
  
    KarsaCompiler.prototype.visitLifecycleStatement = function(node) {
      // Lifecycle hooks: dipasang, dilepas, diperbarui
      const lifecycleMap = {
        'dipasang': '__karsa_mounted',
        'dilepas': '__karsa_unmounted',
        'diperbarui': '__karsa_updated'
      };
      const hookName = lifecycleMap[node.kind] || node.kind;
  
      // Emit as custom event dispatch or callback registration
      this.emit(`// Lifecycle: saat komponen ${node.kind}`);
      if (node.kind === 'dipasang') {
        // mounted — schedule to run after DOM is ready
        this.emit(`if (document.readyState === 'loading') {`);
        this.indent++;
        this.emit(`document.addEventListener('DOMContentLoaded', () => {`);
        this.indent++;
        accept(node.body, this);
        this.indent--;
        this.emit(`});`);
        this.indent--;
        this.emit(`} else {`);
        this.indent++;
        accept(node.body, this);
        this.indent--;
        this.emit(`}`);
      } else if (node.kind === 'dilepas') {
        // unmounted — use beforeunload as approximation
        this.emit(`window.addEventListener('beforeunload', () => {`);
        this.indent++;
        accept(node.body, this);
        this.indent--;
        this.emit(`});`);
      } else {
        // Generic lifecycle — just emit the body
        accept(node.body, this);
      }
    };
  
    KarsaCompiler.prototype.visitSetelahStatement = function(node) {
      // "setelah X selesai" — X adalah nama operasi/fungsi async
      // Lower to: X().then(() => { ... }) atau callback setelah pemanggilan
      const target = node.target;
  
      // [Bug 3 FIX] Cek apakah target adalah fungsi KARSA yang sudah di-resolve.
      // Jika ya, panggil langsung tanpa typeof check (fungsi KARSA selalu lokal).
      // Jika tidak, gunakan typeof check untuk keamanan (external/async).
      const isKarsaFunction = node.targetSymbol && node.targetSymbol.isFunction;
      const callExpr = isKarsaFunction ? `${target}()` : `(typeof ${target} === 'function' ? ${target}() : ${target})`;
  
      this.emit(`// setelah ${target} selesai`);
      if (node.body) {
        this.emit(`Promise.resolve(${callExpr}).then((__result) => {`);
        this.indent++;
        accept(node.body, this);
        this.indent--;
        this.emit(`});`);
      } else if (node.action) {
        this.emit(`Promise.resolve(${callExpr}).then((__result) => {`);
        this.indent++;
        accept(node.action, this);
        this.indent--;
        this.emit(`});`);
      }
    };
  
    // ═══════════════════════════════════════════════════════════
    // VISITOR IMPLEMENTATIONS — LOGIC & CONTROL FLOW
    // ═══════════════════════════════════════════════════════════
  
    KarsaCompiler.prototype.visitJikaStatement = function(node) {
      const cond = this.lowerExpression(node.condition);
      this.emit(`if (${cond}) {`);
      this.indent++;
      accept(node.consequent, this);
      this.indent--;
      if (node.alternate) {
        this.emit("} else {");
        this.indent++;
        accept(node.alternate, this);
        this.indent--;
      }
      this.emit("}");
    };
  
    KarsaCompiler.prototype.visitUlangiStatement = function(node) {
      const source = this.lowerExpression(node.source);
  
      if (node.kind === 'kali') {
        // "ulangi N kali:" → for loop
        this.emit(`for (let __i = 0; __i < ${source}; __i++) {`);
        this.indent++;
        accept(node.body, this);
        this.indent--;
        this.emit(`}`);
      } else if (node.kind === 'rentang') {
        // "ulangi item dari A sampai B:" → for range
        const rangeEnd = node.rangeEnd ? this.lowerExpression(node.rangeEnd) : source;
        this.emit(`for (let ${node.iteratorName} = ${source}; ${node.iteratorName} <= ${rangeEnd}; ${node.iteratorName}++) {`);
        this.indent++;
        accept(node.body, this);
        this.indent--;
        this.emit(`}`);
      } else {
        // "ulangi item dari sumber:" → forEach
        this.emit(`${source}.forEach((${node.iteratorName}, indeks) => {`);
        this.indent++;
        accept(node.body, this);
        this.indent--;
        this.emit("});");
      }
    };
  
    KarsaCompiler.prototype.visitSelamaStatement = function(node) {
      const cond = this.lowerExpression(node.condition);
      this.emit(`while (${cond}) {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit("}");
    };
  
    KarsaCompiler.prototype.visitBerhentiStatement = function(node) {
      this.emit(`break;`);
    };
  
    KarsaCompiler.prototype.visitLewatiStatement = function(node) {
      this.emit(`continue;`);
    };
  
    KarsaCompiler.prototype.visitKembalikanStatement = function(node) {
      if (node.value) {
        const val = this.lowerExpression(node.value);
        this.emit(`return ${val};`);
      } else {
        this.emit(`return;`);
      }
    };
  
    // ═══════════════════════════════════════════════════════════
    // VISITOR IMPLEMENTATIONS — DATA & REACTIVITY
    // ═══════════════════════════════════════════════════════════
  
    /**
     * [Bug 1 FIX] Cek apakah target variabel bersifat reaktif (data/turunan)
     * atau biasa (ubah/tetap). Menentukan cara assign yang benar.
     *
     * - Reaktif (data, turunan) → Proxy punya .value → gunakan __setState()
     * - Biasa (ubah) → plain variable → gunakan assignment langsung
     * - Tidak diketahui → fallback ke __setState (aman untuk Proxy)
     */
    KarsaCompiler.prototype._isTargetReactive = function(node) {
      if (node.targetSymbol) {
        return node.targetSymbol.isReactive === true;
      }
      // Fallback: jika tidak ada metadata resolver, anggap reaktif
      // (lebih aman karena __setState bekerja dengan Proxy)
      return true;
    };
  
    KarsaCompiler.prototype.visitSimpanStatement = function(node) {
      const target = node.target;
      const val = this.lowerExpression(node.value);
      if (this._isTargetReactive(node)) {
        // data/turunan → Proxy, gunakan __setState
        this.emit(`__setState(${target}, ${val});`);
      } else {
        // ubah → plain variable, assignment langsung
        this.emit(`${target} = ${val};`);
      }
    };
  
    KarsaCompiler.prototype.visitTambahkanStatement = function(node) {
      const target = node.target;
      const jumlah = this.lowerExpression(node.value);
      if (this._isTargetReactive(node)) {
        // data/turunan → Proxy, akses via .value
        this.emit(`__setState(${target}, ${target}.value + ${jumlah});`);
      } else {
        // ubah → plain variable, assignment langsung
        this.emit(`${target} = ${target} + ${jumlah};`);
      }
    };
  
    KarsaCompiler.prototype.visitKurangiStatement = function(node) {
      const target = node.target;
      // Default ke 1 jika tidak ada value (kurangi counter → counter - 1)
      const jumlah = node.value ? this.lowerExpression(node.value) : '1';
      if (this._isTargetReactive(node)) {
        // data/turunan → Proxy, akses via .value
        this.emit(`__setState(${target}, ${target}.value - ${jumlah});`);
      } else {
        // ubah → plain variable, assignment langsung
        this.emit(`${target} = ${target} - ${jumlah};`);
      }
    };
  
    KarsaCompiler.prototype.visitSisipkanStatement = function(node) {
      const val = this.lowerExpression(node.value);
      const target = node.target;
      if (this._isTargetReactive(node)) {
        // data/turunan → Proxy, push lalu trigger reaktivitas via spread assignment
        // .push() saja bermutasi array tanpa mengubah reference .value,
        // sehingga Proxy setter tidak terpicu dan watcher tidak terpanggil.
        this.emit(`${target}.value.push(${val}); ${target}.value = [...${target}.value];`);
      } else {
        // ubah → plain array, push langsung
        this.emit(`${target}.push(${val});`);
      }
    };
  
    KarsaCompiler.prototype.visitAmbilDomStatement = function(node) {
      // "ambil nilai/teks/html/dll dari sumber -> simpan ke target"
      const source = this.resolveTarget(node.source);
      const targetVar = node.target; // string nama variabel
  
      const kindMap = {
        'nilai': 'value',
        'teks': 'innerText',
        'html': 'innerHTML',
        'tinggi': 'offsetHeight',
        'lebar': 'offsetWidth',
        'atribut': null  // khusus — pakai getAttribute
      };
  
      if (node.kind === 'atribut') {
        const attrName = node.attributeName || '';
        this.emit(`__setState(${targetVar}, ${source}.getAttribute("${attrName}"));`);
      } else {
        const jsProp = kindMap[node.kind] || node.kind;
        this.emit(`__setState(${targetVar}, ${source}.${jsProp});`);
      }
    };
  
    KarsaCompiler.prototype.visitAmbilLuarStatement = function(node) {
      // "ambil dari URL" → fetch API
      const url = this.lowerExpression(node.url);
  
      // Build fetch options
      let fetchOptions = '{}';
      if (node.options && node.options.length > 0) {
        const optPairs = node.options.map(opt => {
          const val = this.lowerExpression(opt.value);
          return `"${opt.key}": ${val}`;
        });
        fetchOptions = `{ ${optPairs.join(', ')} }`;
      }
  
      this.emit(`fetch(${url}, ${fetchOptions})`);
      this.indent++;
  
      // Process branches (berhasil, gagal, selalu)
      if (node.branches && node.branches.length > 0) {
        node.branches.forEach(branch => {
          if (branch.kind === 'berhasil') {
            this.emit(`.then((__response) => {`);
            this.indent++;
            this.emit(`if (!__response.ok) throw new Error("HTTP " + __response.status);`);
            this.emit(`return __response.json();`);
            this.indent--;
            this.emit(`})`);
            this.emit(`.then((__data) => {`);
            this.indent++;
            if (branch.action) accept(branch.action, this);
            this.indent--;
            this.emit(`})`);
          } else if (branch.kind === 'gagal') {
            this.emit(`.catch((__error) => {`);
            this.indent++;
            this.emit(`console.error("AmbilLuar gagal:", __error);`);
            if (branch.action) accept(branch.action, this);
            this.indent--;
            this.emit(`})`);
          } else if (branch.kind === 'selalu') {
            this.emit(`.finally(() => {`);
            this.indent++;
            if (branch.action) accept(branch.action, this);
            this.indent--;
            this.emit(`})`);
          }
        });
      } else {
        // No branches — just log
        this.emit(`.then(r => r.json())`);
        this.emit(`.catch(e => console.error(e))`);
      }
  
      this.emit(`;`);
      this.indent--;
    };
  
    // ═══════════════════════════════════════════════════════════
    // VISITOR IMPLEMENTATIONS — KOMPONEN & GUNAKAN
    // ═══════════════════════════════════════════════════════════
  
    KarsaCompiler.prototype.visitGunakanStatement = function(node) {
      // "gunakan NamaKomponen dengan props di target"
      const componentFactory = `__komp_${node.componentName}`;
  
      // Build props object
      let propsArg = '';
      if (node.props && node.props.length > 0) {
        const propPairs = node.props.map(p => {
          const val = this.lowerExpression(p.value);
          return `"${p.key}": ${val}`;
        });
        propsArg = `{ ${propPairs.join(', ')} }`;
      }
  
      const instanceVar = this.genVar('komp');
      this.emit(`const ${instanceVar} = ${componentFactory}(${propsArg});`);
  
      // Mount ke target
      if (node.mountTarget) {
        const mountTarget = this.resolveTarget(node.mountTarget);
        this.emit(`${mountTarget}.appendChild(${instanceVar});`);
      } else if (this.currentParent) {
        this.emit(`${this.currentParent}.appendChild(${instanceVar});`);
      } else {
        this.emit(`document.body.appendChild(${instanceVar});`);
      }
    };
  
    // ═══════════════════════════════════════════════════════════
    // VISITOR IMPLEMENTATIONS — NAVIGASI
    // ═══════════════════════════════════════════════════════════
  
    KarsaCompiler.prototype.visitArahkanStatement = function(node) {
      // "arahkan ke URL" → window.location.href
      const url = this.lowerExpression(node.url);
      this.emit(`window.location.href = ${url};`);
    };
  
    KarsaCompiler.prototype.visitMuatUlangStatement = function(node) {
      this.emit(`window.location.reload();`);
    };
  
    KarsaCompiler.prototype.visitKembaliStatement = function(node) {
      this.emit(`window.history.back();`);
    };
  
    // ═══════════════════════════════════════════════════════════
    // VISITOR IMPLEMENTATIONS — INTEROP & RANTAI AKSI
    // ═══════════════════════════════════════════════════════════
  
    KarsaCompiler.prototype.visitLangsungBlock = function(node) {
      this.emit(node.content);
    };
  
    KarsaCompiler.prototype.visitPanggilNativeExpression = function(node) {
      const args = node.arguments.map(a => this.lowerExpression(a)).join(', ');
      // [Bug 2 FIX] Gunakan lowerExpression untuk callee, bukan .name langsung
      // Ini mendukung MemberExpression seperti console.log, document.querySelector
      const calleeCode = this.lowerExpression(node.callee);
      const code = `${calleeCode}(${args})`;
  
      if (this.currentParent) {
          // Jika dipanggil sebagai statement di dalam blok 'buat'
          this.emit(`${code};`);
      } else {
          return code;
      }
    };
  
    KarsaCompiler.prototype.visitJalankanExpression = function(node) {
      // [Bug 5 FIX] Hapus node.args fallback — sudah deprecated di resolver (C2 fix).
      // Hanya gunakan node.arguments atau node.withArgs.
      const args = (node.arguments || node.withArgs || [])
        .map(a => this.lowerExpression(a));
      const code = `${node.callee}(${args.join(', ')})`;
  
      // Jika dipakai sebagai statement di dalam blok 'buat' (ada currentParent),
      // emit langsung; jika tidak, kembalikan sebagai ekspresi.
      if (this.currentParent) {
        this.emit(`${code};`);
      } else {
        return code;
      }
    };
  
    KarsaCompiler.prototype.visitRantaiAksi = function(node) {
      // RantaiAksi: first statement diikuti chain of actions
      // "aksi1 lalu aksi2 lalu aksi3"
      // Lower: jalankan first, lalu chain secara berurutan
  
      // Visit the first action
      if (node.first) accept(node.first, this);
  
      // Visit each chained action
      if (node.chain && node.chain.length > 0) {
        node.chain.forEach(chainedAction => {
          accept(chainedAction, this);
        });
      }
    };
  
  }
  
  module.exports = { install };
  

  root.KarsaStatementEmitters = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// COMPILER (Tahap 5) — KarsaCompiler
// ============================================================
(function(root) {
  "use strict";

  function require(name) {
    if (name === "../utils/visitor") return root.KarsaVisitor;
    if (name === "./emitters/runtime") return root.KarsaRuntimeEmitter;
    if (name === "./utils/codegen") return root.KarsaCodegen;
    if (name === "./lower/expression") return root.KarsaExpressionLowering;
    if (name === "./emitters/statements") return root.KarsaStatementEmitters;
    return undefined;
  }

  var module = { exports: {} };

  /**
   * KARSA v0.3.1 — COMPILER (Tahap 5)
   * ----------------------------------------------------------------------------
   * Melakukan lowering AST menjadi Vanilla JavaScript DOM API.
   * Fitur: Proxy-based reactivity, lifecycle management, zero dependencies.
   *
   * Sesuai Spesifikasi: KARSA-grammar-spec_v0_3_1.md
   */
  
  const { BaseVisitor, accept } = require('../utils/visitor');
  const RuntimeEmitter = require('./emitters/runtime');
  const Codegen = require('./utils/codegen');
  const ExpressionLowering = require('./lower/expression');
  const StatementEmitters = require('./emitters/statements');
  
  function KarsaCompiler() {
    BaseVisitor.call(this);
    this.output = [];
    this.indent = 0;
    this.varCounter = 0;
    this.componentCount = 0;
    this.helpers = new Set([
      '__createReactive', '__createComputed', '__watch', 
      '__setState', '__createElement', '__mount', '__cleanup'
    ]);
  }
  
  KarsaCompiler.prototype = Object.create(BaseVisitor.prototype);
  KarsaCompiler.prototype.constructor = KarsaCompiler;
  
  KarsaCompiler.prototype.compile = function(ast) {
    this.output = [];
    this.varCounter = 0;
    this.componentCount = 0;
    
    this.emit("// Generated by KARSA Compiler v0.3.1");
    this.emit(`// Source: ${ast.source || 'program.ks'}`);
    this.emit("");
    
    this.emitRuntimeHelpers();
    
    this.emit("// === User Code ===");
    this.emit("(function() {");
    this.indent++;
    
    // Start visit — emit return values dari top-level expressions
    // (contoh: JalankanExpression mengembalikan string kode, bukan emit langsung)
    if (ast.body && ast.body.length > 0) {
      for (var i = 0; i < ast.body.length; i++) {
        var node = ast.body[i];
        if (node && node.loc && node.loc.start) {
          this.emit(`// @karsa-source ${node.loc.start.line}:${node.loc.start.column} ${node.type}`);
        }
        var result = accept(node, this);
        // Jika visitor mengembalikan string kode (expression-style), emit sebagai statement
        if (typeof result === 'string' && result.length > 0) {
          this.emit(result + ';');
        }
      }
    }
    
    this.indent--;
    this.emit("})();");
    
    return this.output.join("\n");
  };
  
  // --- Emitter Helpers ---
  
  KarsaCompiler.prototype.emit = function(code) {
    return Codegen.emit(this, code);
  };
  
  KarsaCompiler.prototype.genVar = function(prefix = 'v') {
    return Codegen.genVar(this, prefix);
  };
  
  /**
   * Resolve target element to a JS expression.
   * Handles: Identifier, Selector, Literal, SelfReference
   */
  KarsaCompiler.prototype.resolveTarget = function(targetNode) {
    if (!targetNode) return 'null';
    
    if (targetNode.type === 'Identifier') {
      // Check if it's a compiled DOM variable (has compiledVarName)
      if (targetNode.resolved && (targetNode.resolved.kind === 'data' || targetNode.resolved.kind === 'turunan')) {
        return `${targetNode.name}.value`;
      }
      return targetNode.name;
    }
    if (targetNode.type === 'Selector') {
      let selectorStr = targetNode.tag || '';
      if (targetNode.id) selectorStr += '#' + targetNode.id;
      if (targetNode.classes && targetNode.classes.length > 0) {
        selectorStr += '.' + targetNode.classes.join('.');
      }
      return `document.querySelector("${selectorStr}")`;
    }
    if (targetNode.type === 'Literal') {
      return `document.querySelector("${targetNode.value}")`;
    }
    if (targetNode.type === 'SelfReference') {
      if (targetNode.referencedNode && targetNode.referencedNode.compiledVarName) {
        return targetNode.referencedNode.compiledVarName;
      }
      return 'null';
    }
    // Fallback
    return targetNode.name || 'null';
  };
  
  /**
   * Runtime Helpers (Self-contained)
   * Refinement lvl.4C: implementasi emitter dipindah ke compiler/emitters/runtime.js.
   */
  KarsaCompiler.prototype.emitRuntimeHelpers = function() {
    RuntimeEmitter.emitRuntimeHelpers(this);
  };
  
  // Statement emitters dipasang dari compiler/emitters/statements.js (Refinement lvl.4F).
  
  // ═══════════════════════════════════════════════════════════
  // EXPRESSION LOWERING
  // ═══════════════════════════════════════════════════════════
  
  KarsaCompiler.prototype.lowerExpression = function(node) {
    return ExpressionLowering.lowerExpression(this, node);
  };
  
  // Install statement visitor emitters after core compiler helpers are defined.
  StatementEmitters.install(KarsaCompiler, accept);
  
  
  module.exports = KarsaCompiler;
  

  root.KarsaCompiler = module.exports;
})(typeof self !== "undefined" ? self : this);

// ============================================================
// ENGINE (Main Entry Point) — Karsa
// ============================================================
/**
 * KARSA v0.3.1 — MAIN ENGINE
 * ----------------------------------------------------------------------------
 * Unified entry point untuk KARSA. Menghubungkan seluruh tahap pipeline.
 * Dapat digunakan di lingkungan Node.js maupun Browser.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Environment: Node.js / CommonJS
    const Lexer = require('../lexer/karsa-lexer');
    const Parser = require('../parser/index');
    const Resolver = require('../resolver/karsa-resolver');
    const Analyzer = require('../analyzer/karsa-analyzer');
    const Compiler = require('../compiler/karsa-compiler');
    module.exports = factory(Lexer, Parser, Resolver, Analyzer, Compiler);
  } else {
    // Environment: Browser (Requires Lexer, Parser, etc. to be loaded)
    root.Karsa = factory(
      root.KarsaLexer, 
      root.KarsaParser, 
      root.KarsaResolver, 
      root.KarsaAnalyzer, 
      root.KarsaCompiler
    );
  }
}(typeof self !== 'undefined' ? self : this, function (Lexer, Parser, Resolver, Analyzer, Compiler) {
  'use strict';

  const Karsa = {
    version: '0.3.1',

    /**
     * Memproses kode sumber Karsa menjadi JavaScript
     */
    compile: function (source, options = {}) {
      if (options.recover) {
        var allErrors = [];
        var allWarnings = [];
        var stages = {};
        var ast = null;
        
        // 1. Lexer
        var lexResult = Lexer.tokenize(source);
        stages.lexer = { ran: true, errors: lexResult.errors.length };
        if (lexResult.errors.length > 0) {
          allErrors = allErrors.concat(lexResult.errors);
        }
        
        // 2. Parser - only if we have tokens
        var parseResult = null;
        if (lexResult.tokens && lexResult.tokens.length > 0) {
          parseResult = Parser.parse(lexResult.tokens);
          stages.parser = { ran: true, errors: parseResult.errors.length };
          if (parseResult.errors.length > 0) {
            allErrors = allErrors.concat(parseResult.errors);
          }
          ast = parseResult.ast;
        } else {
          stages.parser = { ran: false, reason: 'lexer failed' };
        }
        
        // 3. Resolver
        if (ast && parseResult && parseResult.errors.length === 0) {
          var resolver = new Resolver();
          var resolveResult = resolver.resolve(ast);
          stages.resolver = { ran: true, errors: resolveResult.errors.length };
          if (resolveResult.errors.length > 0) {
            allErrors = allErrors.concat(resolveResult.errors);
          }
          if (resolveResult.warnings && resolveResult.warnings.length > 0) {
            allWarnings = allWarnings.concat(resolveResult.warnings);
          }
          ast = resolveResult.ast;
        } else if (ast) {
          // Try resolver even with parse errors if AST exists
          try {
            var resolver = new Resolver();
            var resolveResult = resolver.resolve(ast);
            stages.resolver = { ran: true, errors: resolveResult.errors.length };
            if (resolveResult.errors.length > 0) {
              allErrors = allErrors.concat(resolveResult.errors);
            }
            if (resolveResult.warnings && resolveResult.warnings.length > 0) {
              allWarnings = allWarnings.concat(resolveResult.warnings);
            }
            ast = resolveResult.ast;
          } catch(e) {
            stages.resolver = { ran: false, error: e.message };
          }
        } else {
          stages.resolver = { ran: false, reason: 'no AST' };
        }
        
        // 4. Analyzer
        if (ast) {
          try {
            var analyzer = new Analyzer();
            var analyzeResult = analyzer.analyze(ast, options);
            stages.analyzer = { ran: true, errors: analyzeResult.errors.length, warnings: analyzeResult.warnings.length };
            if (analyzeResult.errors.length > 0) {
              allErrors = allErrors.concat(analyzeResult.errors);
            }
            if (analyzeResult.warnings && analyzeResult.warnings.length > 0) {
              allWarnings = allWarnings.concat(analyzeResult.warnings);
            }
            ast = analyzeResult.ast;
          } catch(e) {
            stages.analyzer = { ran: false, error: e.message };
          }
        }
        
        // 5. Compiler - only if no critical errors
        var javascript = null;
        if (ast && allErrors.filter(function(e) { return e.severity !== 'warning'; }).length === 0) {
          try {
            var compiler = new Compiler();
            javascript = compiler.compile(ast);
            stages.compiler = { ran: true };
          } catch(e) {
            stages.compiler = { ran: false, error: e.message };
            allErrors.push({ kode: 'E0000', code: 'E0000', pesan: 'Compiler error: ' + e.message, message: 'Compiler error: ' + e.message, severity: 'error', saran: '', suggestion: '' });
          }
        }
        
        return {
          success: allErrors.filter(function(e) { return e.severity !== 'warning'; }).length === 0,
          js: javascript,
          errors: allErrors,
          warnings: allWarnings.concat(allErrors.filter(function(e) { return e.severity === 'warning'; })),
          diagnostics: allErrors.concat(allWarnings),
          stages: stages,
          ast: ast,
          semantic: ast ? ast.semantic : null
        };
      } else {
        try {
          // 1. Lexer
          const lexResult = Lexer.tokenize(source);
          if (lexResult.errors.length > 0) return { success: false, errors: lexResult.errors, diagnostics: lexResult.errors, stage: 'Lexer' };

          // 2. Parser
          var parseResult;
          try {
            parseResult = Parser.parse(lexResult.tokens);
          } catch (parseErr) {
            var parserException = { code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'Parser exception: ' + parseErr.message, pesan: 'Parser exception: ' + parseErr.message, suggestion: 'Terjadi kesalahan internal parser.', saran: 'Terjadi kesalahan internal parser.', loc: null };
            return {
              success: false,
              errors: [parserException],
              diagnostics: [parserException],
              stage: 'Parser'
            };
          }
          if (parseResult.errors.length > 0) return { success: false, errors: parseResult.errors, diagnostics: parseResult.errors, stage: 'Parser' };

          // 3. Resolver
          var resolveResult;
          try {
            const resolver = new Resolver();
            resolveResult = resolver.resolve(parseResult.ast);
          } catch (resolveErr) {
            var resolverException = { code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'Resolver exception: ' + resolveErr.message, pesan: 'Resolver exception: ' + resolveErr.message, suggestion: 'Terjadi kesalahan internal resolver.', saran: 'Terjadi kesalahan internal resolver.', loc: null };
            return {
              success: false,
              errors: [resolverException],
              diagnostics: [resolverException],
              stage: 'Resolver'
            };
          }
          if (resolveResult.errors.length > 0) return { success: false, errors: resolveResult.errors, warnings: resolveResult.warnings || [], diagnostics: resolveResult.errors.concat(resolveResult.warnings || []), stage: 'Resolver' };

          // 4. Analyzer
          var analyzeResult;
          try {
            const analyzer = new Analyzer();
            analyzeResult = analyzer.analyze(resolveResult.ast, options);
          } catch (analyzeErr) {
            var analyzerException = { code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'Analyzer exception: ' + analyzeErr.message, pesan: 'Analyzer exception: ' + analyzeErr.message, suggestion: 'Terjadi kesalahan internal analyzer.', saran: 'Terjadi kesalahan internal analyzer.', loc: null };
            return {
              success: false,
              errors: [analyzerException],
              diagnostics: [analyzerException],
              stage: 'Analyzer'
            };
          }
          if (analyzeResult.errors.length > 0) return { success: false, errors: analyzeResult.errors, warnings: (resolveResult.warnings || []).concat(analyzeResult.warnings || []), diagnostics: analyzeResult.errors.concat(resolveResult.warnings || [], analyzeResult.warnings || []), stage: 'Analyzer' };

          // 5. Compiler
          var javascript;
          try {
            const compiler = new Compiler();
            javascript = compiler.compile(analyzeResult.ast);
          } catch (compileErr) {
            var compilerException = { code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'Compiler exception: ' + compileErr.message, pesan: 'Compiler exception: ' + compileErr.message, suggestion: 'Terjadi kesalahan internal compiler.', saran: 'Terjadi kesalahan internal compiler.', loc: null };
            return {
              success: false,
              errors: [compilerException],
              diagnostics: [compilerException],
              stage: 'Compiler'
            };
          }

          return {
            success: true,
            js: javascript,
            warnings: (resolveResult.warnings || []).concat(analyzeResult.warnings || []),
            diagnostics: (resolveResult.warnings || []).concat(analyzeResult.warnings || []),
            ast: analyzeResult.ast,
            semantic: analyzeResult.ast ? analyzeResult.ast.semantic : null
          };
        } catch (err) {
          if (options.verbose) {
            console.error('=== SYSTEM ERROR STACK ===');
            console.error(err.stack);
            console.error('=========================');
          }
          var systemException = { 
                  code: 'E0000',
                  kode: 'E0000',
                  severity: 'error',
                  stage: 'System',
                  message: err.message,
                  pesan: err.message,
                  suggestion: 'Terjadi kesalahan sistem internal.',
                  saran: 'Terjadi kesalahan sistem internal.',
                  loc: null
              };
          return { 
              success: false, 
              errors: [systemException],
              diagnostics: [systemException], 
              stage: 'System' 
          };
        }
      }
    },

    /**
     * Memetakan baris JavaScript ter-generate ke lokasi source KARSA terdekat.
     * Menggunakan komentar `// @karsa-source line:column NodeType` dari compiler.
     */
    mapGeneratedLine: function(js, generatedLine) {
      const lines = String(js || '').split('\n');
      const targetLine = Math.max(1, generatedLine || 1);
      let nearest = null;
      for (let i = 0; i < Math.min(targetLine, lines.length); i++) {
        const match = /@karsa-source\s+(\d+):(\d+)\s+([A-Za-z0-9_]+)/.exec(lines[i]);
        if (match) {
          nearest = {
            generatedLine: i + 1,
            sourceLine: parseInt(match[1], 10),
            sourceColumn: parseInt(match[2], 10),
            nodeType: match[3]
          };
        }
      }
      return nearest;
    },

    /**
     * Memetakan runtime error stack sederhana ke lokasi source KARSA jika ada.
     */
    mapRuntimeError: function(error, js) {
      const stack = error && error.stack ? String(error.stack) : '';
      const match = /:(\d+):(\d+)\)?\s*$/.exec(stack.split('\n')[1] || '') || /:(\d+):(\d+)/.exec(stack);
      if (!match) return null;
      const generatedLine = parseInt(match[1], 10);
      const generatedColumn = parseInt(match[2], 10);
      const mapped = this.mapGeneratedLine(js, generatedLine);
      return mapped ? { ...mapped, generatedColumn } : null;
    },

    /**
     * Menginspeksi source KARSA dan mengembalikan semantic model JSON-safe.
     * Refinement lvl.2 tooling API.
     */
    inspect: function(source, options = {}) {
      const result = this.compile(source, { ...options, recover: true });
      const semantic = result.ast && result.ast.semantic ? result.ast.semantic : null;
      return {
        success: result.success,
        diagnostics: result.diagnostics || result.errors || [],
        stages: result.stages || null,
        semantic: semantic && semantic.normalized ? semantic.normalized : {
          symbols: [],
          references: [],
          dependencies: [],
          cycles: []
        }
      };
    },

    /**
     * Mengembalikan dependency graph semantic JSON-safe.
     * Refinement lvl.2 tooling API.
     */
    graph: function(source, options = {}) {
      const inspected = this.inspect(source, options);
      return {
        success: inspected.success,
        diagnostics: inspected.diagnostics,
        dependencies: inspected.semantic.dependencies || [],
        cycles: inspected.semantic.cycles || [],
        symbols: inspected.semantic.symbols || []
      };
    },

    /**
     * Menjalankan kode Karsa langsung di browser
     */
    run: function (source) {
      const result = this.compile(source);
      if (result.success) {
        // Gunakan script element untuk eksekusi yang lebih bersih daripada eval
        const script = document.createElement('script');
        script.textContent = result.js;
        document.head.appendChild(script);
      } else {
        // [Bug Fix] Format errors dengan benar agar tidak menampilkan [object Object]
        var errorMsg = '[KARSA ' + result.stage + ' Error]\n';
        if (result.errors && result.errors.length > 0) {
          for (var i = 0; i < result.errors.length; i++) {
            var err = result.errors[i];
            errorMsg += '  - ' + (err.message || err.pesan || err) + '\n';
            if (err.suggestion || err.saran) {
              errorMsg += '    Saran: ' + (err.suggestion || err.saran) + '\n';
            }
          }
        }
        console.error(errorMsg);
      }
    },

    /**
     * Inisialisasi otomatis untuk tag <script type="text/karsa">
     */
    init: function () {
      if (typeof document !== 'undefined') {
        const scripts = document.querySelectorAll('script[type="text/karsa"]');
        scripts.forEach(script => {
          if (script.src) {
            // Jika ada src, fetch file .ks nya
            fetch(script.src)
              .then(response => response.text())
              .then(code => this.run(code))
              .catch(err => console.error("Gagal memuat file Karsa:", err));
          } else if (script.textContent) {
            // Jika inline
            this.run(script.textContent);
          }
        });
      }
    }
  };

  // Jalankan init otomatis jika di browser
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => Karsa.init());
  }

  return Karsa;
}));

