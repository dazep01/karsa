# RFC-PARSER-001: Spesifikasi Parser KARSA

**ID Dokumen:** RFC-PARSER-001  
**Versi:** 1.1.0  
**Status:** Normatif / Draft  
**Penulis:** Tim Inti KARSA  
**Terakhir Diperbarui:** 2026-06-13  
**Daftar Pustaka:**
- KARSA-grammar-spec_v0.3.1.md
- parser-charter.md
- parser-architecture.md
- AST Specification.md (kontrak node detail)

---

## Daftar Isi

1. Parser Goals & Non-Goals
2. Token Contract (Lexer → Parser)
3. Parser API Contract
4. AST Invariants
5. Node Ownership Matrix
6. Pratt Precedence Specification
7. Error Recovery Specification
8. Visitor Pattern Contract
9. Resolver Handoff Contract
10. Compiler Handoff Contract
11. Future Compatibility Rules
12. Versioning Policy
13. Lampiran A — Kode Error Parser (E2xxx)
14. Lampiran B — Peta Keyword ke Statement Handler

---

## 1. Parser Goals & Non-Goals

### 1.1 Goals (Tujuan)

1. **Konversi Token → AST.** Mengonversi stream token dari Lexer menjadi Abstract Syntax Tree (AST) yang valid sepenuhnya sesuai grammar KARSA v0.3.1. Parser adalah satu-satunya produsen AST dalam pipeline KARSA; tidak ada fase lain yang boleh memodifikasi struktur pohon AST selain menambahkan anotasi resolusi.

2. **Pratt Expression Parsing.** Mengimplementasikan expression parsing menggunakan **Pratt Parser** untuk menangani precedence operator aritmatika, perbandingan kata, dan logika secara deterministik. Setiap operator dalam grammar KARSA wajib memiliki binding power yang terdefinisi secara eksplisit; tidak boleh ada operator yang ditangani secara ad-hoc di luar mekanisme Pratt.

3. **Penanganan Indentasi.** Menangani struktur indentasi berbasis token `TK_INDENT` dan `TK_DEDENT` menjadi nesting AST node (`BlockStatement`). Parser wajib memperlakukan `TK_INDENT`/`TK_DEDENT` sebagai pembatas blok struktural yang setara dengan kurung kurawal pada bahasa C-style, bukan sebagai whitespace semata.

4. **Error Recovery yang Tangguh.** Melakukan **error recovery** sehingga parser dapat melanjutkan pemrosesan meskipun menemui sintaksis yang tidak valid, demi menghasilkan diagnostik yang banyak dalam satu kali kompilasi. Parser tidak boleh pernah menghentikan proses secara fatal karena satu error sintaksis; ia wajib mencatat error dan melanjutkan dari titik sinkronisasi terdekat.

5. **Metadata Lokasi Akurat.** Menjamin setiap node AST memiliki metadata lokasi (`loc`) yang akurat, mencakup baris dan kolom awal serta akhir. Lokasi awal diambil dari token pertama yang membentuk node; lokasi akhir diambil dari token terakhir yang membentuk node. Untuk node yang memiliki anak, lokasi akhir boleh diambil dari lokasi akhir anak terakhir jika lebih panjang.

6. **Independensi Target.** Memproduksi AST yang sepenuhnya independen dari target output (JavaScript) dan tidak bergantung pada semantik runtime. AST tidak boleh mengandung informasi yang hanya relevan untuk satu target kompilasi tertentu.

7. **Preservasi DocString.** Menyertakan DocString (`TK_KOMENTAR_DOC`) yang diterima dari Lexer ke dalam node AST yang relevan. DocString yang tidak dapat ditempelkan ke node manapun harus dilaporkan sebagai warning, bukan error fatal.

8. **Determinisme.** Untuk input token yang identik, parser wajib menghasilkan AST yang struktural identik (termasuk lokasi dan urutan anak). Tidak boleh ada non-determinisme yang disebabkan oleh urutan evaluasi, hash map iteration, atau implementasi-dependent behavior.

### 1.2 Non-Goals (Bukan Tujuan)

1. **Validasi Semantik.** Parser tidak memvalidasi apakah identifier dideklarasikan, tipe data cocok, atau properti ada. Ini adalah tugas Resolver/Analyzer. Contoh: parser menerima `x.y.z` sebagai `MemberExpression` tanpa memeriksa apakah `x`, `y`, atau `z` ada dalam scope.

2. **Resolusi Alias.** Parser tidak menerjemahkan alias Indonesia (misal: `.panjang` → `.length`). Ia hanya mem-parsing-nya sebagai `MemberExpression` dengan property name `"panjang"`. Resolusi alias adalah tugas Resolver.

3. **Kode Generasi.** Parser tidak menghasilkan atau mengemit kode JavaScript, HTML, CSS, atau format output lainnya. Ia hanya menghasilkan AST.

4. **Lexing.** Parser tidak menangani pemindaian karakter string mentah, manajemen stack indentasi, atau pengelompokan karakter menjadi token. Ia hanya mengonsumsi token yang dijamin benar oleh Lexer.

5. **Validasi Tipe.** Parser tidak memeriksa kesesuaian type hint dengan nilai yang diberikan. Deklarasi `data x: angka = "teks"` di-parse tanpa error; Analyzer yang memberikan warning.

6. **Optimisasi AST.** Parser tidak melakukan transformasi, penyederhanaan, atau optimisasi pada AST. Constant folding, dead code elimination, dan transformasi serupa bukan tanggung jawab parser.

7. **Resolusi Ambiguitas Semantik.** Parser tidak menentukan apakah `tambahkan` berarti penjumlahan numerik atau array append; ia hanya mencatat struktur sintaksisnya. Demikian pula, parser tidak memutuskan apakah `berhenti` berarti `break` atau `return` — itu ditentukan oleh Analyzer berdasarkan konteks scope.

---

## 2. Token Contract (Lexer → Parser)

Bagian ini mendefinisikan kontrak token yang harus dipenuhi oleh Lexer sebelum Parser dapat beroperasi dengan benar. Parser berhak mengasumsikan semua jaminan berikut; jika Lexer melanggar jaminan ini, perilaku Parser tidak terdefinisi.

### 2.1 Bentuk Token

Setiap token yang diterima Parser wajib memiliki bentuk berikut:

```typescript
interface Token {
  tipe: string;          // Nama tipe token, misal: "TK_BUAT", "TK_IDENTIFIER"
  nilai: string;         // Teks asli dari source code
  baris: number;         // Nomor baris (1-indexed)
  kolom: number;         // Nomor kolom (1-indexed)
  docstring: string | null;  // DocString yang menempel, atau null
}
```

### 2.2 Jaminan Lexer ke Parser

1. **Kelengkapan Token.** Lexer wajib menghasilkan token untuk setiap karakter dalam source code (kecuali komentar biasa `--!` dan whitespace di dalam baris). Tidak boleh ada karakter yang "hilang" tanpa token yang merepresentasikannya.

2. **INDENT/DEDENT Seimbang.** Setiap `TK_INDENT` wajib memiliki pasangan `TK_DEDENT` yang sesuai. Pada akhir file, Lexer wajib mengeluarkan `TK_DEDENT` untuk setiap level indentasi yang masih terbuka sebelum mengeluarkan `TK_EOF`.

3. **Longest-Match.** Lexer menjamin bahwa keyword multi-kata sudah digabung menjadi satu token (misal: `"jika tidak"` → `TK_JIKA_TIDAK`, bukan dua token terpisah). Parser tidak perlu melakukan longest-match sendiri.

4. **Literal Angka Negatif.** Lexer menangani `-` diikuti digit sebagai `TK_LITERAL_ANGKA` negatif bila konteks mengizinkan (bukan setelah nilai). Parser menerima token ini sebagai literal angka negatif yang sudah lengkap.

5. **Urutan Baris Baru.** `TK_BARIS_BARU` wajib muncul di antara setiap baris source code. `TK_INDENT` dan `TK_DEDENT` wajib muncul setelah `TK_BARIS_BARU` dan sebelum token signifikan pertama di baris tersebut.

6. **Selektor Utuh.** Lexer mengeluarkan `TK_ID`, `TK_CLASS`, dan `TK_ATRIBUT` sebagai token individual. Parser bertugas menggabungkan token-token selektor ini menjadi `Selector` node.

7. **DocString Terlampir.** Lexer melampirkan `TK_KOMENTAR_DOC` ke token signifikan berikutnya melalui properti `docstring`. Parser hanya perlu membaca properti ini; tidak perlu mencocokkan komentar secara manual.

8. **Blok Langsung.** Lexer mengeluarkan `TK_BLOK_LANGSUNG` yang berisi seluruh konten blok `langsung:` sebagai satu token. Nilai token adalah konten JS mentah (tanpa indentasi awal yang berlebih).

9. **EOF Wajib.** Token terakhir dalam stream wajib berupa `TK_EOF`.

