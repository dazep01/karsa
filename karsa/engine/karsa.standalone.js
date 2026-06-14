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
    this.pesan = pesan;
    this.penjelasan = penjelasan || "";
    this.saran = saran || "";
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
    this.warnings.push({ baris: baris, kolom: kolom, kode: kode, pesan: pesan });
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
/**
 * KARSA v0.3.1 — Visitor Pattern
 *
 * Implementasi visitor untuk traversing AST KARSA.
 * Berdasarkan: RFC-PARSER-001 §8
 */

var TT = require('../parser/token-types');

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
/**
 * KARSA v0.3.1 — AST Node Factory
 *
 * Fungsi pembuatan node AST yang menjamin:
 * - Setiap node memiliki `type` dan `loc`
 * - `loc` mengikuti format SourceLocation { start: Position, end: Position }
 * - Properti anak berupa array, bukan null
 * - ErrorNode digunakan sebagai pengganti null pada posisi anak
 *
 * Berdasarkan: AST Specification v1.0.0
 */

/**
 * Membuat SourceLocation dari token atau dua posisi.
 * @param {object} start - { line, column } atau Token
 * @param {object} end - { line, column } atau Token
 * @returns {object} SourceLocation
 */
function buatLoc(start, end) {
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
    loc: loc || buatLoc({ line: 1, column: 1 }, { line: 1, column: 1 }),
    body: body || [],
    source: source || undefined
  };
}

// ─── Declaration Nodes ─────────────────────────────────────

function buatDataDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'DataDeclaration',
    loc: loc,
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatTetapDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'TetapDeclaration',
    loc: loc,
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatUbahDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'UbahDeclaration',
    loc: loc,
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatTurunanDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'TurunanDeclaration',
    loc: loc,
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatKomponenDeclaration(name, params, body, loc, docstring, returnType) {
  return {
    type: 'KomponenDeclaration',
    loc: loc,
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
    loc: loc,
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
    loc: loc,
    body: body || []
  };
}

function buatBuatStatement(selector, loc, docstring, properties, body, action) {
  var node = {
    type: 'BuatStatement',
    loc: loc,
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
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    target: target
  };
}

function buatHapusStatement(target, loc, docstring) {
  return {
    type: 'HapusStatement',
    loc: loc,
    docstring: docstring || undefined,
    target: target
  };
}

function buatKosongkanStatement(target, loc, docstring) {
  return {
    type: 'KosongkanStatement',
    loc: loc,
    docstring: docstring || undefined,
    target: target
  };
}

function buatPerbaruiStatement(property, target, value, loc, docstring) {
  return {
    type: 'PerbaruiStatement',
    loc: loc,
    docstring: docstring || undefined,
    property: property,
    target: target,
    value: value
  };
}

function buatKetikaStatement(event, loc, docstring, target, body, action) {
  var node = {
    type: 'KetikaStatement',
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    target: target,
    body: body
  };
}

function buatLifecycleStatement(kind, body, loc, docstring) {
  return {
    type: 'LifecycleStatement',
    loc: loc,
    docstring: docstring || undefined,
    kind: kind,
    body: body
  };
}

function buatSetelahStatement(target, loc, docstring, body, action) {
  var node = {
    type: 'SetelahStatement',
    loc: loc,
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
    loc: loc,
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
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    condition: condition,
    body: body
  };
}

function buatBerhentiStatement(loc) {
  return { type: 'BerhentiStatement', loc: loc };
}

function buatLewatiStatement(loc) {
  return { type: 'LewatiStatement', loc: loc };
}

function buatKembalikanStatement(loc, value) {
  var node = { type: 'KembalikanStatement', loc: loc };
  if (value) node.value = value;
  return node;
}

function buatSimpanStatement(value, target, kind, loc, docstring) {
  return {
    type: 'SimpanStatement',
    loc: loc,
    docstring: docstring || undefined,
    value: value,
    target: target,
    kind: kind
  };
}

function buatTambahkanStatement(value, target, loc, docstring) {
  return {
    type: 'TambahkanStatement',
    loc: loc,
    docstring: docstring || undefined,
    value: value,
    target: target
  };
}

function buatKurangiStatement(target, loc, docstring, value) {
  var node = {
    type: 'KurangiStatement',
    loc: loc,
    docstring: docstring || undefined,
    target: target
  };
  if (value) node.value = value;
  return node;
}

