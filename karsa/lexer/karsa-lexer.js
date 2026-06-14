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