### 2.3 Katalog Tipe Token yang Dikonsumsi Parser

Berikut daftar lengkap tipe token yang wajib dikenali oleh Parser, dikelompokkan berdasarkan kategori. Parser wajib mendefinisikan konstanta atau enumerasi untuk setiap tipe ini secara eksplisit; penggunaan string literal hard-coded untuk tipe token tidak diperbolehkan.

**Struktur:**
`TK_BUAT`, `TK_TAMPILKAN`, `TK_SEMBUNYIKAN`, `TK_HAPUS`, `TK_KOSONGKAN`, `TK_PERBARUI`

**Event / Perilaku:**
`TK_KETIKA`, `TK_DIKLIK`, `TK_DIKETIK`, `TK_DISUBMIT`, `TK_DIMUAT`, `TK_DIUBAH`, `TK_DIFOKUS`, `TK_DITINGGAL`, `TK_DITEKAN`, `TK_DILEPAS`, `TK_DIARAHKAN`, `TK_DITINGGAL_KURSOR`, `TK_DIGULIR`, `TK_DIPASANG`, `TK_DILEPAS_DARI_DOM`

**Alur:**
`TK_LALU`, `TK_SETELAH`

**Logika:**
`TK_JIKA`, `TK_KALAU`, `TK_JIKA_TIDAK`, `TK_ULANGI`, `TK_SELAMA`, `TK_BERHENTI`, `TK_LEWATI`, `TK_KEMBALIKAN`

**Data / Reaktif:**
`TK_DATA`, `TK_TURUNAN`, `TK_SIMPAN`, `TK_AMBIL`, `TK_TETAP`, `TK_UBAH`, `TK_TAMBAHKAN`, `TK_SISIPKAN`, `TK_KURANGI`, `TK_SAAT`, `TK_BERUBAH`

**Komponen / Fungsi:**
`TK_KOMPONEN`, `TK_GUNAKAN`, `TK_DENGAN`, `TK_DI`, `TK_DARI`, `TK_KE`, `TK_FUNGSI`, `TK_JALANKAN`

**Jaringan / Navigasi:**
`TK_BERHASIL`, `TK_GAGAL`, `TK_SELALU`, `TK_ARAHKAN`, `TK_MUAT_ULANG`, `TK_KEMBALI`

**Literal:**
`TK_BENAR`, `TK_SALAH`, `TK_KOSONG`, `TK_LITERAL_TEKS`, `TK_LITERAL_ANGKA`

**Operator Kata:**
`TK_DAN`, `TK_ATAU`, `TK_BUKAN`, `TK_SAMA_DENGAN`, `TK_TIDAK_SAMA_DENGAN`, `TK_LEBIH_DARI`, `TK_KURANG_DARI`, `TK_PALING_SEDIKIT`, `TK_PALING_BANYAK`, `TK_ADA_DI`, `TK_TIDAK_ADA_DI`

**Operator Simbol:**
`TK_PANAH` (`->`), `TK_TITIK_DUA` (`:`), `TK_KOMA` (`,`), `TK_TITIK` (`.`), `TK_PLUS` (`+`), `TK_MINUS` (`-`), `TK_BINTANG` (`*`), `TK_GARIS_MIRING` (`/`), `TK_TANDA_SAMA` (`=`)

**Kurung:**
`TK_KURUNG_BUKA`, `TK_KURUNG_TUTUP`, `TK_KURAWAL_BUKA`, `TK_KURAWAL_TUTUP`, `TK_KURUNG_SIKU_BUKA`, `TK_KURUNG_SIKU_TUTUP`

**Selektor:**
`TK_ID`, `TK_CLASS`, `TK_ATRIBUT`

**Identifier:**
`TK_IDENTIFIER`

**Komentar:**
`TK_KOMENTAR_BIASA` (diabaikan Parser), `TK_KOMENTAR_DOC` (diproses jika masih muncul sebagai token mandiri)

**Interop / Node:**
`TK_LANGSUNG`, `TK_BLOK_LANGSUNG`, `TK_FRAGMEN`

**Kontrol Whitespace & EOF:**
`TK_INDENT`, `TK_DEDENT`, `TK_BARIS_BARU`, `TK_EOF`

---

## 3. Parser API Contract

### 3.1 Antarmuka Utama

Parser harus mematuhi kontrak antarmuka berikut. Implementasi boleh menambahkan metode internal privat, tetapi API publik wajib sesuai dengan spesifikasi ini.

```typescript
/**
 * Hasil utama dari operasi parsing.
 *
 * Invariant: ast selalu non-null, bahkan jika ada error.
 * Jika source code kosong, ast.body berisi array kosong [].
 */
interface ParseResult {
  ast: ProgramNode;
  errors: ParseError[];
}

/**
 * Representasi error yang ditemukan selama parsing.
 * Parser tidak pernah throw error; semua error dikembalikan melalui array ini.
 */
interface ParseError {
  code: string;             // Kode error, misal: "E2001"
  message: string;          // Pesan utama dalam Bahasa Indonesia
  explanation: string;      // Penjelasan singkat
  suggestion: string;       // Saran perbaikan (boleh string kosong "")
  loc: SourceLocation;      // Lokasi kejadian error
  severity: "error" | "warning";
}

/**
 * Lokasi dalam source code.
 * Semua nilai adalah 1-indexed.
 */
interface SourceLocation {
  start: Position;
  end: Position;
}

interface Position {
  line: number;    // Baris (dimulai dari 1)
  column: number;  // Kolom (dimulai dari 1)
}

/**
 * Kelas utama parser.
 */
class KarsaParser {
  /**
   * Menginisialisasi parser dengan daftar token dari Lexer.
   *
   * @param tokens - Array token yang dihasilkan Lexer.
   *                 Token terakhir wajib berupa TK_EOF.
   * @throws Error jika tokens kosong atau token terakhir bukan TK_EOF.
   */
  constructor(tokens: Token[]);

  /**
   * Memulai proses parsing dari root grammar (Program).
   *
   * Jaminan:
   * - Tidak pernah mengembalikan null.
   * - ast selalu berupa ProgramNode yang valid (minimal body: []).
   * - errors berisi daftar semua error yang ditemukan selama parsing.
   * - Memanggil parse() lebih dari sekali pada instance yang sama
   *   mengembalikan hasil identik (idempoten).
   */
  parse(): ParseResult;
}
```

### 3.2 Aturan Konsumsi Token

Parser wajib menggunakan metode konsumsi token berikut. Pengaksesan array token secara langsung melalui indeks mutable di luar mekanisme ini dilarang keras.

```typescript
/**
 * Melihat token pada posisi current tanpa mengubah state parser.
 * Tidak pernah mengembalikan null; minimal mengembalikan TK_EOF.
 */
peek(): Token;

/**
 * Melihat token pada posisi current + offset tanpa mengubah state parser.
 * peek(0) setara dengan peek().
 * Jika offset melebihi batas array, mengembalikan token TK_EOF sintetis.
 */
peek(offset: number): Token;

/**
 * Mengonsumsi token pada posisi current dan memajukan posisi.
 * Mengembalikan token yang dikonsumsi.
 * Memajukan current position sebesar 1.
 */
advance(): Token;

/**
 * Mengonsumsi token jika tipenya cocok dengan expected.
 * Jika cocok: memajukan posisi dan mengembalikan token.
 * Jika tidak cocok: TIDAK memajukan posisi, mencatat ParseError,
 * dan mengembalikan null.
 */
expect(tokenType: string): Token | null;

/**
 * Mengonsumsi token jika tipenya cocok dengan salah satu di expectedTypes.
 * Jika cocok: memajukan posisi dan mengembalikan token.
 * Jika tidak cocok: TIDAK memajukan posisi, mengembalikan null.
 */
match(...tokenTypes: string[]): Token | null;

/**
 * Memeriksa apakah token pada posisi current bertipe tokenType
 * tanpa mengonsumsi atau mengubah state.
 */
check(tokenType: string): boolean;

/**
 * Memeriksa apakah token pada posisi current bertipe salah satu
 * dari tokenTypes tanpa mengonsumsi.
 */
checkAny(...tokenTypes: string[]): boolean;

/**
 * Mengembalikan true jika posisi current berada di TK_EOF.
 */
isAtEnd(): boolean;
```

### 3.3 Aturan Tambahan API

1. **Posisi Awal.** Setelah konstruktor dipanggil, posisi parser berada sebelum token pertama. Panggilan pertama ke `peek()` mengembalikan token pertama; panggilan pertama ke `advance()` mengonsumsi token pertama.

2. **Token EOF Tidak Dikonsumsi.** `advance()` boleh mengonsumsi hingga `TK_EOF`, tetapi `TK_EOF` tidak boleh "dilewati". `isAtEnd()` mengembalikan `true` ketika `peek().tipe === "TK_EOF"`.