function buatSisipkanStatement(value, target, loc, docstring) {
  return {
    type: 'SisipkanStatement',
    loc: loc,
    docstring: docstring || undefined,
    value: value,
    target: target
  };
}

function buatAmbilDomStatement(kind, source, target, loc, docstring, attributeName) {
  var node = {
    type: 'AmbilDomStatement',
    loc: loc,
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
    loc: loc,
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
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    url: url
  };
}

function buatMuatUlangStatement(loc) {
  return { type: 'MuatUlangStatement', loc: loc };
}

function buatKembaliStatement(loc) {
  return { type: 'KembaliStatement', loc: loc };
}

function buatLangsungBlock(content, loc) {
  return {
    type: 'LangsungBlock',
    loc: loc,
    content: content
  };
}

function buatJalankanExpression(callee, kind, loc, docstring, arguments_, withArgs) {
  var node = {
    type: 'JalankanExpression',
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    callee: callee,
    arguments: arguments_ || []
  };
}

function buatRantaiAksi(first, chain, loc) {
  return {
    type: 'RantaiAksi',
    loc: loc,
    first: first,
    chain: chain
  };
}

// ─── Expression Nodes ──────────────────────────────────────

function buatLiteral(value, kind, loc) {
  return {
    type: 'Literal',
    loc: loc,
    value: value,
    kind: kind
  };
}

function buatIdentifier(name, loc) {
  return {
    type: 'Identifier',
    loc: loc,
    name: name
  };
}

function buatBinaryExpression(operator, left, right, loc) {
  return {
    type: 'BinaryExpression',
    loc: loc,
    operator: operator,
    left: left,
    right: right
  };
}

function buatUnaryExpression(operator, operand, loc, prefix) {
  return {
    type: 'UnaryExpression',
    loc: loc,
    operator: operator,
    operand: operand,
    prefix: prefix !== false
  };
}

function buatMemberExpression(object, property, loc) {
  return {
    type: 'MemberExpression',
    loc: loc,
    object: object,
    property: property
  };
}

function buatCallExpression(callee, arguments_, loc) {
  return {
    type: 'CallExpression',
    loc: loc,
    callee: callee,
    arguments: arguments_ || []
  };
}

function buatObjectLiteral(properties, loc) {
  return {
    type: 'ObjectLiteral',
    loc: loc,
    properties: properties || []
  };
}

function buatArrayLiteral(elements, loc) {
  return {
    type: 'ArrayLiteral',
    loc: loc,
    elements: elements || []
  };
}

// ─── UI & Selector Nodes ───────────────────────────────────

function buatSelector(tag, loc, id, classes, attributes) {
  return {
    type: 'Selector',
    loc: loc,
    tag: tag,
    id: id || undefined,
    classes: classes || [],
    attributes: attributes || []
  };
}

function buatPropertyNode(key, value, loc, shorthand) {
  return {
    type: 'PropertyNode',
    loc: loc,
    key: key,
    value: value,
    shorthand: !!shorthand
  };
}

function buatAttributeNode(key, value, loc) {
  return {
    type: 'AttributeNode',
    loc: loc,
    key: key,
    value: value
  };
}

// ─── Special Nodes ─────────────────────────────────────────

function buatErrorNode(code, message, loc, originalToken) {
  var node = {
    type: 'ErrorNode',
    loc: loc,
    code: code,
    message: message
  };
  if (originalToken) node.originalToken = originalToken;
  return node;
}

// ─── Shared Types ──────────────────────────────────────────

function buatParameter(name, loc, typeHint, defaultValue) {
  var param = {
    type: 'Parameter',
    loc: loc,
    name: name
  };
  if (typeHint) param.typeHint = typeHint;
  if (defaultValue) param.defaultValue = defaultValue;
  return param;
}

function buatFetchBranch(kind, action, loc) {
  return {
    type: 'FetchBranch',
    loc: loc,
    kind: kind,
    action: action
  };
}

function buatFetchOption(key, value, loc) {
  return {
    type: 'FetchOption',
    key: key,
    value: value,
    loc: loc
  };
}