3. **Error pada expect.** Ketika `expect()` gagal, parser wajib:
   - Mencatat `ParseError` dengan kode yang sesuai;
   - Tidak memajukan posisi (agar pemanggil dapat memutuskan recovery);
   - Mengembalikan `null`.

4. **Pemetaan DocString.** Setiap kali Parser mengonsumsi token signifikan pertama dari sebuah node AST, ia wajib memeriksa `token.docstring`. Jika tidak null, nilai tersebut wajib disimpan sebagai properti `docstring` pada node AST yang sedang dibuat.

---

## 4. AST Invariants

Invariant berikut wajib dijamin oleh Parser pada setiap AST yang dihasilkan. Setiap pelanggaran terhadap invariant ini adalah bug Parser yang harus diperbaiki. Resolver, Analyzer, dan Compiler berhak mengasumsikan semua invariant ini terpenuhi.

### 4.1 Invariant Struktural

**I-01: Root Node Tunggal.** AST yang dihasilkan Parser selalu memiliki tepat satu root node bertipe `Program`. Tidak ada node lain yang berada di luar pohon `Program`.

**I-02: Setiap Node Memiliki `type`.** Setiap node AST wajib memiliki properti `type: string` yang nilainya adalah salah satu dari nama node yang terdefinisi dalam AST Specification. Tidak boleh ada node dengan `type` yang tidak terdaftar.

**I-03: Setiap Node Memiliki `loc`.** Setiap node AST wajib memiliki properti `loc: SourceLocation` yang terisi lengkap (`start.line`, `start.column`, `end.line`, `end.column` semuanya ≥ 1). Node yang dibuat oleh error recovery (dummy node) juga wajib memiliki `loc` yang merujuk ke lokasi error.

**I-04: Anak Berupa Array.** Setiap properti node yang berisi anak wajib berupa `Array<Node>`, bukan node tunggal. Meskipun secara konseptual sebuah node hanya memiliki satu anak (misalnya `consequent` pada `IfStatement`), representasinya tetap berupa array untuk keseragaman traversing. Pengecualian: properti yang secara konseptual bukan "anak" (misalnya `discriminant` pada ekspresi, `name` pada identifier) boleh berupa node tunggal.

**I-05: Tidak Ada Null Anak.** Array anak tidak boleh mengandung elemen `null` atau `undefined`. Jika sebuah blok kosong secara konseptual, array anak berisi `[]`. Jika error recovery menghasilkan node yang hilang, gunakan `ErrorNode` sebagai pengganti, bukan `null`.

**I-06: Urutan Anak = Urutan Source.** Anak-anak dalam array wajib diurutkan sesuai urutan kemunculan dalam source code. Tidak boleh ada anak yang terurut berdasarkan jenis, prioritas, atau kriteria lainnya.

### 4.2 Invariant Lokasi

**I-07: Start ≤ End.** Untuk setiap node, `loc.start.line ≤ loc.end.line`. Jika `loc.start.line === loc.end.line`, maka `loc.start.column ≤ loc.end.column`.

**I-08: Induk Mencakup Anak.** Untuk setiap node induk P dan anak C, `P.loc.start ≤ C.loc.start` dan `C.loc.end ≤ P.loc.end` (komparasi leksikografis pada (line, column)).

**I-09: Anak Tidak Tumpang Tindih.** Untuk setiap dua anak C1 dan C2 dari induk yang sama (C1 muncul sebelum C2 dalam array), `C1.loc.end ≤ C2.loc.start`. Rentang lokasi anak-anak dari induk yang sama tidak boleh tumpang tindih.

**I-10: Lokasi Akurat.** `loc.start` wajib merujuk ke posisi token pertama yang membentuk node. `loc.end` wajib merujuk ke posisi akhir token terakhir yang membentuk node. Untuk node yang memiliki blok anak, `loc.end` boleh diambil dari `loc.end` anak terakhir.

### 4.3 Invariant Semantik (Sintaksis)

**I-11: Program Body = Top-Level Statements.** `Program.body` hanya berisi node yang valid di level top-level: `DataDeclaration`, `TetapDeclaration`, `UbahDeclaration`, `TurunanDeclaration`, `BuatStatement`, `TampilkanStatement`, `SembunyikanStatement`, `HapusStatement`, `KosongkanStatement`, `PerbaruiStatement`, `KetikaStatement`, `SaatStatement`, `SetelahStatement`, `JikaStatement`, `UlangiStatement`, `SelamaStatement`, `BerhentiStatement`, `LewatiStatement`, `KembalikanStatement`, `SimpanStatement`, `TambahkanStatement`, `KurangiStatement`, `SisipkanStatement`, `AmbilDomStatement`, `AmbilLuarStatement`, `KomponenDeclaration`, `GunakanStatement`, `FungsiDeclaration`, `JalankanStatement`, `ArahkanStatement`, `MuatUlangStatement`, `KembaliStatement`, `LangsungBlock`, `PanggilNativeExpression`, `RantaiAksi`, `ErrorNode`.

**I-12: Blok Indentasi → BlockStatement.** Setiap kenaikan level indentasi (TK_INDENT) yang berisi satu atau lebih statement wajib menghasilkan `BlockStatement` sebagai anak dari node yang memilikinya. Penurunan indentasi (TK_DEDENT) menutup `BlockStatement` tersebut.

**I-13: Aksi Tunggal → Inline.** Statement setelah `TK_PANAH` (`->`) pada baris yang sama tidak menghasilkan `BlockStatement`, melainkan disimpan sebagai properti `action` (node tunggal) pada node pemilik. Node tunggal ini wajib berupa tipe yang valid sebagai `aksi_tunggal` sesuai grammar Section 4.1.2.

**I-14: Ekspresi Tidak Mandiri.** Node ekspresi (`BinaryExpression`, `MemberExpression`, `CallExpression`, `Literal`, `Identifier`, dsb.) tidak boleh muncul sebagai elemen langsung dari `Program.body` atau `BlockStatement.body`. Ekspresi hanya boleh muncul sebagai sub-node dari statement atau deklarasi. Satu-satunya pengecualian adalah `PanggilNativeExpression` dan `JalankanExpression` yang dapat berdiri sendiri sebagai statement.

### 4.4 Invariant Error Recovery

**I-15: ErrorNode Valid.** `ErrorNode` wajib memiliki `type: "ErrorNode"`, `loc` yang valid, dan `code` yang merujuk ke kode error yang menyebabkannya. `ErrorNode` boleh muncul di posisi manapun di mana node lain diharapkan, termasuk dalam array anak.

**I-16: Tidak Ada AST Parsial.** Parser tidak boleh menghasilkan AST yang memiliki referensi circular, node tanpa induk yang seharusnya memiliki induk, atau properti yang dijanjikan oleh spec node tetapi bernilai `undefined`.

**I-17: Error Tidak Menghilangkan Node Valid.** Jika dalam satu blok ada tiga statement dan statement kedua error, statement pertama dan ketiga wajib tetap muncul dalam AST. Error recovery mengganti statement kedua dengan `ErrorNode`, bukan menghapus seluruh blok.

---

## 5. Node Ownership Matrix

Matrix berikut mendefinisikan relasi kepemilikan antara node induk dan node anak. Setiap sel menandakan apakah node kolom (anak) boleh dimiliki secara langsung oleh node baris (induk).

**Legenda:**
- ✅ = Anak boleh dimiliki langsung oleh induk
- ✅* = Anak boleh dimiliki, tetapi hanya dalam konteks tertentu (lihat catatan)
- ❌ = Anak tidak boleh dimiliki langsung oleh induk

### 5.1 Matrix Kepemilikan Statement

| Induk \ Anak | BlockStmt | BuatStmt | Tampilkan | Sembunyikan | Hapus | Kosongkan | Perbarui | Ketika | Saat | Setelah | Jika | Ulangi | Selama | Berhenti | Lewati | Kembalikan | DataDecl | TetapDecl | UbahDecl | TurunanDecl | Simpan | Tambahkan | Kurangi | Sisipkan | AmbilDom | AmbilLuar | KomponenDecl | Gunakan | FungsiDecl | Jalankan | Arahkan | MuatUlang | Kembali | Langsung | PanggilNative | RantaiAksi | ErrorNode |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Program** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **BlockStmt** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **BuatStmt** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **KetikaStmt** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **JikaStmt** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **UlangiStmt** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SelamaStmt** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SaatStmt** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AmbilLuarStmt** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **KomponenDecl** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **FungsiDecl** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Catatan ✅*:**
- `GunakanStmt` di dalam `BlockStatement` yang merupakan anak `SaatStmt` (watcher) — valid untuk merender komponen secara reaktif.
- `KomponenDecl` tidak boleh muncul di dalam blok manapun selain `Program` dan blok isi `KomponenDecl` itu sendiri (nested component definition). Namun, secara praktik, komponen selalu dideklarasikan di top-level. Parser mengizinkannya di blok untuk fleksibilitas, tetapi Analyzer mungkin memberikan warning.