module.exports = {
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

  var endLoc = value ? value.loc.end : { line: targetToken.baris, column: targetToken.kolom + target.length };
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
  var startToken = parser.advance();

  // Cek TK_BLOK_LANGSUNG
  if (parser.check(TT.TK_BLOK_LANGSUNG)) {
    var contentToken = parser.advance();
    return AST.buatLangsungBlock(contentToken.nilai,
      AST.buatLoc(
        { line: startToken.baris, column: startToken.kolom },
        { line: contentToken.baris, column: contentToken.kolom + (contentToken.nilai || '').length }
      ));
  }

  // ":" + blok indentasi
  parser.expect(TT.TK_TITIK_DUA);

  // Ambil konten dari baris-baris indentasi
  var content = '';
  if (parser.check(TT.TK_BARIS_BARU)) {
    parser.skipBarisBaru();
  }
  if (parser.check(TT.TK_INDENT)) {
    parser.advance(); // konsumsi INDENT
    // Baca semua token hingga DEDENT
    while (!parser.check(TT.TK_DEDENT) && !parser.isAtEnd()) {
      var lineTok = parser.advance();
      if (lineTok.tipe === TT.TK_BARIS_BARU) {
        content += '\n';
      } else {
        content += (content && !content.endsWith('\n') ? ' ' : '') + (lineTok.nilai || '');
      }
    }
    if (parser.check(TT.TK_DEDENT)) {
      parser.advance();
    }
  }

  return AST.buatLangsungBlock(content.trim(),
    AST.buatLoc(
      { line: startToken.baris, column: startToken.kolom },
      { line: startToken.baris, column: startToken.kolom + content.length + 10 }
    ));
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
/**
 * KARSA v0.3.1 — RESOLVER (Tahap 3)
 * ----------------------------------------------------------------------------
 * Menyelesaikan resolusi nama, scope, alias properti, dan self-reference.
 *
 * Sesuai Spesifikasi: KARSA-grammar-spec_v0_3_1.md
 */

const { BaseVisitor, accept } = require('../utils/visitor');

/**
 * Tabel Alias Properti Indonesia -> JavaScript (Section 10.1)
 */
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
  'atribut': 'getAttribute'
};

/**
 * Kelas Scope untuk mengelola binding variabel
 */
function Scope(type, parent) {
  this.type = type; // 'global', 'blok', 'komponen', 'iterasi', 'watcher'
  this.parent = parent;
  this.bindings = {};
}

Scope.prototype.define = function(name, metadata) {
  this.bindings[name] = metadata;
};

Scope.prototype.lookup = function(name) {
  if (this.bindings[name]) {
    return this.bindings[name];
  }
  if (this.parent) {
    return this.parent.lookup(name);
  }
  return null;
};

/**
 * Resolver KARSA
 */
function KarsaResolver() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  this.currentScope = null;
  this.buatStack = []; // Untuk melacak parent BuatStatement (self-reference)
}

KarsaResolver.prototype = Object.create(BaseVisitor.prototype);
KarsaResolver.prototype.constructor = KarsaResolver;

/**
 * Entry point utama Resolver
 */
KarsaResolver.prototype.resolve = function(ast) {
  this.errors = [];
  this.warnings = [];
  this.currentScope = new Scope('global', null);

  // Tahap 1: Gather Global Declarations (Hoisting)
  this.gatherGlobals(ast);

  // Tahap 2: Deep Resolution
  accept(ast, this);

  return {
    ast: ast,
    errors: this.errors,
    warnings: this.warnings
  };
};

/**
 * Tahap 1: Mencari deklarasi top-level (Data, Fungsi, Komponen)
 */
KarsaResolver.prototype.gatherGlobals = function(ast) {
  if (!ast.body) return;
  ast.body.forEach(node => {
    let name = '';
    let type = '';
    let isReactive = false;

    if (node.type === 'DataDeclaration') { name = node.name; type = 'data'; isReactive = true; }
    else if (node.type === 'TetapDeclaration') { name = node.name; type = 'tetap'; }
    else if (node.type === 'UbahDeclaration') { name = node.name; type = 'ubah'; }
    else if (node.type === 'TurunanDeclaration') { name = node.name; type = 'turunan'; isReactive = true; }
    else if (node.type === 'FungsiDeclaration') { name = node.name; type = 'fungsi'; }
    else if (node.type === 'KomponenDeclaration') { name = node.name; type = 'komponen'; }

    if (name) {
      this.currentScope.define(name, {
        referencedNode: node,
        scope: 'global',
        isReactive: isReactive,
        type: type
      });
    }
  });
};

// --- Override Visitor Methods ---

KarsaResolver.prototype.visitBlockStatement = function(node) {
  const oldScope = this.currentScope;
  this.currentScope = new Scope('blok', oldScope);
  
  this.genericVisit(node);
  
  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitKomponenDeclaration = function(node) {
  // Komponen Scope
  const oldScope = this.currentScope;
  this.currentScope = new Scope('komponen', oldScope);

  // Daftarkan parameter ke scope komponen
  if (node.params) {
    node.params.forEach(p => {
      this.currentScope.define(p.name, {
        referencedNode: p,
        scope: 'komponen',
        isReactive: true, // Parameter bersifat reaktif terhadap perubahan props
        type: 'parameter'
      });
    });
  }

  // Komponen bertindak sebagai "element root" untuk self-reference jika tidak ada BuatStatement
  this.buatStack.push(node);
  this.genericVisit(node);
  this.buatStack.pop();

  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitFungsiDeclaration = function(node) {
  const oldScope = this.currentScope;
  this.currentScope = new Scope('blok', oldScope);

  if (node.params) {
    node.params.forEach(p => {
      this.currentScope.define(p.name, {
        referencedNode: p,
        scope: 'blok',
        isReactive: false,
        type: 'parameter'
      });
    });
  }

  this.genericVisit(node);
  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitUlangiStatement = function(node) {
  // Resolve source dulu di scope sekarang
  accept(node.source, this);

  // Buat Iterasi Scope
  const oldScope = this.currentScope;
  this.currentScope = new Scope('iterasi', oldScope);

  if (node.iteratorName) {
    this.currentScope.define(node.iteratorName, {
      referencedNode: node,
      scope: 'iterasi',
      isReactive: true,
      type: 'ubah' // Variabel iterasi berubah tiap loop
    });
  }

  // Visit body dalam scope iterasi
  accept(node.body, this);

  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitIdentifier = function(node) {
  // Kecuali jika ini adalah bagian dari deklarasi atau properti
  const binding = this.currentScope.lookup(node.name);
  if (binding) {
    node.resolved = {
      referencedNode: binding.referencedNode,
      scope: binding.scope,
      isReactive: binding.isReactive,
      type: binding.type
    };
  } else {
    // Abaikan jika identifier adalah nama fungsi JS eksternal (jalankan) 
    // atau jika berada dalam context yang tidak butuh resolusi (diatur oleh parent)
    if (!node.isCalleeJS) {
       this.addError('E3001', `Variabel atau fungsi "${node.name}" tidak dikenal.`, node.loc);
    }
  }
};

KarsaResolver.prototype.visitMemberExpression = function(node) {
  // Visit object (kiri)
  accept(node.object, this);

  // Resolusi Alias Properti (Section 10)
  if (node.property.type === 'Identifier') {
    const propName = node.property.name;
    
    // Khusus .indeks dalam scope iterasi
    if (propName === 'indeks') {
        node.property.isVirtual = true;
    }

    if (ALIAS_PROPERTI[propName]) {
      node.property.originalName = propName;
      node.property.name = ALIAS_PROPERTI[propName];
      node.isTranslatedAlias = true;
    }
  }
};

KarsaResolver.prototype.visitKetikaStatement = function(node) {
  // Resolusi Self-Reference (v0.3.1)
  if (!node.target) {
    if (this.buatStack.length > 0) {
      const parentNode = this.buatStack[this.buatStack.length - 1];
      node.target = {
        type: 'SelfReference',
        referencedNode: parentNode,
        loc: node.loc
      };
    } else {
      this.addError('E5001', 'Event listener "ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen".', node.loc);
    }
  } else {
    accept(node.target, this);
  }

  // Ketika body/action diparse, masuk ke "Watcher-like" scope
  const oldScope = this.currentScope;
  this.currentScope = new Scope('watcher', oldScope);
  
  if (node.body) accept(node.body, this);
  if (node.action) accept(node.action, this);

  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitSaatStatement = function(node) {
  // Resolusi target reaktif
  const binding = this.currentScope.lookup(node.target);
  if (!binding) {
    this.addError('E3001', `Data reaktif "${node.target}" tidak ditemukan.`, node.loc);
  } else if (!binding.isReactive) {
    this.warnings.push({
        kode: 'W3001',
        pesan: `Variabel "${node.target}" bukan data reaktif. Watcher mungkin tidak akan pernah terpicu.`,
        loc: node.loc
    });
  }

  // Watcher Scope
  const oldScope = this.currentScope;
  this.currentScope = new Scope('watcher', oldScope);
  this.genericVisit(node);
  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitBuatStatement = function(node) {
  this.buatStack.push(node);
  this.genericVisit(node);
  this.buatStack.pop();
};

KarsaResolver.prototype.visitDataDeclaration = function(node) {
    // Jika bukan global (misal di dalam komponen/fungsi), daftarkan ke scope sekarang
    if (this.currentScope.type !== 'global') {
        this.currentScope.define(node.name, {
            referencedNode: node,
            scope: this.currentScope.type,
            isReactive: true,
            type: 'data'
        });
    }
    this.genericVisit(node);
};

KarsaResolver.prototype.visitTetapDeclaration = function(node) {
    if (this.currentScope.type !== 'global') {
        this.currentScope.define(node.name, {
            referencedNode: node,
            scope: this.currentScope.type,
            isReactive: false,
            type: 'tetap'
        });
    }
    this.genericVisit(node);
};

KarsaResolver.prototype.visitUbahDeclaration = function(node) {
    if (this.currentScope.type !== 'global') {
        this.currentScope.define(node.name, {
            referencedNode: node,
            scope: this.currentScope.type,
            isReactive: false,
            type: 'ubah'
        });
    }
    this.genericVisit(node);
};

KarsaResolver.prototype.visitJalankanExpression = function(node) {
    // Tandai identifier callee agar tidak dianggap error E3001 (JS Interop)
    // Karena 'jalankan' memanggil JS eksternal yang tidak divalidasi resolver
    if (node.calleeNode) {
        // Jika callee berupa identifier atau member expression kompleks
        this.markAsJSExternal(node.calleeNode);
    }
    this.genericVisit(node);
};

KarsaResolver.prototype.markAsJSExternal = function(node) {
    if (node.type === 'Identifier') {
        node.isCalleeJS = true;
    } else if (node.type === 'MemberExpression') {
        this.markAsJSExternal(node.object);
    }
};

KarsaResolver.prototype.addError = function(kode, pesan, loc) {
  this.errors.push({
    kode: kode,
    pesan: pesan,
    loc: loc
  });
};

module.exports = KarsaResolver;
/**
 * KARSA v0.3.1 — ANALYZER (Tahap 4)
 * ----------------------------------------------------------------------------
 * Melakukan validasi semantik: tipe, reaktivitas, kontrol alur, dan lifecycle.
 *
 * Sesuai Spesifikasi: KARSA-grammar-spec_v0_3_1.md
 */

const { BaseVisitor, accept } = require('../utils/visitor');

function KarsaAnalyzer() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  
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

KarsaAnalyzer.prototype.analyze = function(ast) {
  this.errors = [];
  this.warnings = [];
  accept(ast, this);
  return {
    ast: ast,
    errors: this.errors,
    warnings: this.warnings
  };
};

// --- Helpers ---

KarsaAnalyzer.prototype.addError = function(kode, pesan, loc, saran) {
  this.errors.push({ kode, pesan, loc, saran });
};

KarsaAnalyzer.prototype.addWarning = function(kode, pesan, loc, saran) {
  this.warnings.push({ kode, pesan, loc, saran, severity: 'warning' });
};

/**
 * Validasi Tipe Dasar (Section 7.3)
 */
KarsaAnalyzer.prototype.checkTypeHint = function(typeHint, valueNode) {
  if (!typeHint || !valueNode || valueNode.type === 'ErrorNode') return;

  const mapping = {
    'teks': 'teks',
    'angka': 'angka',
    'benar-salah': 'boolean',
    'objek': 'ObjectLiteral',
    'array': 'ArrayLiteral'
  };

  let actualType = '';
  if (valueNode.type === 'Literal') {
    if (typeof valueNode.value === 'number') actualType = 'angka';
    else if (typeof valueNode.value === 'string') actualType = 'teks';
    else if (typeof valueNode.value === 'boolean') actualType = 'benar-salah';
  }
  else if (valueNode.type === 'ObjectLiteral') actualType = 'objek';
  else if (valueNode.type === 'ArrayLiteral') actualType = 'array';

  const expected = typeHint; // Kita bandingkan langsung dengan alias Karsa
  if (expected && actualType && expected !== actualType) {
    this.addWarning('W4001', 
      `Type hint "${typeHint}" tidak cocok dengan nilai awal bertipe "${actualType}".`, 
      valueNode.loc, 
      `Gunakan nilai yang sesuai atau ubah type hint menjadi yang benar.`);
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
  
  // Turunan tidak boleh berisi aksi (side-effect)
  // Ini divalidasi dengan mengecek apakah ada statement di dalam expression-nya
  // (Parser sudah menjamin Turunan berisi Expression, tapi kita cek isinya)
  
  this.genericVisit(node);
  this.context.inTurunanExpr = prevInTurunan;
};

/**
 * Validasi Reaktivitas & Assignment (Section 7.5)
 */
KarsaAnalyzer.prototype.visitSimpanStatement = function(node) {
  if (this.context.inTurunanExpr) {
    this.addError('E4004', "Ekspresi turunan tidak boleh mengandung aksi simpan (side-effect).", node.loc);
  }

  // Cek apakah target adalah turunan (read-only)
  if (node.target) {
    // Di KarsaParser, SimpanStatement menyimpan target sebagai string nama
    // Kita perlu bantuan dari info resolve di Identifier (jika ada)
    // Namun SimpanStatement biasanya memegang identifier node di value/target
  }

  this.genericVisit(node);
};

// Cek modifikasi ke data reaktif
KarsaAnalyzer.prototype.visitTambahkanStatement = function(node) { this.checkWriteToTurunan(node); this.genericVisit(node); };
KarsaAnalyzer.prototype.visitKurangiStatement = function(node) { this.checkWriteToTurunan(node); this.genericVisit(node); };
KarsaAnalyzer.prototype.visitSisipkanStatement = function(node) { this.checkWriteToTurunan(node); this.genericVisit(node); };

KarsaAnalyzer.prototype.checkWriteToTurunan = function(node) {
  // Logic: Jika target me-resolve ke TurunanDeclaration -> Error
  // (Implementasi ini membutuhkan mapping identifier dari Resolver)
  // Diasumsikan Resolver sudah menaruh info di node.target jika itu identifier
};

/**
 * Validasi Kontrol Alur (Section 6.5)
 */
KarsaAnalyzer.prototype.visitBerhentiStatement = function(node) {
  const isValid = this.context.loopDepth > 0 || this.context.handlerDepth > 0;
  if (!isValid) {
    this.addError('E6001', '"berhenti" tidak valid di sini.', node.loc, '"berhenti" hanya valid di dalam loop atau event handler.');
  }
  if (this.context.inFunction && this.context.loopDepth === 0 && this.context.handlerDepth === 0) {
    this.addError('E6001', '"berhenti" di dalam fungsi (bukan loop/handler) tidak valid.', node.loc, 'Gunakan "kembalikan" untuk keluar dari fungsi.');
  }
};

KarsaAnalyzer.prototype.visitLewatiStatement = function(node) {
  if (this.context.loopDepth === 0) {
    this.addError('E6002', '"lewati" tidak valid di luar loop.', node.loc, 'Gunakan "lewati" hanya di dalam "ulangi" atau "selama".');
  }
};

KarsaAnalyzer.prototype.visitKembalikanStatement = function(node) {
  if (!this.context.inFunction && !this.context.inComponent) {
    // Secara teknis komponen dan fungsi adalah tempat valid untuk kembalikan
    this.addError('E6003', '"kembalikan" tidak valid di luar fungsi atau komponen.', node.loc);
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
 * Validasi Tampilkan (Section 4.4)
 */
KarsaAnalyzer.prototype.visitTampilkanStatement = function(node) {
  const validModes = ["tambahkan", "ganti", "awalan", "sebelum", "sesudah"];
  if (node.mode && validModes.indexOf(node.mode) === -1) {
    this.addError('E4007', `Mode "${node.mode}" tidak dikenal.`, node.loc, `Mode yang valid: ${validModes.join(", ")}.`);
  }
  this.genericVisit(node);
};

/**
 * Validasi Watcher (Section 7.6)
 */
KarsaAnalyzer.prototype.visitSaatStatement = function(node) {
  // Target watcher sudah di-resolve namanya, analyzer bisa cek tipenya jika metadata tersedia
  this.genericVisit(node);
};

module.exports = KarsaAnalyzer;
/**
 * KARSA v0.3.1 — COMPILER (Tahap 5)
 * ----------------------------------------------------------------------------
 * Melakukan lowering AST menjadi Vanilla JavaScript DOM API.
 * Fitur: Proxy-based reactivity, lifecycle management, zero dependencies.
 *
 * Sesuai Spesifikasi: KARSA-grammar-spec_v0_3_1.md
 */

const { BaseVisitor, accept } = require('../utils/visitor');

function KarsaCompiler() {
  BaseVisitor.call(this);
  this.output = [];
  this.indent = 0;
  this.varCounter = 0;
  this.helpers = new Set([
    '__createReactive', '__createComputed', '__watch', 
    '__setState', '__createElement', '__mount'
  ]);
}

KarsaCompiler.prototype = Object.create(BaseVisitor.prototype);
KarsaCompiler.prototype.constructor = KarsaCompiler;

KarsaCompiler.prototype.compile = function(ast) {
  this.output = [];
  this.varCounter = 0;
  
  this.emit("// Generated by KARSA Compiler v0.3.1");
  this.emit(`// Source: ${ast.source || 'program.ks'}`);
  this.emit("");
  
  this.emitRuntimeHelpers();
  
  this.emit("// === User Code ===");
  this.emit("(function() {");
  this.indent++;
  
  // Start visit
  this.genericVisit(ast);
  
  this.indent--;
  this.emit("})();");
  
  return this.output.join("\n");
};

// --- Emitter Helpers ---

KarsaCompiler.prototype.emit = function(code) {
  const spacing = "  ".repeat(this.indent);
  this.output.push(spacing + code);
};

KarsaCompiler.prototype.genVar = function(prefix = 'v') {
  return `__${prefix}_${++this.varCounter}`;
};

/**
 * Runtime Helpers (Self-contained)
 */
KarsaCompiler.prototype.emitRuntimeHelpers = function() {
  this.emit("// === Runtime Helpers ===");
  const runtime = `
const __subscribers = new WeakMap();
let __activeEffect = null;

function __createReactive(val) {
  const obj = { value: val };
  return new Proxy(obj, {
    get(target, prop) {
      if (__activeEffect && prop === 'value') {
        let subs = __subscribers.get(target) || new Set();
        subs.add(__activeEffect);
        __subscribers.set(target, subs);
      }
      return target[prop];
    },
    set(target, prop, newVal) {
      const oldVal = target[prop];
      target[prop] = newVal;
      if (prop === 'value' && oldVal !== newVal) {
        const subs = __subscribers.get(target);
        if (subs) subs.forEach(fn => fn(newVal, oldVal));
      }
      return true;
    }
  });
}

function __createComputed(fn) {
  const reactive = __createReactive(null);
  const effect = () => {
    __activeEffect = effect;
    reactive.value = fn();
    __activeEffect = null;
  };
  effect();
  return reactive;
}

function __watch(reactive, cb) {
  const effect = (n, o) => cb(n, o);
  let subs = __subscribers.get(reactive) || new Set();
  subs.add(effect);
  __subscribers.set(reactive, subs);
  return () => subs.delete(effect);
}

function __setState(reactive, val) {
  reactive.value = val;
}

function __createElement(tag, props = {}, children = []) {
  const el = document.createElement(tag === 'fragmen' ? 'div' : tag);
  if (props.id) el.id = props.id;
  if (props.className) el.className = props.className;
  if (props.innerText) el.innerText = props.innerText;
  if (props.src) el.src = props.src;
  if (props.href) el.href = props.href;
  children.forEach(child => el.appendChild(child));
  return el;
}
  `;
  this.output.push(runtime.trim());
  this.emit("");
};

// --- Visitor Implementations ---

KarsaCompiler.prototype.visitDataDeclaration = function(node) {
  const initVal = this.lowerExpression(node.init);
  this.emit(`const ${node.name} = __createReactive(${initVal});`);
};

KarsaCompiler.prototype.visitTurunanDeclaration = function(node) {
  const expr = this.lowerExpression(node.init);
  this.emit(`const ${node.name} = __createComputed(() => ${expr});`);
};

KarsaCompiler.prototype.visitBuatStatement = function(node) {
  const varName = this.genVar('el');
  node.compiledVarName = varName; // Simpan untuk child
  
  const tag = node.selector.tag;
  this.emit(`const ${varName} = document.createElement("${tag === 'tombol' ? 'button' : tag}");`);
  
  if (node.selector.id) {
    this.emit(`${varName}.id = "${node.selector.id}";`);
  }
  if (node.selector.classes.length > 0) {
    this.emit(`${varName}.className = "${node.selector.classes.join(' ')}";`);
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

KarsaCompiler.prototype.visitKetikaStatement = function(node) {
  const eventMap = {
    'diklik': 'click',
    'diketik': 'input',
    'disubmit': 'submit',
    'diubah': 'change'
  };
  
  const eventName = eventMap[node.event] || node.event;
  let target = 'document';
  
  if (node.target) {
    if (node.target.type === 'SelfReference') {
      target = node.target.referencedNode.compiledVarName;
    } else if (node.target.type === 'Identifier') {
      target = node.target.name;
    }
  }

  this.emit(`${target}.addEventListener("${eventName}", (event) => {`);
  this.indent++;
  if (node.event === 'disubmit') this.emit("event.preventDefault();");
  
  if (node.body) accept(node.body, this);
  if (node.action) accept(node.action, this);
  
  this.indent--;
  this.emit("});");
};

KarsaCompiler.prototype.visitPerbaruiStatement = function(node) {
  const val = this.lowerExpression(node.value);
  // Target resolution (sederhana: querySelector jika string)
  const target = node.target.type === 'Literal' ? `document.querySelector("${node.target.value}")` : node.target.name;
  
  if (node.property === 'teks') this.emit(`${target}.innerText = ${val};`);
  else if (node.property === 'nilai') this.emit(`${target}.value = ${val};`);
  else if (node.property === 'kelas') this.emit(`${target}.className = ${val};`);
};

KarsaCompiler.prototype.visitSimpanStatement = function(node) {
  const val = this.lowerExpression(node.value);
  this.emit(`__setState(${node.target}, ${val});`);
};

KarsaCompiler.prototype.visitSaatStatement = function(node) {
  this.emit(`__watch(${node.target}, (nilaiBaru) => {`);
  this.indent++;
  accept(node.body, this);
  this.indent--;
  this.emit("});");
};

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
  this.emit(`${source}.forEach((${node.iteratorName}, indeks) => {`);
  this.indent++;
  accept(node.body, this);
  this.indent--;
  this.emit("});");
};

// --- Expression Lowering ---

KarsaCompiler.prototype.lowerExpression = function(node) {
  if (!node) return 'undefined';
  
  switch(node.type) {
    case 'Literal':
      return JSON.stringify(node.value);
    case 'Identifier':
      // Jika identifier reaktif, gunakan .value
      if (node.resolved && (node.resolved.type === 'data' || node.resolved.type === 'turunan')) {
        return `${node.name}.value`;
      }
      return node.name;
    case 'BinaryExpression':
      const ops = { 'sama dengan': '===', 'tidak sama dengan': '!==', 'dan': '&&', 'atau': '||' };
      const op = ops[node.operator] || node.operator;
      return `(${this.lowerExpression(node.left)} ${op} ${this.lowerExpression(node.right)})`;
    case 'MemberExpression':
        let prop = node.property.name;
        return `${this.lowerExpression(node.object)}.${prop}`;
    case 'CallExpression':
        const args = node.arguments.map(a => this.lowerExpression(a)).join(', ');
        return `${this.lowerExpression(node.callee)}(${args})`;
    default:
      return 'null';
  }
};

module.exports = KarsaCompiler;
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
      try {
        // 1. Lexer
        const lexResult = Lexer.tokenize(source);
        if (lexResult.errors.length > 0) return { success: false, errors: lexResult.errors, stage: 'Lexer' };

        // 2. Parser
        const parseResult = Parser.parse(lexResult.tokens);
        if (parseResult.errors.length > 0) return { success: false, errors: parseResult.errors, stage: 'Parser' };

        // 3. Resolver
        const resolver = new Resolver();
        const resolveResult = resolver.resolve(parseResult.ast);
        if (resolveResult.errors.length > 0) return { success: false, errors: resolveResult.errors, stage: 'Resolver' };

        // 4. Analyzer
        const analyzer = new Analyzer();
        const analyzeResult = analyzer.analyze(resolveResult.ast);
        if (analyzeResult.errors.length > 0) return { success: false, errors: analyzeResult.errors, stage: 'Analyzer' };

        // 5. Compiler
        const compiler = new Compiler();
        const javascript = compiler.compile(analyzeResult.ast);

        return {
          success: true,
          js: javascript,
          warnings: analyzeResult.warnings,
          ast: analyzeResult.ast
        };
      } catch (err) {
        return { success: false, errors: [{ pesan: err.message }], stage: 'System' };
      }
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
        console.error(`[KARSA ${result.stage} Error]`, result.errors);
      }
    },

    /**
     * Inisialisasi otomatis untuk tag <script type="text/karsa">
     */
    init: function () {
      if (typeof document !== 'undefined') {
        const scripts = document.querySelectorAll('script[type="text/karsa"]');
        scripts.forEach(script => {
          if (script.textContent) {
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