### 5.2 Matrix Kepemilikan Ekspresi

| Induk \ Anak | Literal | Identifier | BinaryExpr | UnaryExpr | MemberExpr | CallExpr | ObjekLit | ArrayLit | TernaryExpr | GroupExpr |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **BinaryExpr** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **UnaryExpr** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **MemberExpr** | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CallExpr** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ObjekLit** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ArrayLit** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Catatan:**
- `MemberExpr.object` boleh berupa `MemberExpr` (chaining: `a.b.c`) atau `CallExpr` (`f().result`) atau `Identifier`.
- `MemberExpr.property` selalu berupa `Identifier` (nama properti).
- `CallExpr.callee` boleh berupa `Identifier`, `MemberExpr`, atau `CallExpr` (higher-order).
- `Literal` dan `Identifier` tidak boleh memiliki anak ekspresi (mereka adalah leaf node).

---

## 6. Pratt Precedence Specification

Ekspresi di KARSA di-parse menggunakan Pratt Parser. Berikut adalah tabel *Binding Power* (bp). Semakin tinggi bp, semakin kuat ikatannya (dievaluasi lebih dulu). Spesifikasi ini bersifat normatif; implementasi wajib mengikuti tabel ini persis.

### 6.1 Tabel Binding Power

| Level | Operator / Token KARSA | Token Type | bp (Left) | bp (Right) | Posisi | Asosiatif | Keterangan |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---|
| 1 | `atau` | `TK_ATAU` | 2 | 1 | Infix | Kiri | Disjungsi logika |
| 2 | `dan` | `TK_DAN` | 4 | 3 | Infix | Kiri | Konjungsi logika |
| 3 | `bukan` | `TK_BUKAN` | — | 5 | Prefix | N/A | Negasi unary logika |
| 4 | `sama dengan` | `TK_SAMA_DENGAN` | 7 | 6 | Infix | Kiri | Perbandingan kesetaraan |
| 4 | `tidak sama dengan` | `TK_TIDAK_SAMA_DENGAN` | 7 | 6 | Infix | Kiri | Perbandingan ketaksamaan |
| 4 | `lebih dari` | `TK_LEBIH_DARI` | 7 | 6 | Infix | Kiri | Perbandingan lebih |
| 4 | `kurang dari` | `TK_KURANG_DARI` | 7 | 6 | Infix | Kiri | Perbandingan kurang |
| 4 | `paling sedikit` | `TK_PALING_SEDIKIT` | 7 | 6 | Infix | Kiri | Perbandingan ≥ |
| 4 | `paling banyak` | `TK_PALING_BANYAK` | 7 | 6 | Infix | Kiri | Perbandingan ≤ |
| 4 | `ada di` | `TK_ADA_DI` | 7 | 6 | Infix | Kiri | Keanggotaan |
| 4 | `tidak ada di` | `TK_TIDAK_ADA_DI` | 7 | 6 | Infix | Kiri | Non-keanggotaan |
| 5 | `+` | `TK_PLUS` | 9 | 8 | Infix | Kiri | Penjumlahan / Konkatenasi |
| 5 | `-` | `TK_MINUS` | 9 | 8 | Infix | Kiri | Pengurangan |
| 6 | `*` | `TK_BINTANG` | 11 | 10 | Infix | Kiri | Perkalian |
| 6 | `/` | `TK_GARIS_MIRING` | 11 | 10 | Infix | Kiri | Pembagian |
| 7 | `-` (negatif) | `TK_MINUS` | — | 12 | Prefix | N/A | Negasi numerik unary |
| 8 | `.` | `TK_TITIK` | 15 | 14 | Postfix | Kiri | Member access |
| 8 | `()` | `TK_KURUNG_BUKA` | 15 | 14 | Postfix | Kiri | Function call |
| 9 | `( ... )` | `TK_KURUNG_BUKA` | — | 16 | Prefix | N/A | Grouping / Parens |

### 6.2 Aturan Khusus Pratt

1. **Prefix Operators.** Token berikut diperlakukan sebagai prefix dalam Pratt parser:
   - `TK_BUKAN` → `UnaryExpression` dengan operator `"bukan"`
   - `TK_MINUS` → `UnaryExpression` dengan operator `"-"` (hanya bila konteks mengizinkan: setelah operator lain, setelah awal ekspresi, atau setelah pembuka kurung)
   - `TK_KURUNG_BUKA` → Grouping expression `(ekspresi)`

2. **Disambiguasi `-` Prefix vs Infix.** Parser menggunakan aturan berikut untuk menentukan apakah `TK_MINUS` adalah prefix (negatif) atau infix (pengurangan):
   - Jika token sebelumnya adalah nilai (literal, identifier, `)`, `]`) → **Infix** (pengurangan, bp 9/8)
   - Jika token sebelumnya adalah operator, pembuka kurung, awal ekspresi, atau koma → **Prefix** (negasi, bp right 12)

3. **Infix/Postfix Operators.** Semua operator lainnya sesuai tabel di atas. Perhatikan bahwa `.` dan `()` secara teknis adalah postfix/left-associative dalam Pratt, tetapi dipetakan ke level binding power tertinggi setelah grouping.

4. **Chaining Member Access dan Call.** Ekspresi `a.b.c(x).y` di-parse sebagai chaining postfix dari kiri ke kanan:
   ```
   MemberExpr(
     object: CallExpr(
       callee: MemberExpr(
         object: MemberExpr(
           object: Identifier("a"),
           property: Identifier("b")
         ),
         property: Identifier("c")
       ),
       arguments: [Identifier("x")]
     ),
     property: Identifier("y")
   )
   ```

5. **Pemanggilan Fungsi vs Grouping.** `TK_KURUNG_BUKA` dapat berarti grouping prefix atau function call postfix. Disambiguasi:
   - Jika token sebelumnya adalah nilai (identifier, literal, `)`, `]`) → **Function Call** (postfix)
   - Jika tidak → **Grouping** (prefix)

6. **Ekspresi Teks (String Concatenation).** Operator `+` (bp 9/8) menangani string concatenation. Parser tidak membedakan antara penjumlahan numerik dan konkatenasi string; keduanya menghasilkan `BinaryExpression` dengan operator `"+"`. Pembedaan dilakukan oleh Analyzer/Compiler.

7. **Tidak Ada Ternary.** Grammar KARSA v0.3.1 tidak memiliki operator ternary. Ekspresi kondisional hanya melalui `JikaStatement`.

8. **Tidak Ada Operator Modulo/Eksponensial.** Grammar KARSA v0.3.1 tidak mendefinisikan `%` atau `**`. Jika ditemukan token tersebut dalam konteks ekspresi, parser wajib melaporkan error E2011.

### 6.3 Primary Expression

Berikut adalah token yang memulai primary expression (nud function dalam Pratt):

| Token | Hasil Node | Keterangan |
|---|---|---|
| `TK_LITERAL_TEKS` | `Literal` | `kind: "teks"` |
| `TK_LITERAL_ANGKA` | `Literal` | `kind: "angka"` |
| `TK_BENAR` / `TK_SALAH` | `Literal` | `kind: "boolean"` |
| `TK_KOSONG` | `Literal` | `kind: "kosong"` |
| `TK_IDENTIFIER` | `Identifier` | Nama variabel/fungsi |
| `TK_KURUNG_BUKA` | Grouping / Call | Tergantung konteks (lihat 6.2.5) |
| `TK_BUKAN` | `UnaryExpression` | Prefix negasi |
| `TK_MINUS` | `UnaryExpression` | Prefix negasi numerik |
| `TK_KURAWAL_BUKA` | `ObjectLiteral` | Objek literal |
| `TK_KURUNG_SIKU_BUKA` | `ArrayLiteral` | Array literal |

### 6.4 Algoritma Pratt (Referensi)

```
fungsi parseExpression(minBp):
  lhs = parsePrefix()         // nud

  selama true:
    op = peek()
    jika op adalah infix/postfix:
      lbp = bindingPower(op, sisi="left")
      jika lbp < minBp: break
      rbp = bindingPower(op, sisi="right")
      advance()               // konsumsi operator
      rhs = parseExpression(rbp)
      lhs = buatNode(op, lhs, rhs)
    lainnya:
      break

  kembalikan lhs
```

---

## 7. Error Recovery Specification

### 7.1 Prinsip Dasar

Ketika parser menemui token yang tidak diharapkan (unexpected token), parser **tidak boleh** menghentikan proses secara fatal (throw, crash, atau mengembalikan AST parsial). Parser wajib menjalankan prosedur **Synchronize** dan melanjutkan parsing.

**Jaminan Error Recovery:**
- Untuk setiap source code yang diberikan (bahkan yang sangat rusak), `parse()` selalu mengembalikan `ParseResult` dengan `ast` non-null dan `errors` yang berisi semua error yang ditemukan.
- Jumlah error yang dilaporkan minimal sama dengan jumlah error aktual (boleh lebih jika error berantai, tetapi harus memuat semua error utama).
- Error recovery tidak boleh menghasilkan AST yang melanggar invariant struktural (I-01 s/d I-17).

### 7.2 Titik Sinkronisasi (Synchronization Points)

Parser akan membuang token (menggunakan `advance()`) hingga menemui salah satu dari token sinkronisasi berikut:

**Sinkronisasi Utama (selalu berlaku):**
1. `TK_BARIS_BARU`
2. `TK_DEDENT`
3. `TK_EOF`

**Sinkronisasi Kontekstual (berlaku di level statement):**
4. Token keyword awal baris yang menjadi pembuka statement baru:
   - `TK_BUAT`, `TK_TAMPILKAN`, `TK_SEMBUNYIKAN`, `TK_HAPUS`, `TK_KOSONGKAN`, `TK_PERBARUI`
   - `TK_KETIKA`, `TK_SAAT`, `TK_SETELAH`
   - `TK_JIKA`, `TK_KALAU`, `TK_JIKA_TIDAK`, `TK_ULANGI`, `TK_SELAMA`
   - `TK_BERHENTI`, `TK_LEWATI`, `TK_KEMBALIKAN`
   - `TK_DATA`, `TK_TETAP`, `TK_UBAH`, `TK_TURUNAN`, `TK_SIMPAN`, `TK_AMBIL`
   - `TK_TAMBAHKAN`, `TK_KURANGI`, `TK_SISIPKAN`
   - `TK_KOMPONEN`, `TK_GUNAKAN`, `TK_FUNGSI`, `TK_JALANKAN`
   - `TK_ARAHKAN`, `TK_MUAT_ULANG`, `TK_KEMBALI`
   - `TK_LANGSUNG`

**Sinkronisasi Kontekstual (berlaku di level ekspresi):**
5. `TK_KURUNG_TUTUP`, `TK_KURAWAL_TUTUP`, `TK_KURUNG_SIKU_TUTUP` — untuk recovery dari error di dalam ekspresi

**Aturan Pemilihan Titik Sinkronisasi:**
- Di level statement, gunakan Sinkronisasi Utama + Kontekstual (4).
- Di level ekspresi, gunakan Sinkronisasi Utama + Kontekstual (5).
- Jika sinkronisasi dilakukan di tengah indentasi yang lebih dalam, dan ditemukan `TK_DEDENT`, parser wajib menutup semua blok yang masih terbuka hingga level indentasi yang sesuai.

### 7.3 Prosedur Recovery

Prosedur berikut dijalankan setiap kali parser menemui token yang tidak diharapkan:

```
prosedur recover(expectedDesc: string):
  1. Catat token yang bermasalah beserta lokasinya.
  2. Buat objek ParseError:
     - code: kode error yang sesuai (lihat Lampiran A)
     - message: "Diharapkan <expectedDesc>, tetapi ditemukan <token.nilai>"
     - explanation: penjelasan singkat konteks
     - suggestion: saran perbaikan jika dapat ditentukan
     - loc: lokasi token saat ini
     - severity: "error"
  3. Masukkan ParseError ke array errors.
  4. Buat node ErrorNode dengan:
     - type: "ErrorNode"
     - loc: lokasi token saat ini
     - code: kode error
     - originalToken: representasi token yang bermasalah
  5. Panggil synchronize() untuk memajukan posisi ke titik sinkronisasi terdekat.
  6. Kembalikan ErrorNode kepada pemanggil.
  7. Pemanggil memasukkan ErrorNode ke posisi yang sesuai dalam AST.
```

### 7.4 Strategi Recovery per Konteks

**7.4.1 Recovery di Level Statement**

Ketika token yang tidak diharapkan ditemukan di posisi statement (misalnya, token bukan keyword awal statement):
- Buat ErrorNode.
- Sinkronkan ke baris baru atau keyword statement berikutnya.
- Lanjutkan parsing statement berikutnya.

**7.4.2 Recovery di Level Ekspresi**

Ketika ekspresi tidak dapat di-parse (misalnya, operator tanpa operand kanan):
- Buat ErrorNode sebagai operand pengganti.
- Jika operator infix tidak memiliki operand kanan, buat ErrorNode sebagai `right` dari `BinaryExpression`.
- Jika kurung buka tidak memiliki kurung tutup, sinkronkan ke `TK_KURUNG_TUTUP` berikutnya atau akhir ekspresi.
- Lanjutkan parsing ekspresi.

**7.4.3 Recovery di Level Blok**

Ketika blok indentasi diharapkan tetapi tidak ditemukan (misalnya, `TK_TITIK_DUA` diikuti langsung oleh statement di baris yang sama, bukan `TK_INDENT`):
- Jika ditemukan `TK_PANAH`, parse sebagai aksi tunggal (inline action).
- Jika tidak, buat `BlockStatement` kosong dengan ErrorNode, catat warning bahwa blok kosong, dan lanjutkan.

**7.4.4 Recovery pada Selector**

Ketika selector tidak lengkap (misalnya, `TK_BUAT` tanpa tag HTML atau identifier):
- Buat `BuatStatement` dengan `selector` berupa ErrorNode.
- Sinkronkan ke akhir baris.
- Lanjutkan ke statement berikutnya.

**7.4.5 Recovery pada Indentasi Tidak Sesuai**

Ketika `TK_DEDENT` ditemukan di luar konteks yang diharapkan (misalnya, terlalu banyak dedent):
- Catat error E2020.
- Sesuaikan stack indentasi internal parser.
- Lanjutkan parsing dari level yang benar.

### 7.5 Pelaporan Warning

Selain error, parser boleh mengeluarkan warning (severity: "warning") untuk situasi berikut:

| Kode | Situasi |
|---|---|
| W2001 | DocString (`--?`) tidak menempel ke node manapun |
| W2002 | Blok kosong (indentasi tanpa statement) |
| W2003 | `jika` tanpa cabang `kalau` atau `jika tidak` (tidak error, hanya informasi) |
| W2004 | Pemanggilan fungsi dengan jumlah argumen yang dicurigai salah (heuristic, tidak blocking) |

---

## 8. Visitor Pattern Contract

### 8.1 Motivasi

AST yang dihasilkan Parser akan dikonsumsi oleh beberapa fase berikutnya (Resolver, Analyzer, Compiler) yang masing-masing perlu melakukan traversing dengan logika berbeda. Untuk memastikan konsistensi traversing dan memisahkan logika visitor dari struktur AST, Parser wajib mendukung Visitor Pattern melalui antarmuka berikut.

### 8.2 Antarmuka Visitor

```typescript
/**
 * Antarmuka dasar visitor untuk traversing AST.
 *
 * Setiap metode menerima node yang sesuai dan mengembalikan
 * nilai generik T (biasanya void untuk side-effect visitor,
 * atau node yang sudah ditransformasi untuk transformer).
 *
 * Metode yang tidak di-override oleh implementasi visitor
 * secara default memanggil genericVisit() untuk melanjutkan
 * traversing ke anak-anak node.
 */
interface KarsaVisitor<T> {
  visitProgram(node: ProgramNode): T;
  visitBlockStatement(node: BlockStatement): T;
  visitBuatStatement(node: BuatStatement): T;
  visitTampilkanStatement(node: TampilkanStatement): T;
  visitSembunyikanStatement(node: SembunyikanStatement): T;
  visitHapusStatement(node: HapusStatement): T;
  visitKosongkanStatement(node: KosongkanStatement): T;
  visitPerbaruiStatement(node: PerbaruiStatement): T;
  visitKetikaStatement(node: KetikaStatement): T;
  visitSaatStatement(node: SaatStatement): T;
  visitSetelahStatement(node: SetelahStatement): T;
  visitJikaStatement(node: JikaStatement): T;
  visitUlangiStatement(node: UlangiStatement): T;
  visitSelamaStatement(node: SelamaStatement): T;
  visitBerhentiStatement(node: BerhentiStatement): T;
  visitLewatiStatement(node: LewatiStatement): T;
  visitKembalikanStatement(node: KembalikanStatement): T;
  visitDataDeclaration(node: DataDeclaration): T;
  visitTetapDeclaration(node: TetapDeclaration): T;
  visitUbahDeclaration(node: UbahDeclaration): T;
  visitTurunanDeclaration(node: TurunanDeclaration): T;
  visitSimpanStatement(node: SimpanStatement): T;
  visitTambahkanStatement(node: TambahkanStatement): T;
  visitKurangiStatement(node: KurangiStatement): T;
  visitSisipkanStatement(node: SisipkanStatement): T;
  visitAmbilDomStatement(node: AmbilDomStatement): T;
  visitAmbilLuarStatement(node: AmbilLuarStatement): T;
  visitKomponenDeclaration(node: KomponenDeclaration): T;
  visitGunakanStatement(node: GunakanStatement): T;
  visitFungsiDeclaration(node: FungsiDeclaration): T;
  visitJalankanExpression(node: JalankanExpression): T;
  visitArahkanStatement(node: ArahkanStatement): T;
  visitMuatUlangStatement(node: MuatUlangStatement): T;
  visitKembaliStatement(node: KembaliStatement): T;
  visitLangsungBlock(node: LangsungBlock): T;
  visitRantaiAksi(node: RantaiAksi): T;
  visitErrorNode(node: ErrorNode): T;

  // Ekspresi
  visitLiteral(node: Literal): T;
  visitIdentifier(node: Identifier): T;
  visitBinaryExpression(node: BinaryExpression): T;
  visitUnaryExpression(node: UnaryExpression): T;
  visitMemberExpression(node: MemberExpression): T;
  visitCallExpression(node: CallExpression): T;
  visitObjectLiteral(node: ObjectLiteral): T;
  visitArrayLiteral(node: ArrayLiteral): T;
  visitPanggilNativeExpression(node: PanggilNativeExpression): T;

  // Selektor dan properti
  visitSelector(node: Selector): T;
  visitPropertyNode(node: PropertyNode): T;
  visitAttributeNode(node: AttributeNode): T;

  /**
   * Metode generic untuk node yang tidak memiliki visit khusus.
   * Default: traversing semua anak.
   */
  genericVisit(node: ASTNode): T;
}
```

### 8.3 Aturan Visitor

1. **Dispatch otomatis.** Parser (atau utilitas AST) menyediakan fungsi `accept(node, visitor)` yang melakukan dispatch ke metode visit yang sesuai berdasarkan `node.type`. Implementasi visitor tidak perlu melakukan dispatch manual.

2. **Traversing Default.** Jika metode visit tidak di-override, `genericVisit()` dipanggil. `genericVisit()` wajib melakukan traversing depth-first ke semua anak node. Urutan traversing: anak pertama hingga anak terakhir sesuai urutan dalam array.

3. **Tidak Mengubah Struktur.** Visitor pada fase Resolver dan Analyzer tidak boleh mengubah struktur pohon AST (menambah, menghapus, atau memindahkan node). Mereka hanya boleh menambahkan anotasi (properti baru) pada node yang sudah ada. Hanya transformer khusus (jika ada) yang boleh mengubah struktur.

4. **ErrorNode Wajib Dikunjungi.** Visitor wajib mengimplementasikan `visitErrorNode`. Visitor tidak boleh mengabaikan ErrorNode; minimal ia harus mencatat keberadaannya atau melakukan aksi yang sesuai (misalnya: skip, log, propagate error).

5. **DocString Terikat.** DocString pada node diakses melalui `node.docstring`. Visitor tidak perlu traversing docstring secara terpisah; docstring adalah bagian dari node yang memilikinya.

6. **Re-entrance.** Visitor harus aman untuk dipanggil berkali-kali pada AST yang sama (idempoten terhadap side-effect pada AST). Jika visitor menyimpan state internal, state tersebut harus di-reset secara eksplisit oleh pemanggil sebelum penggunaan berikutnya.

---

## 9. Resolver Handoff Contract

### 9.1 Antarmuka Penyerahan

Parser menyerahkan AST murni ke fase Resolver. Resolver tidak menerima token, hanya AST.

```typescript
interface ParserToResolver {
  ast: ProgramNode;           // AST murni dari Parser
  errors: ParseError[];       // Error yang ditemukan Parser
}
```

### 9.2 Jaminan Parser ke Resolver

1. **Struktur AST Sesuai Grammar.** Struktur AST dijamin mematuhi grammar v0.3.1 dari sisi sintaksis. Indentasi, blok, dan pemisahan statement sudah benar. Jika ada error sintaksis, node yang bermasalah digantikan oleh `ErrorNode`.

2. **Identifier Belum Diresolusi.** Setiap identifier di AST masih berupa string mentah (`Identifier` node dengan properti `name: string`). Belum ada validasi apakah variabel/fungsi tersebut dideklarasikan, berada dalam scope yang benar, atau memiliki tipe yang sesuai.

3. **Pemanggilan Fungsi Tidak Dibedakan.** Parser tidak mengerti mana yang `pemanggilan_native` (fungsi Karsa) vs `pemanggilan_fungsi` (JS eksternal) secara semantik. Perbedaan ini didasarkan pada sintaksis:
   - `f(x)` → `PanggilNativeExpression` (kemungkinan fungsi Karsa)
   - `jalankan f` → `JalankanExpression` (pasti fungsi JS eksternal)
   - Resolver bertugas memvalidasi apakah `PanggilNativeExpression` benar-benar memanggil fungsi yang dideklarasikan dengan `fungsi`.

4. **Self-Reference Belum Divalidasi.** `KetikaStatement` tanpa `target` (self-reference) di-parse sebagaimana adanya. Resolver bertugas memvalidasi bahwa self-reference hanya muncul di dalam blok `BuatStatement` atau `KomponenDeclaration`.

5. **Alias Properti Masih Mentah.** Properti Indonesia (misal: `.panjang`, `.ditandai`) tetap ada sebagai string mentah pada `MemberExpression.property`. Resolver bertugas menerjemahkannya ke API DOM/JS yang sesuai.

6. **Scope Belum Dibangun.** Tidak ada symbol table atau scope chain yang terbentuk. Resolver bertugas membangun *Symbol Table*, memvalidasi deklarasi, memeriksa aturan scope, dan mencari referensi.

7. **Type Hint Masih String.** Type hint pada deklarasi (misal: `data x: angka`) disimpan sebagai string mentah. Resolver/Analyzer bertugas memvalidasi kesesuaian type hint.

8. **DocString Sudah Terikat.** DocString sudah dilampirkan ke node yang sesuai melalui properti `docstring`. Resolver tidak perlu mencocokkan ulang.

### 9.3 Tanggung Jawab Resolver (di luar Parser)

- Membangun Symbol Table
- Memvalidasi deklarasi variabel, fungsi, komponen
- Memeriksa aturan scope (global, blok, komponen, iterasi, watcher)
- Menerjemahkan alias properti Indonesia → JS API
- Memvalidasi self-reference event target
- Memvalidasi `berhenti` hanya di konteks yang benar (loop atau event handler)
- Membedakan `PanggilNativeExpression` yang valid vs yang error

### 9.4 Anotasi Resolver ke AST

Resolver menambahkan anotasi pada node AST tanpa mengubah strukturnya. Anotasi wajib disimpan dalam properti khusus yang tidak bertentangan dengan properti Parser:

```typescript
interface ResolvedNode extends ASTNode {
  _resolved?: {
    symbol?: Symbol;           // Symbol table entry
    scope?: Scope;             // Scope yang memuat node ini
    isReactive?: boolean;      // Apakah ini state reaktif
    selfReference?: boolean;   // Apakah event target adalah self-reference
  };
}
```

---

## 10. Compiler Handoff Contract

### 10.1 Antarmuka Penyerahan

Compiler menerima AST yang sudah tervalidasi dan di-resolve oleh Resolver (Annotated AST), berserta laporan Analyzer.

```typescript
interface ResolverToCompiler {
  ast: ProgramNode;                    // AST yang sudah di-resolve
  symbolTable: SymbolTable;            // Tabel simbol
  errors: (ParseError | ResolverError | AnalyzerError)[];
}
```

### 10.2 Jaminan Resolver/Parser ke Compiler

1. **Tidak Ada Error Fatal.** Compiler berhak mengasumsikan tidak ada error sintaksis atau semantik yang fatal pada AST yang diterimanya. Jika masih ada error fatal, kompilasi tidak boleh dilanjutkan; compiler wajib menampilkan semua error dan berhenti.

2. **Alias Properti Masih Mentah di AST.** Semua alias properti Indonesia (misal: `.panjang`, `.ditandai`) tetap ada sebagai string mentah di `MemberExpression.property`. Compiler bertugas menerjemahkannya ke API DOM/JS yang sesuai berdasarkan anotasi Resolver.

3. **Properti Virtual di Iterasi.** Compiler bertanggung jawab menyuntikkan properti virtual `.indeks` dan `.nilai` pada konteks iterasi `UlangiStatement` saat kode JS di-generate. Parser hanya menyimpan referensi ke `.indeks` dan `.nilai` sebagai `MemberExpression` biasa.

4. **Berhenti Statement.** Compiler menerima `BerhentiStatement` tanpa konteks. Berdasarkan anotasi Resolver, Compiler menentukan apakah `berhenti` dikompilasi menjadi `break` (di dalam loop) atau `return` (di dalam event handler).

5. **Langsung Block.** `LangsungBlock` berisi kode JS mentah yang harus disisipkan langsung ke output tanpa transformasi. Compiler wajib menyisipkan konten ini verbatim.

6. **Jalankan Expression.** `JalankanExpression` dipetakan langsung ke pemanggilan fungsi JS tanpa validasi tambahan. Compiler tidak memvalidasi signature fungsi eksternal.

7. **DocString.** Compiler boleh menggunakan `docstring` untuk menghasilkan `title` HTML atau metadata, tetapi tidak wajib. DocString tidak mempengaruhi semantik runtime.

---

## 11. Future Compatibility Rules

Untuk memastikan parser dapat berkembang tanpa memecah ekosistem, aturan berikut wajib dipatuhi oleh semua perubahan di masa depan.

### 11.1 Penambahan Node AST

Tipe node AST baru boleh ditambahkan di masa depan (misal: untuk fitur `switch`, `try-catch`, `match`, atau `async/await`) tanpa memecah parser lama, selama:

1. Node baru tidak mengubah pola traversing node yang sudah ada (properti anak pada node yang sudah ada tidak berubah nama atau tipe).
2. Visitor yang tidak mengimplementasikan metode visit untuk node baru akan menerima `genericVisit()`, bukan error.
3. Node baru wajib memiliki `type`, `loc`, dan konstruksi yang konsisten dengan invariant I-01 s/d I-17.

### 11.2 Penambahan Keyword / Token

Penambahan keyword baru di grammar wajib didaftarkan di Lexer terlebih dahulu. Parser harus menerapkan aturan *fail-safe* berikut:

1. Jika Parser menemui keyword yang tidak dikenali di posisi statement, ia wajib memperlakukannya sebagai error sintaksis (E2010) dan melakukan recovery.
2. Jika keyword baru adalah operator ekspresi, Parser wajib mendaftarkan binding power baru dalam tabel Pratt. Tabel binding power yang sudah ada tidak boleh diubah nilainya (hanya penambahan baris baru yang diperbolehkan).
3. Keyword baru tidak boleh "mencuri" token yang sebelumnya dikenali sebagai identifier, kecuali melalui rilis versi MAJOR.

### 11.3 Properti Node

1. **Penambahan Properti.** Properti AST boleh ditambahkan (misal: menambahkan `flags: { reactive: boolean }` pada node) tanpa memecah konsumer yang sudah ada, selama properti baru bersifat opsional (boleh `undefined`).
2. **Penghapusan Properti.** Properti yang sudah ada tidak boleh dihapus tanpa merilis versi MAJOR.
3. **Perubahan Tipe Properti.** Tipe data properti yang sudah ada tidak boleh diubah secara breaking (misalnya: `string` → `number`) tanpa merilis versi MAJOR. Perubahan ke tipe yang lebih spesifik (misalnya: `string` → `"teks" | "angka" | "boolean"`) diperbolehkan dalam rilis MINOR jika backward-compatible.
4. **Properti Wajib vs Opsional.** Properti yang ditandai wajib dalam AST Specification tidak boleh menjadi opsional dalam rilis PATCH atau MINOR. Properti opsional boleh menjadi wajib hanya dalam rilis MAJOR.

### 11.4 Perubahan Grammar

1. Perubahan grammar yang bersifat additive (menambahkan produksi baru, menambahkan alternatif dalam produksi yang sudah ada) diperbolehkan dalam rilis MINOR.
2. Perubahan grammar yang menghapus atau mengubah semantik produksi yang sudah ada wajib melalui rilis MAJOR.
3. Parser wajib mendukung grammar v0.3.1 secara penuh. Jika grammar v0.4.0 memperkenalkan perubahan breaking, parser v0.4.0 wajib tetap dapat mem-parse kode v0.3.1 melalui opsi versi grammar.

### 11.5 Stabilitas Kode Error

Kode error (E2xxx) yang sudah didefinisikan tidak boleh dihapus atau diubah maknanya. Kode error baru boleh ditambahkan di antara kode yang sudah ada (tidak harus berurutan). Kode error yang sudah didefinisikan boleh ditandai sebagai "deprecated" dalam rilis MINOR, tetapi tetap harus dikenali dalam rilis MAJOR yang sama.

---

## 12. Versioning Policy

Spesifikasi dan implementasi Parser & AST menggunakan Semantic Versioning (SemVer) `MAJOR.MINOR.PATCH`.

### 12.1 Klasifikasi Perubahan

| Jenis Perubahan | Contoh | Level |
|---|---|---|
| **MAJOR** | Penghapusan node AST, perubahan tipe data field wajib, perubahan arah edge pada Node Ownership Matrix, penghapusan keyword, perubahan binding power operator yang sudah ada | Breaking |
| **MINOR** | Penambahan node baru, penambahan field opsional pada node, peningkatan mekanisme error recovery, penambahan precedence level baru, penambahan keyword, penambahan visitor method | Non-breaking additive |
| **PATCH** | Perbaikan bug parsing yang tidak mengubah struktur AST output, perbaikan pesan error, optimisasi internal yang tidak mengubah API | Non-breaking fix |

### 12.2 Versi Dokumen vs Versi Implementasi

- **Versi Dokumen** (RFC-PARSER-001): Mengikuti SemVer secara independen dari versi implementasi. Perubahan pada dokumen ini wajib dicatat dalam tabel di bawah.
- **Versi Implementasi**: Versi package parser mengikuti SemVer. Implementasi wajib menyatakan versi dokumen RFC yang diikuti.

### 12.3 Riwayat Versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0.0 | 2026-06-10 | Rilis awal RFC-PARSER-001 |
| 1.1.0 | 2026-06-13 | Penambahan: Token Contract (§2), AST Invariants (§4), Node Ownership Matrix (§5), Visitor Pattern Contract (§8), Error Code Catalog (Lampiran A), Keyword Map (Lampiran B). Penguatan: Parser API Contract (§3), Pratt Precedence (§6), Error Recovery (§7), Resolver Handoff (§9), Compiler Handoff (§10), Future Compatibility (§11), Versioning Policy (§12) |

### 12.4 Kompatibilitas Grammar

Versi dokumen ini berdasarkan **KARSA grammar spec v0.3.1**. Jika grammar spec berubah ke versi baru, dokumen ini harus diperbarui dan versi dokumen dinaikkan sesuai klasifikasi perubahan di §12.1.

---

## Lampiran A — Kode Error Parser (E2xxx)

Kode error parser menggunakan rentang `E2xxx`. Kode error Lexer menggunakan `E1xxx`, Resolver `E3xxx`, Analyzer `E4xxx`, dan Compiler `E5xxx` ke atas.

### A.1 Kode Error Fatal

| Kode | Pesan | Kondisi | Saran |
|---|---|---|---|
| E2001 | Diharapkan `<expected>`, tetapi ditemukan `<actual>` | Token tidak sesuai dengan yang diharapkan oleh grammar | Periksa sintaksis pada lokasi yang ditunjuk |
| E2002 | Selector tidak valid | `TK_BUAT` tidak diikuti oleh tag HTML, identifier, atau selector yang valid | Pastikan selector diawali nama tag HTML atau identifier |
| E2003 | Nama komponen harus diawali huruf kapital | `TK_KOMPONEN` diikuti identifier yang tidak diawali huruf kapital | Gunakan PascalCase untuk nama komponen |
| E2004 | Blok aksi diharapkan setelah `:` | `TK_TITIK_DUA` tidak diikuti oleh `TK_INDENT` atau `TK_PANAH` | Tambahkan indentasi atau `->` untuk aksi tunggal |
| E2005 | Kurung tutup `)` tidak ditemukan | Pemanggilan fungsi atau grouping tidak ditutup | Tambahkan `)` pada akhir ekspresi |
| E2006 | Kurung kurawal tutup `}` tidak ditemukan | Objek literal tidak ditutup | Tambahkan `}` pada akhir objek literal |
| E2007 | Kurung siku tutup `]` tidak ditemukan | Array literal atau atribut selector tidak ditutup | Tambahkan `]` pada akhir array/atribut |
| E2008 | Nilai awal diharapkan setelah `=` | Deklarasi data/tetap/ubah tidak memiliki nilai awal | Tambahkan nilai setelah `=` |
| E2009 | Kondisi tidak valid | Kondisi pada `jika`/`selama` tidak dapat di-parse | Periksa ekspresi kondisi |
| E2010 | Keyword tidak dikenali di posisi statement | Keyword ditemukan di posisi yang tidak valid untuk statement tersebut | Periksa konteks penggunaan keyword |
| E2011 | Operator tidak didukung | Operator yang tidak ada di grammar KARSA (misal: `%`, `**`) | Gunakan `langsung:` untuk operasi yang tidak didukung |
| E2012 | Argumen fungsi tidak valid | Daftar argumen pemanggilan fungsi mengandung token yang tidak valid | Periksa sintaksis argumen |
| E2013 | Parameter komponen/fungsi tidak valid | Daftar parameter mengandung token yang tidak valid | Periksa sintaksis parameter |
| E2014 | Properti objek literal tidak valid | Entri objek literal tidak sesuai pola `kunci: nilai` atau shorthand | Periksa sintaksis objek literal |
| E2015 | Selector CSS tidak valid | Token `TK_ID`, `TK_CLASS`, atau `TK_ATRIBUT` muncul tanpa konteks selector | Periksa konteks penggunaan selector |
| E2016 | Token `->` diharapkan | `TK_PERBARUI` tidak diikuti pola yang benar | Gunakan pola: `perbarui <properti> <target> -> <nilai>` |
| E2017 | Target event tidak valid | `TK_KETIKA` diikuti token yang bukan target event atau nama event | Periksa target dan nama event |
| E2018 | Nama event tidak valid | Token setelah target event bukan nama event yang dikenali | Periksa nama event (diklik, diketik, dsb.) |
| E2019 | `jika tidak` hanya valid di akhir rantai `jika`/`kalau` | `TK_JIKA_TIDAK` muncul tanpa `TK_JIKA` atau `TK_KALAU` sebelumnya | Pastikan `jika tidak` mengikuti `jika` atau `kalau` |
| E2020 | Indentasi tidak konsisten | `TK_DEDENT` atau `TK_INDENT` tidak sesuai dengan stack indentasi | Periksa indentasi (2 spasi per level) |
| E2021 | Sumber data ulangi tidak valid | `TK_ULANGI` diikuti pola yang tidak sesuai grammar | Gunakan: `ulangi <nama> dari <sumber>:`, `ulangi <N> kali:`, atau `ulangi <nama> dari <A> sampai <B>:` |
| E2022 | Target `tampilkan` tidak valid | `TK_TAMPILKAN` diikuti token yang tidak sesuai grammar | Periksa target tampilkan |
| E2023 | Token tidak terduga di akhir file | Token signifikan ditemukan setelah `TK_EOF` seharusnya | Ini menandakan bug Lexer; laporkan ke tim |
| E2024 | `ambil` tanpa konteks yang jelas | `TK_AMBIL` tidak diikuti pola DOM read atau network fetch | Gunakan: `ambil <jenis> dari <sumber> -> simpan ke <nama>` atau `ambil dari <url>:` |
| E2025 | Daftar props `gunakan` tidak valid | `TK_GUNAKAN` diikuti pola yang tidak sesuai | Gunakan: `gunakan <Komponen> dengan <prop>: <nilai>` |

### A.2 Kode Warning

| Kode | Pesan | Kondisi |
|---|---|---|
| W2001 | DocString tidak menempel ke node manapun | `TK_KOMENTAR_DOC` tidak diikuti oleh node signifikan |
| W2002 | Blok kosong terdeteksi | `TK_INDENT` diikuti langsung `TK_DEDENT` tanpa statement |
| W2003 | Rantai `jika` tanpa cabang `jika tidak` | `JikaStatement` tanpa alternate (tidak error, hanya informasi) |
| W2004 | Jumlah argumen mungkin tidak sesuai | Heuristic: jumlah argumen pemanggilan berbeda dari deklarasi (tidak dapat dipastikan tanpa Resolver) |

---

## Lampiran B — Peta Keyword ke Statement Handler

Berikut adalah peta langsung dari token keyword awal statement ke handler parsing yang harus dipanggil. Parser menggunakan peta ini untuk dispatch statement parsing setelah mengonsumsi keyword pertama.

| Token Awal | Handler | Metode Parser (rekomendasi) |
|---|---|---|
| `TK_BUAT` | BuatStatement | `parseBuatStatement()` |
| `TK_TAMPILKAN` | TampilkanStatement | `parseTampilkanStatement()` |
| `TK_SEMBUNYIKAN` | SembunyikanStatement | `parseSembunyikanStatement()` |
| `TK_HAPUS` | HapusStatement | `parseHapusStatement()` |
| `TK_KOSONGKAN` | KosongkanStatement | `parseKosongkanStatement()` |
| `TK_PERBARUI` | PerbaruiStatement | `parsePerbaruiStatement()` |
| `TK_KETIKA` | KetikaStatement | `parseKetikaStatement()` |
| `TK_SAAT` | SaatStatement / LifecycleStatement | `parseSaatStatement()` — harus disambiguasi: `saat <nama> berubah` vs `saat komponen dipasang/diperbarui/dilepas` |
| `TK_SETELAH` | SetelahStatement | `parseSetelahStatement()` |
| `TK_JIKA` | JikaStatement | `parseJikaStatement()` |
| `TK_ULANGI` | UlangiStatement | `parseUlangiStatement()` |
| `TK_SELAMA` | SelamaStatement | `parseSelamaStatement()` |
| `TK_BERHENTI` | BerhentiStatement | `parseBerhentiStatement()` |
| `TK_LEWATI` | LewatiStatement | `parseLewatiStatement()` |
| `TK_KEMBALIKAN` | KembalikanStatement | `parseKembalikanStatement()` |
| `TK_DATA` | DataDeclaration | `parseDataDeclaration()` |
| `TK_TETAP` | TetapDeclaration | `parseTetapDeclaration()` |
| `TK_UBAH` | UbahDeclaration | `parseUbahDeclaration()` |
| `TK_TURUNAN` | TurunanDeclaration | `parseTurunanDeclaration()` |
| `TK_SIMPAN` | SimpanStatement | `parseSimpanStatement()` |
| `TK_TAMBAHKAN` | TambahkanStatement | `parseTambahkanStatement()` |
| `TK_KURANGI` | KurangiStatement | `parseKurangiStatement()` |
| `TK_SISIPKAN` | SisipkanStatement | `parseSisipkanStatement()` |
| `TK_AMBIL` | AmbilDomStatement / AmbilLuarStatement | `parseAmbilStatement()` — harus disambiguasi: `ambil <jenis> dari ...` (DOM) vs `ambil dari <url>:` (network) |
| `TK_KOMPONEN` | KomponenDeclaration | `parseKomponenDeclaration()` |
| `TK_GUNAKAN` | GunakanStatement | `parseGunakanStatement()` |
| `TK_FUNGSI` | FungsiDeclaration | `parseFungsiDeclaration()` |
| `TK_JALANKAN` | JalankanExpression | `parseJalankanExpression()` |
| `TK_ARAHKAN` | ArahkanStatement | `parseArahkanStatement()` |
| `TK_MUAT_ULANG` | MuatUlangStatement | `parseMuatUlangStatement()` |
| `TK_KEMBALI` | KembaliStatement | `parseKembaliStatement()` |
| `TK_LANGSUNG` | LangsungBlock | `parseLangsungBlock()` |

### B.1 Disambiguasi Multi-Path

Beberapa keyword memerlukan lookahead untuk menentukan handler yang tepat:

1. **`TK_SAAT`:**
   - `saat <IDENTIFIER> berubah` → `SaatStatement` (watcher)
   - `saat komponen dipasang` → `LifecycleStatement (mount)`
   - `saat komponen diperbarui` → `LifecycleStatement (update)`
   - `saat komponen dilepas` → `LifecycleStatement (unmount)`
   - Disambiguasi: Setelah konsumsi `TK_SAAT`, peek(1) untuk melihat apakah `TK_KOMPONEN` mengikuti.

2. **`TK_AMBIL`:**
   - `ambil nilai/teks/html/tinggi/lebar/atribut dari ...` → `AmbilDomStatement`
   - `ambil dari <url>` → `AmbilLuarStatement`
   - Disambiguasi: Setelah konsumsi `TK_AMBIL`, peek token berikutnya. Jika `TK_DARI` → `AmbilLuarStatement`. Jika identifier literal (`nilai`, `teks`, `html`, `tinggi`, `lebar`, `atribut`) → `AmbilDomStatement`.

3. **`TK_LALU`:**
   - `lalu` di awal baris (setelah indentasi) → bagian dari `RantaiAksi`
   - `lalu` di tengah baris → error (tidak valid sebagai statement mandiri)
   - Disambiguasi: `TK_LALU` selalu merupakan kelanjutan dari statement sebelumnya, bukan statement awal. Handler: `parseRantaiAksi()`.

4. **`TK_KALAU` dan `TK_JIKA_TIDAK`:**
   - Kedua token ini tidak pernah memulai statement baru secara mandiri; mereka selalu merupakan kelanjutan dari `TK_JIKA`.
   - Handler: Ditangani di dalam `parseJikaStatement()`, bukan dispatch statement utama.

5. **`TK_FRAGMEN`:**
   - `fragmen` muncul setelah `TK_BUAT` → bagian dari `BuatStatement` dengan tag `fragmen`
   - Tidak pernah memulai statement mandiri
   - Handler: Ditangani di dalam `parseBuatStatement()`

---

*Akhir dokumen RFC-PARSER-001 v1.1.0*
