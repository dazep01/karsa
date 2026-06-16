# KARSA — AST Specification

**ID Dokumen:** AST-SPEC-001  
**Versi:** 1.0.0  
**Status:** Normatif / Draft  
**Penulis:** Tim Inti KARSA  
**Terakhir Diperbarui:** 2026-06-13  
**Berdasarkan:** KARSA-grammar-spec_v0.3.1, RFC-PARSER-001 v1.1.0  
**Daftar Pustaka:**
- KARSA-grammar-spec_v0.3.1.md
- parser-charter.md
- parser-architecture.md
- RFC-PARSER-001.md

---

## Daftar Isi

1. Prinsip Umum
2. Tipe Bersama (Shared Types)
3. Node Catalog
   - 3.1 Root Node
   - 3.2 Declaration Nodes
   - 3.3 Statement Nodes — Struktur DOM
   - 3.4 Statement Nodes — Perilaku & Event
   - 3.5 Statement Nodes — Logika
   - 3.6 Statement Nodes — Data & Reaktivitas
   - 3.7 Statement Nodes — Komponen
   - 3.8 Statement Nodes — Jaringan & Navigasi
   - 3.9 Statement Nodes — Kontrol Alur
   - 3.10 Statement Nodes — Interop
   - 3.11 Expression Nodes
   - 3.12 UI & Selector Nodes
   - 3.13 Special Nodes
4. Edge Catalog
5. JSON Schema Per Node
6. Contoh AST Lengkap

---

## 1. Prinsip Umum

### 1.1 Filosofi Desain AST

AST KARSA dirancang dengan prinsip-prinsip berikut yang wajib diikuti oleh semua node:

1. **Tree-Only.** AST adalah pohon (tree), bukan graph. Setiap node memiliki tepat satu induk (kecuali root). Tidak ada shared reference atau back-pointer. Jika beberapa node perlu merujuk ke entitas yang sama (misalnya: identifier yang sama digunakan di dua tempat), masing-masing tempat memiliki node `Identifier` sendiri.

2. **Lossless.** AST menyimpan informasi yang cukup untuk merekonstruksi source code secara semantik equivalen (bukan byte-identik). Tidak ada informasi sintaksis yang hilang selama parsing, kecuali komentar biasa (`--!`), whitespace dalam baris, dan baris baru.

3. **Position-Annotated.** Setiap node memiliki `loc: SourceLocation` yang akurat. Ini memungkinkan tooling (IDE, linter, debugger) untuk memetakan setiap node kembali ke source code.

4. **Orthogonal.** Setiap node memiliki satu tanggung jawab. Node tidak menumpuk fungsi yang berbeda. Misalnya, `CallExpression` hanya merepresentasikan pemanggilan fungsi; ia tidak juga menyimpan informasi tentang apakah fungsi tersebut reaktif atau tidak.

5. **Visitor-Friendly.** Struktur node dirancang agar mudah di-traverse oleh visitor. Properti anak konsisten: array bernama `body`, `consequent`, `alternate`, `cases`, dll. Properti skalar (string, number, boolean) jelas terpisah dari properti anak.

6. **Extensible.** Node dirancang agar dapat ditambah properti opsional di masa depan tanpa memecah konsumer yang sudah ada. Properti wajib tidak boleh dihapus atau diubah tipenya kecuali dalam rilis MAJOR.

### 1.2 Konvensi Penamaan

| Kategori | Konvensi | Contoh |
|---|---|---|
| Tipe node | PascalCase + akhiran sesuai kategori | `DataDeclaration`, `BuatStatement`, `BinaryExpression` |
| Properti node | camelCase | `body`, `condition`, `operator`, `left` |
| Nilai enum | snake_case UPPER | `"TK_PLUS"`, `"sama_dengan"` |
| Properti anak (array) | camelCase plural atau `body` | `body`, `properties`, `arguments`, `elements` |
| Properti anak (tunggal) | camelCase deskriptif | `condition`, `callee`, `object` |

**Akhiran berdasarkan kategori:**

| Kategori | Akhiran | Keterangan |
|---|---|---|
| Deklarasi | `Declaration` | Membuat binding baru (variabel, fungsi, komponen) |
| Statement | `Statement` | Perintah imperatif (buat, tampilkan, hapus, dll.) |
| Ekspresi | `Expression` | Menghasilkan nilai (operator, literal, pemanggilan) |
| Literal | `Literal` | Nilai konstan |
| Blok | `Block` / `Statement` | Kontainer statement |

### 1.3 Representasi Node

Setiap node dalam AST direpresentasikan sebagai objek JSON dengan properti berikut:

```typescript
interface ASTNode {
  type: string;           // Nama tipe node, wajib, immutable
  loc: SourceLocation;    // Lokasi dalam source code, wajib
  docstring?: string;     // DocString dari komentar --?, opsional
}
```

**Aturan properti:**
- Properti wajib (required) ditandai dengan tipe tanpa `?` dalam TypeScript interface.
- Properti opsional ditandai dengan `?` dan boleh bernilai `undefined` (tidak ada dalam JSON) atau `null`.
- Properti yang berisi anak node selalu menggunakan tipe `ASTNode[]` atau `ASTNode`, bukan `any`.
- Properti yang berisi nilai primitif menggunakan tipe `string`, `number`, atau `boolean`.

### 1.4 Aturan Null/Empty

- Array anak yang kosong direpresentasikan sebagai `[]`, bukan `null` atau `undefined`.
- Properti opsional yang tidak ada dihilangkan dari JSON (tidak disimpan sebagai `null`).
- Properti string yang wajib tidak boleh berupa string kosong `""` kecuali secara eksplisit diperbolehkan oleh spec node.
- Jika error recovery menghasilkan node yang hilang, gunakan `ErrorNode` sebagai pengganti, bukan `null`.

---

## 2. Tipe Bersama (Shared Types)

Tipe-tipe berikut digunakan oleh banyak node dan didefinisikan sekali di sini untuk menghindari repetisi.

### 2.1 SourceLocation

```typescript
interface SourceLocation {
  start: Position;
  end: Position;
}

interface Position {
  line: number;     // 1-indexed
  column: number;   // 1-indexed
}
```

**Invariant:**
- `start.line ≥ 1`, `start.column ≥ 1`
- `end.line ≥ 1`, `end.column ≥ 1`
- `start ≤ end` (komparasi leksikografis: line dulu, lalu column)

### 2.2 Selector

Selector merepresentasikan target elemen DOM yang dihasilkan dari token `TK_ID`, `TK_CLASS`, `TK_ATRIBUT`, dan tag HTML.

```typescript
interface Selector {
  type: "Selector";
  loc: SourceLocation;
  tag: string;                    // Tag HTML atau identifier (wajib)
  id: string | undefined;         // Nilai setelah # (opsional)
  classes: string[];              // Daftar class CSS (boleh kosong)
  attributes: AttributeNode[];    // Daftar atribut [k="v"] (boleh kosong)
}
```

**Contoh mapping:**
- `div#app.kartu.aktif` → `{ tag: "div", id: "app", classes: ["kartu", "aktif"], attributes: [] }`
- `input#email[tipe="email"][placeholder="contoh@email.com"]` → `{ tag: "input", id: "email", classes: [], attributes: [{key: "tipe", value: "email"}, {key: "placeholder", value: "contoh@email.com"}] }`
- `tombol#btn-masuk[tipe="submit"]` → `{ tag: "tombol", id: "btn-masuk", classes: [], attributes: [{key: "tipe", value: "submit"}] }`

**Catatan:** Alias tag (`tombol` → `<button>`, `pilihan` → `<select>`, dll.) tidak diselesaikan oleh Parser. Resolver/Compiler yang menerjemahkan.

### 2.3 AttributeNode

```typescript
interface AttributeNode {
  type: "AttributeNode";
  loc: SourceLocation;
  key: string;        // Nama atribut, misalnya "tipe", "placeholder"
  value: string;      // Nilai atribut (string), misalnya "email"
}
```

### 2.4 PropertyNode

Properti inline yang muncul pada `BuatStatement` dan `GunakanStatement`.

```typescript
interface PropertyNode {
  type: "PropertyNode";
  loc: SourceLocation;
  key: string;                    // Nama properti, misalnya "teks", "src", "kelas"
  value: ExpressionNode;          // Ekspresi nilai (bisa Literal, Identifier, MemberExpression, BinaryExpression)
  shorthand: boolean;             // true jika shorthand { identifier } tanpa ":"
}
```

**Catatan shorthand:** Pada objek literal `{ nama }`, `shorthand: true` dan `key === value.name`. Pada `{ nama: "Budi" }`, `shorthand: false`.

### 2.5 Parameter

Parameter fungsi dan komponen.

```typescript
interface Parameter {
  type: "Parameter";
  loc: SourceLocation;
  name: string;                     // Nama parameter
  typeHint: string | undefined;     // Type hint, misalnya "angka", "teks" (opsional)
  defaultValue: ExpressionNode | undefined;  // Nilai default (opsional)
}
```

### 2.6 FetchBranch

Cabang pada `AmbilLuarStatement`.

```typescript
interface FetchBranch {
  type: "FetchBranch";
  loc: SourceLocation;
  kind: "berhasil" | "gagal" | "selalu";
  action: BlockStatement | ASTNode;   // Blok aksi atau aksi tunggal
}
```

### 2.7 Enum dan Tipe Konstan

```typescript
// Operator biner yang didukung grammar KARSA
type BinaryOperator =
  | "+"     | "-"     | "*"     | "/"
  | "sama dengan" | "tidak sama dengan"
  | "lebih dari"   | "kurang dari"
  | "paling sedikit" | "paling banyak"
  | "ada di"       | "tidak ada di"
  | "dan"  | "atau";

// Operator unary
type UnaryOperator = "bukan" | "-";

// Jenis data yang dapat diambil dari DOM
type AmbilDomKind = "nilai" | "teks" | "html" | "tinggi" | "lebar" | "atribut";

// Mode tampilkan
type TampilkanMode = "tambahkan" | "ganti" | "awalan" | "sebelum" | "sesudah";

// Lifecycle hook
type LifecycleKind = "dipasang" | "diperbarui" | "dilepas";

// Nama event KARSA
type EventName =
  | "diklik" | "diketik" | "disubmit" | "dimuat"
  | "diubah" | "difokus" | "ditinggal" | "ditekan"
  | "dilepas" | "diarahkan" | "ditinggal-kursor"
  | "digulir" | "dipasang" | "dilepas-dari-dom";

// Tipe data KARSA (type hint)
type TypeHint =
  | "teks" | "angka" | "benar-salah" | "objek"
  | "array" | "elemen" | "fungsi" | "apapun"
  | string;  // IDENTIFIER kustom
```

---

## 3. Node Catalog

Katalog ini mendefinisikan setiap tipe node AST yang dihasilkan oleh Parser KARSA. Setiap entri menyertakan:

- **Type**: Nama tipe node (nilai properti `type`)
- **Kategori**: Declaration / Statement / Expression / UI / Special
- **Grammar Ref**: Referensi ke section grammar v0.3.1
- **Properti**: Daftar lengkap properti dengan tipe dan status (wajib/opsional)
- **Invariant**: Aturan khusus yang berlaku untuk node ini
- **Contoh**: Contoh source code dan AST yang dihasilkan

---

### 3.1 Root Node

#### ProgramNode

Node akar dari setiap AST. Satu-satunya node tanpa induk.

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"Program"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | Mencakup seluruh file |
| `body` | `ASTNode[]` | ✅ | Daftar top-level statement dan deklarasi |
| `source` | `string` | ❌ | Nama file source (opsional, untuk tooling) |

**Invariant:**
- `body` hanya boleh berisi node yang valid di top-level (lihat RFC-PARSER-001 §I-11).
- `body` boleh kosong (`[]`) untuk file tanpa statement.
- `loc.start` selalu `{ line: 1, column: 1 }`.
- `loc.end` selalu merujuk ke akhir file.

**Contoh:**
```ks
data hitungan = 0
buat div#app
```
```json
{
  "type": "Program",
  "loc": { "start": { "line": 1, "column": 1 }, "end": { "line": 2, "column": 13 } },
  "body": [
    { "type": "DataDeclaration", "..." : "..." },
    { "type": "BuatStatement", "..." : "..." }
  ]
}
```

---

### 3.2 Declaration Nodes

#### DataDeclaration

Deklarasi state reaktif (`data`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"DataDeclaration"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | DocString dari `--?` |
| `name` | `string` | ✅ | Nama variabel |
| `typeHint` | `string` | ❌ | Type hint (misalnya `"angka"`, `"teks"`) |
| `init` | `ExpressionNode` | ✅ | Nilai awal (wajib, bisa `Literal` kosong) |

**Grammar Ref:** Section 7.1 — `pernyataan_data`

**Invariant:**
- `name` tidak boleh string kosong.
- `init` wajib ada (grammar KARSA mengharuskan `=` dan nilai).
- `init` boleh berupa `Literal`, `Identifier`, `MemberExpression`, `ObjectLiteral`, `ArrayLiteral`, atau `BinaryExpression`.

**Contoh:**
```ks
data hitungan = 0
data pengguna = { nama: "Budi", aktif: benar }
data keranjang = []
```

---

#### TetapDeclaration

Deklarasi konstanta non-reaktif (`tetap`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"TetapDeclaration"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `name` | `string` | ✅ | Nama konstanta |
| `typeHint` | `string` | ❌ | Type hint |
| `init` | `ExpressionNode` | ✅ | Nilai awal (wajib) |

**Grammar Ref:** Section 7.2 — `pernyataan_tetap`

**Invariant:**
- Identik dengan `DataDeclaration` kecuali `type` berbeda.
- Compiler memetakan ke `const` (bukan reactive wrapper).

---

#### UbahDeclaration

Deklarasi variabel mutable non-reaktif (`ubah`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"UbahDeclaration"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `name` | `string` | ✅ | Nama variabel |
| `typeHint` | `string` | ❌ | Type hint |
| `init` | `ExpressionNode` | ✅ | Nilai awal (wajib) |

**Grammar Ref:** Section 7.2 — `pernyataan_ubah`

**Invariant:**
- Identik dengan `DataDeclaration` kecuali `type` berbeda.
- Compiler memetakan ke `let` (bukan reactive wrapper).

---

#### TurunanDeclaration

Deklarasi computed/derived state (`turunan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"TurunanDeclaration"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `name` | `string` | ✅ | Nama turunan |
| `typeHint` | `string` | ❌ | Type hint |
| `init` | `ExpressionNode` | ✅ | Ekspresi turunan (wajib) |

**Grammar Ref:** Section 7.4 — `pernyataan_turunan`

**Invariant:**
- `init` hanya boleh berisi ekspresi murni tanpa side-effect (Analyzer yang memvalidasi).
- Parser tidak memvalidasi apakah `init` mengandung side-effect; ia hanya mencatat strukturnya.

**Contoh:**
```ks
turunan total = harga * jumlah
```
```json
{
  "type": "TurunanDeclaration",
  "loc": { "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 30 } },
  "name": "total",
  "typeHint": undefined,
  "init": {
    "type": "BinaryExpression",
    "operator": "*",
    "left": { "type": "Identifier", "name": "harga" },
    "right": { "type": "Identifier", "name": "jumlah" }
  }
}
```

---

#### KomponenDeclaration

Deklarasi komponen UI (`komponen`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"KomponenDeclaration"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `name` | `string` | ✅ | Nama komponen (wajib PascalCase) |
| `params` | `Parameter[]` | ✅ | Daftar parameter (boleh `[]`) |
| `returnType` | `string` | ❌ | Tipe kembalian setelah `->` |
| `body` | `BlockStatement` | ✅ | Isi komponen |

**Grammar Ref:** Section 8.1 — `pernyataan_komponen`

**Invariant:**
- `name` wajib diawali huruf kapital (validasi dilakukan oleh Parser, error E2003 jika tidak).
- `params` berisi objek `Parameter` (bukan node AST biasa, tapi memiliki `loc`).
- `body` berisi semua statement dan deklarasi di dalam komponen, termasuk lifecycle hooks.
- Satu komponen default menghasilkan satu root node; multi-root memerlukan `fragmen`. Validasi ini dilakukan oleh Analyzer.

**Contoh:**
```ks
komponen KartuProduk(nama: teks, harga: angka, foto: teks = "/default.jpg"):
  buat div.kartu-produk
    buat h3 -> teks: nama
```

---

#### FungsiDeclaration

Deklarasi fungsi KARSA (`fungsi`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"FungsiDeclaration"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `name` | `string` | ✅ | Nama fungsi |
| `params` | `Parameter[]` | ✅ | Daftar parameter (boleh `[]`) |
| `returnType` | `string` | ❌ | Tipe kembalian setelah `->` |
| `body` | `BlockStatement` | ✅ | Isi fungsi |

**Grammar Ref:** Section 11.3 — `pernyataan_fungsi`

**Invariant:**
- `name` tidak boleh diawali huruf kapital (konvensi, warning jika terjadi).
- `body` wajib berisi minimal satu statement (Analyzer yang memvalidasi).
- `kembalikan` di dalam `body` menghasilkan `KembalikanStatement`.

**Contoh:**
```ks
fungsi hitungTotal(harga: angka, jumlah: angka = 1) -> angka:
  kembalikan harga * jumlah
```

---

### 3.3 Statement Nodes — Struktur DOM

#### BlockStatement

Kontainer statement yang dihasilkan dari indentasi (TK_INDENT/TK_DEDENT) atau kurung.

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"BlockStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `body` | `ASTNode[]` | ✅ | Daftar statement dalam blok |

**Invariant:**
- `body` boleh kosong (`[]`) hanya sebagai hasil error recovery. Blok kosong dalam source code yang valid tidak diperbolehkan oleh grammar.
- Setiap elemen `body` wajib berupa node statement atau `ErrorNode`.

---

#### BuatStatement

Pembuatan elemen DOM (`buat`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"BuatStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `selector` | `Selector` | ✅ | Selektor elemen (tag, id, class, atribut) |
| `properties` | `PropertyNode[]` | ❌ | Properti inline setelah `->` |
| `body` | `BlockStatement` | ❌ | Blok anak (indentasi) |
| `action` | `ASTNode` | ❌ | Aksi tunggal setelah `->` (jika bukan properti) |

**Grammar Ref:** Section 4.2 — `pernyataan_buat`

**Invariant:**
- `selector` wajib ada dan wajib memiliki `tag` yang terisi.
- `properties` dan `action` saling eksklusif dengan `body` dalam beberapa kasus, tetapi `properties` bisa muncul bersama `body` (properti inline + blok anak). Ketiga properti (`properties`, `body`, `action`) boleh semuanya tidak ada (elemen tanpa anak dan tanpa properti).
- Jika `selector.tag === "fragmen"`, node ini merepresentasikan `DocumentFragment`.

**Disambiguasi `->`:**
- `buat h3 -> teks: nama` → `properties: [{ key: "teks", value: Identifier("nama") }]`
- `buat tombol -> teks: "Hapus"` → `properties: [{ key: "teks", value: Literal("Hapus") }]`
- `buat tombol.hapus -> hapusItem(indeks)` → `action: PanggilNativeExpression("hapusItem", [Identifier("indeks")])`

**Contoh:**
```ks
buat div#app.kartu
  buat h3 -> teks: nama
  buat tombol.hapus -> teks: "Hapus"
    ketika diklik -> hapusItem(indeks)
```

---

#### TampilkanStatement

Menampilkan elemen atau pesan (`tampilkan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"TampilkanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `target` | `Selector \| Literal \| Identifier` | ✅ | Target yang ditampilkan |
| `mountTarget` | `Selector \| Literal \| Identifier` | ❌ | Target mount setelah `di` |
| `mode` | `string` | ❌ | Mode tampilkan setelah `dengan mode:` |
| `messageKind` | `string` | ❌ | `"pesan"`, `"pesan-error"`, atau `"notifikasi"` jika target adalah pesan |

**Grammar Ref:** Section 4.4 — `pernyataan_tampilkan`

**Invariant:**
- Jika `messageKind` terisi, `target` berupa `Literal` (teks pesan).
- Jika `messageKind` tidak terisi, `target` berupa `Selector`, `Identifier`, atau `Literal` (nama komponen atau selector).
- `mode` hanya boleh terisi jika `mountTarget` juga terisi (kecuali default append).
- Nilai `mode` yang valid: `"tambahkan"`, `"ganti"`, `"awalan"`, `"sebelum"`, `"sesudah"`.

**Contoh:**
```ks
tampilkan div#kartu di "#kontainer"
tampilkan pesan "Data berhasil disimpan!"
tampilkan KartuProfil di "#app" dengan mode: "ganti"
```

---

#### SembunyikanStatement

Menyembunyikan elemen (`sembunyikan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"SembunyikanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `target` | `Selector \| Literal \| Identifier` | ✅ | Target elemen |

**Grammar Ref:** Section 4.5 — `pernyataan_sembunyikan`

---

#### HapusStatement

Menghapus elemen (`hapus`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"HapusStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `target` | `Selector \| Literal \| Identifier` | ✅ | Target elemen |

**Grammar Ref:** Section 4.5 — `pernyataan_hapus`

---

#### KosongkanStatement

Mengosongkan isi elemen (`kosongkan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"KosongkanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `target` | `Selector \| Literal \| Identifier` | ✅ | Target elemen |

**Grammar Ref:** Section 4.5 — `pernyataan_kosongkan`

---

#### PerbaruiStatement

Memperbarui properti elemen (`perbarui`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"PerbaruiStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `property` | `string` | ✅ | Nama properti yang diperbarui (`"teks"`, `"html"`, `"nilai"`, `"kelas"`, dll.) |
| `target` | `Selector \| Literal \| Identifier` | ✅ | Target elemen |
| `value` | `ExpressionNode` | ✅ | Nilai baru setelah `->` |

**Grammar Ref:** Section 4.6 — `pernyataan_perbarui`

**Invariant:**
- `property` wajib terisi dan merupakan nama properti yang valid (`"teks"`, `"html"`, `"nilai"`, `"gaya"`, `"kelas"`, `"src"`, `"href"`, `"alt"`, `"tipe"`, `"nama"`, `"placeholder"`, `"id"`, `"title"`, atau `data-*`).
- `value` adalah ekspresi yang menghasilkan nilai baru.

**Contoh:**
```ks
perbarui teks "#angka" -> hitungan
perbarui kelas div#kotak -> "aktif"
```

---

### 3.4 Statement Nodes — Perilaku & Event

#### KetikaStatement

Event listener (`ketika`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"KetikaStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `target` | `Selector \| Literal \| Identifier` | ❌ | Target event (null = self-reference) |
| `event` | `string` | ✅ | Nama event, misalnya `"diklik"`, `"diketik"` |
| `body` | `BlockStatement` | ❌ | Blok aksi (indentasi) |
| `action` | `ASTNode` | ❌ | Aksi tunggal setelah `->` |

**Grammar Ref:** Section 5.1 — `pernyataan_ketika`

**Invariant:**
- Tepat satu dari `body` atau `action` wajib ada (tidak boleh keduanya sekaligus, tidak boleh keduanya kosong).
- Jika `target` tidak ada (self-reference), Resolver bertugas memvalidasi bahwa node ini berada dalam konteks `BuatStatement` atau `KomponenDeclaration`.
- `event` wajib berupa salah satu nama event yang didefinisikan dalam grammar (lihat `EventName`).

**Contoh:**
```ks
ketika tombol#tambah diklik:
  tambahkan 1 ke hitungan

ketika diklik -> tambahkan 1 ke hitungan
```

---

#### SaatStatement

Watcher reaktif (`saat <nama> berubah`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"SaatStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `target` | `string` | ✅ | Nama variabel yang di-watch |
| `body` | `BlockStatement` | ✅ | Blok aksi yang dijalankan saat berubah |

**Grammar Ref:** Section 7.6 — `pernyataan_saat`

**Invariant:**
- `target` adalah nama identifier yang di-watch (string, bukan node `Identifier`).
- `body` wajib berisi minimal satu statement.

**Contoh:**
```ks
saat hitungan berubah:
  perbarui teks p#angka -> hitungan
```

---

#### LifecycleStatement

Hook lifecycle komponen (`saat komponen dipasang/diperbarui/dilepas`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"LifecycleStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `kind` | `LifecycleKind` | ✅ | `"dipasang"`, `"diperbarui"`, atau `"dilepas"` |
| `body` | `BlockStatement` | ✅ | Blok aksi lifecycle |

**Grammar Ref:** Section 5.4 / 8.5 — lifecycle komponen

**Invariant:**
- `kind` wajib salah satu dari `"dipasang"`, `"diperbarui"`, `"dilepas"`.
- Lifecycle statement hanya valid di dalam `KomponenDeclaration`. Validasi dilakukan oleh Analyzer.
- Parser tidak memvalidasi konteks; ia hanya mencatat strukturnya.

---

#### SetelahStatement

Aksi setelah operasi async selesai (`setelah <nama> selesai`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"SetelahStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `target` | `string` | ✅ | Nama operasi async |
| `body` | `BlockStatement` | ❌ | Blok aksi |
| `action` | `ASTNode` | ❌ | Aksi tunggal setelah `->` |

**Grammar Ref:** Section 5.3 — `pernyataan_setelah`

**Invariant:**
- Tepat satu dari `body` atau `action` wajib ada.

---

#### RantaiAksi

Rantai aksi dengan `lalu`.

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"RantaiAksi"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `first` | `ASTNode` | ✅ | Aksi pertama |
| `chain` | `ASTNode[]` | ✅ | Aksi-aksi berikutnya setelah `lalu` |

**Grammar Ref:** Section 5.2 — `rantai_aksi`

**Invariant:**
- `chain` wajib berisi minimal satu elemen (satu `lalu`).
- Setiap elemen `chain` adalah statement atau expression yang valid sebagai aksi.

**Contoh:**
```ks
kosongkan input#pesan
  lalu tampilkan notifikasi "Terkirim!"
  lalu sembunyikan div#loading
```
```json
{
  "type": "RantaiAksi",
  "first": { "type": "KosongkanStatement", "target": { "type": "Selector", "tag": "input", "id": "pesan" } },
  "chain": [
    { "type": "TampilkanStatement", "messageKind": "notifikasi", "target": { "type": "Literal", "value": "Terkirim!", "kind": "teks" } },
    { "type": "SembunyikanStatement", "target": { "type": "Selector", "tag": "div", "id": "loading" } }
  ]
}
```

---

### 3.5 Statement Nodes — Logika

#### JikaStatement

Percabangan kondisional (`jika` / `kalau` / `jika tidak`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"JikaStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `condition` | `ExpressionNode` | ✅ | Kondisi utama |
| `consequent` | `BlockStatement` | ✅ | Blok jika kondisi benar |
| `alternate` | `BlockStatement \| JikaStatement` | ❌ | Blok `jika tidak` atau `kalau` berantai |

**Grammar Ref:** Section 6.1 — `pernyataan_jika`

**Invariant:**
- `condition` wajib berupa ekspresi yang dapat dievaluasi sebagai boolean.
- `alternate` dapat berupa `BlockStatement` (untuk `jika tidak`) atau `JikaStatement` (untuk `kalau` yang merupakan else-if chain).
- Rantai `jika ... kalau ... kalau ... jika tidak` direpresentasikan sebagai nested `JikaStatement` di `alternate`.

**Contoh:**
```ks
jika hitungan lebih dari 99:
  tampilkan "#peringatan"
kalau hitungan kurang dari 0:
  sembunyikan "#peringatan"
jika tidak:
  perbarui teks "#angka" -> hitungan
```
Direpresentasikan sebagai:
```
JikaStatement
├── condition: BinaryExpression("lebih dari", Identifier("hitungan"), Literal(99))
├── consequent: [TampilkanStatement(...)]
└── alternate: JikaStatement
    ├── condition: BinaryExpression("kurang dari", Identifier("hitungan"), Literal(0))
    ├── consequent: [SembunyikanStatement(...)]
    └── alternate: BlockStatement [PerbaruiStatement(...)]
```

---

#### UlangiStatement

Perulangan iteratif (`ulangi`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"UlangiStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `iteratorName` | `string` | ✅ | Nama variabel iterasi |
| `source` | `ExpressionNode \| Literal` | ✅ | Sumber data yang diiterasi |
| `body` | `BlockStatement` | ✅ | Blok perulangan |
| `kind` | `string` | ✅ | `"dari"` (iterate collection), `"kali"` (counted), `"rentang"` (range) |

**Grammar Ref:** Section 6.3 — `pernyataan_ulangi`

**Variant berdasarkan `kind`:**

| `kind` | Source Code | `source` | `iteratorName` |
|---|---|---|---|
| `"dari"` | `ulangi item dari daftar:` | `Identifier("daftar")` | `"item"` |
| `"kali"` | `ulangi 5 kali:` | `Literal(5)` | `""` (tidak ada) |
| `"rentang"` | `ulangi i dari 1 sampai 10:` | `Literal(1)` + `rangeEnd: Literal(10)` | `"i"` |

**Properti tambahan untuk `kind === "rentang"`:**

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `rangeEnd` | `ExpressionNode` | ✅* | Batas akhir rentang (*hanya jika kind === "rentang"*) |

**Invariant:**
- `iteratorName` wajib terisi kecuali `kind === "kali"`.
- Compiler menyediakan `.indeks` dan `.nilai` sebagai properti virtual dalam konteks iterasi.

---

#### SelamaStatement

Perulangan kondisional (`selama`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"SelamaStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `condition` | `ExpressionNode` | ✅ | Kondisi perulangan |
| `body` | `BlockStatement` | ✅ | Blok perulangan |

**Grammar Ref:** Section 6.4 — `pernyataan_selama`

---

### 3.6 Statement Nodes — Data & Reaktivitas

#### SimpanStatement

Assignment nilai (`simpan ... ke ...` atau `identifier = nilai`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"SimpanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `value` | `ExpressionNode` | ✅ | Nilai yang disimpan |
| `target` | `string` | ✅ | Nama variabel target |
| `kind` | `string` | ✅ | `"simpan_ke"` atau `"assign_sama"` |

**Grammar Ref:** Section 7.5 — `pernyataan_simpan`

**Variant:**
- `simpan 99 ke hitungan` → `kind: "simpan_ke"`, `value: Literal(99)`, `target: "hitungan"`
- `hitungan = 99` → `kind: "assign_sama"`, `value: Literal(99)`, `target: "hitungan"`

---

#### TambahkanStatement

Operasi penambahan (`tambahkan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"TambahkanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `value` | `ExpressionNode` | ✅ | Nilai yang ditambahkan |
| `target` | `string` | ✅ | Nama variabel target |

**Grammar Ref:** Section 7.5 — `pernyataan_tambahkan`

---

#### KurangiStatement

Operasi pengurangan (`kurangi`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"KurangiStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `target` | `string` | ✅ | Nama variabel target |
| `value` | `ExpressionNode` | ❌ | Nilai yang dikurangkan (opsional: `kurangi hitungan` tanpa nilai = kurangi 1) |

**Grammar Ref:** Section 7.5 — `pernyataan_kurangi`

---

#### SisipkanStatement

Operasi penyisipan ke array (`sisipkan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"SisipkanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `value` | `ExpressionNode` | ✅ | Nilai yang disisipkan |
| `target` | `string` | ✅ | Nama variabel array target |

**Grammar Ref:** Section 7.5 — `pernyataan_sisipkan`

---

#### AmbilDomStatement

Pengambilan nilai dari DOM (`ambil <jenis> dari <sumber> -> simpan ke <target>`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"AmbilDomStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `kind` | `AmbilDomKind` | ✅ | Jenis data yang diambil |
| `source` | `Selector \| Literal \| Identifier` | ✅ | Sumber elemen DOM |
| `attributeName` | `string` | ❌ | Nama atribut jika `kind === "atribut"` |
| `target` | `string` | ✅ | Nama variabel penyimpanan |

**Grammar Ref:** Section 7.7 — `pernyataan_ambil_dom`

**Invariant:**
- Jika `kind === "atribut"`, `attributeName` wajib terisi.
- Jika `kind !== "atribut"`, `attributeName` tidak boleh terisi.

---

#### AmbilLuarStatement

Pengambilan data dari jaringan (`ambil dari <url>`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"AmbilLuarStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `url` | `Literal` | ✅ | URL endpoint |
| `options` | `FetchOption[]` | ❌ | Opsi fetch (metode, data, kepala, kredensial, mode) |
| `branches` | `FetchBranch[]` | ✅ | Cabang berhasil/gagal/selalu |

**Grammar Ref:** Section 9.1 — `pernyataan_ambil_luar`

**FetchOption:**

```typescript
interface FetchOption {
  type: "FetchOption";
  key: string;              // "metode", "data", "kepala", "kredensial", "mode"
  value: ExpressionNode;    // Nilai opsi
  loc: SourceLocation;
}
```

**Invariant:**
- `branches` wajib berisi minimal satu cabang (`berhasil`, `gagal`, atau `selalu`).
- `url` wajib berupa `Literal` dengan `kind: "teks"`.

---

### 3.7 Statement Nodes — Komponen

#### GunakanStatement

Penggunaan komponen (`gunakan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"GunakanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `componentName` | `string` | ✅ | Nama komponen (PascalCase) |
| `props` | `PropertyNode[]` | ❌ | Daftar props setelah `dengan` |
| `mountTarget` | `Selector \| Literal \| Identifier` | ❌ | Target mount setelah `di` |

**Grammar Ref:** Section 8.3 — `pernyataan_gunakan`

**Contoh:**
```ks
gunakan KartuProduk
  dengan nama: "Sepatu", harga: 150000, foto: "sepatu.jpg"
  di "#daftar-produk"
```

---

### 3.8 Statement Nodes — Jaringan & Navigasi

#### ArahkanStatement

Navigasi halaman (`arahkan ke`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"ArahkanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `url` | `Literal` | ✅ | URL tujuan |

**Grammar Ref:** Section 9.3 — `pernyataan_arahkan`

---

#### MuatUlangStatement

Muat ulang halaman (`muat ulang`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"MuatUlangStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |

**Grammar Ref:** Section 9.3 — `pernyataan_muat_ulang`

---

#### KembaliStatement

Kembali ke halaman sebelumnya (`kembali`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"KembaliStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |

**Grammar Ref:** Section 9.3 — `pernyataan_kembali`

---

### 3.9 Statement Nodes — Kontrol Alur

#### BerhentiStatement

Pemberhentian eksekusi (`berhenti`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"BerhentiStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |

**Grammar Ref:** Section 6.5 — `pernyataan_berhenti`

**Catatan Semantik:**
- Di dalam loop → `break` (ditentukan Analyzer)
- Di dalam event handler → `return` (ditentukan Analyzer)
- Di dalam fungsi (bukan handler) → error E6001 (ditentukan Analyzer)

---

#### LewatiStatement

Lompat ke iterasi berikutnya (`lewati`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"LewatiStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |

**Grammar Ref:** Section 6.5 — `pernyataan_lewati`

---

#### KembalikanStatement

Pengembalian nilai dari fungsi (`kembalikan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"KembalikanStatement"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `value` | `ExpressionNode` | ❌ | Nilai yang dikembalikan (opsional) |

**Grammar Ref:** Section 6.5 — `pernyataan_kembalikan`

**Invariant:**
- `kembalikan` tanpa nilai → `value: undefined` (Compiler menghasilkan `return;`).
- `kembalikan harga * jumlah` → `value: BinaryExpression("*", Identifier("harga"), Identifier("jumlah"))`.

---

### 3.10 Statement Nodes — Interop

#### LangsungBlock

Blok JavaScript mentah (`langsung:`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"LangsungBlock"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `content` | `string` | ✅ | Kode JS mentah (dari TK_BLOK_LANGSUNG) |

**Grammar Ref:** Section 11.1 — `blok_langsung`

**Invariant:**
- `content` berisi kode JS mentah yang TIDAK di-parse oleh Parser.
- Compiler wajib menyisipkan `content` verbatim ke output.
- Parser tidak memvalidasi sintaksis `content`.

---

#### JalankanExpression

Pemanggilan fungsi JS eksternal (`jalankan`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"JalankanExpression"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `callee` | `string` | ✅ | Nama fungsi JS yang dipanggil |
| `arguments` | `ExpressionNode[]` | ❌ | Argumen dalam kurung `()` |
| `withArgs` | `ExpressionNode[]` | ❌ | Argumen setelah `dengan` |
| `kind` | `string` | ✅ | `"parens"` atau `"dengan"` atau `"no_args"` |

**Grammar Ref:** Section 11.2 — `pemanggilan_fungsi`

**Variant:**
- `jalankan console.log("debug")` → `callee: "console.log"`, `arguments: [Literal("debug")]`, `kind: "parens"`
- `jalankan analytics.track("klik-beli")` → `callee: "analytics.track"`, `arguments: [Literal("klik-beli")]`, `kind: "parens"`
- `jalankan myLibrary.init dengan config` → `callee: "myLibrary.init"`, `withArgs: [Identifier("config")]`, `kind: "dengan"`
- `jalankan alert` → `callee: "alert"`, `kind: "no_args"`

**Catatan:** `callee` adalah string mentah yang mungkin mengandung titik (akses properti JS). Parser tidak mem-parsing-nya sebagai `MemberExpression`; ia menyimpannya sebagai string tunggal. Compiler bertugas menanganinya.

---

### 3.11 Expression Nodes

#### Literal

Nilai konstan (teks, angka, boolean, kosong).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"Literal"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `value` | `string \| number \| boolean \| null` | ✅ | Nilai literal |
| `kind` | `string` | ✅ | `"teks"`, `"angka"`, `"boolean"`, `"kosong"` |

**Mapping:**
| KARSA | `kind` | `value` |
|---|---|---|
| `"Halo"` | `"teks"` | `"Halo"` (string) |
| `42` | `"angka"` | `42` (number) |
| `3.14` | `"angka"` | `3.14` (number) |
| `-7` | `"angka"` | `-7` (number, Lexer sudah menangani tanda negatif) |
| `benar` | `"boolean"` | `true` |
| `salah` | `"boolean"` | `false` |
| `kosong` | `"kosong"` | `null` |

**Invariant:**
- `kind` dan `value` harus konsisten: jika `kind === "teks"`, `value` wajib berupa `string`; jika `kind === "angka"`, `value` wajib berupa `number`; jika `kind === "boolean"`, `value` wajib berupa `boolean`; jika `kind === "kosong"`, `value` wajib berupa `null`.

---

#### Identifier

Referensi ke nama variabel, fungsi, atau komponen.

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"Identifier"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `name` | `string` | ✅ | Nama identifier |

**Invariant:**
- `name` tidak boleh string kosong.
- `name` tidak boleh sama dengan keyword KARSA (Lexer sudah menjamin ini).
- Identifier belum ditentukan apakah merujuk ke variabel, fungsi, komponen, atau properti — Resolver yang memvalidasi.

---

#### BinaryExpression

Ekspresi biner (operator dengan operand kiri dan kanan).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"BinaryExpression"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `operator` | `BinaryOperator` | ✅ | Operator biner |
| `left` | `ExpressionNode` | ✅ | Operand kiri |
| `right` | `ExpressionNode` | ✅ | Operand kanan |

**Daftar operator:**

| Kategori | Operator | Keterangan |
|---|---|---|
| Aritmatika | `+`, `-`, `*`, `/` | Termasuk konkatenasi string dengan `+` |
| Perbandingan | `sama dengan`, `tidak sama dengan`, `lebih dari`, `kurang dari`, `paling sedikit`, `paling banyak` | Perbandingan biner |
| Keanggotaan | `ada di`, `tidak ada di` | Membership check |
| Logika | `dan`, `atau` | Konjungsi dan disjungsi |

**Invariant:**
- `left` dan `right` wajib berupa expression node.
- Operator `dan` dan `atau` juga menggunakan `BinaryExpression` (bukan node khusus), karena Pratt parser memperlakukannya sebagai infix operator dengan binding power yang berbeda.

---

#### UnaryExpression

Ekspresi unary (operator dengan satu operand).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"UnaryExpression"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `operator` | `UnaryOperator` | ✅ | `"bukan"` atau `"-"` |
| `operand` | `ExpressionNode` | ✅ | Operand |
| `prefix` | `boolean` | ✅ | Selalu `true` (KARSA hanya memiliki prefix unary) |

**Invariant:**
- `operator` wajib `"bukan"` atau `"-"`.
- `prefix` selalu `true` (KARSA tidak memiliki postfix operator seperti `x++`).
- `"bukan"` menghasilkan negasi logika (Compiler → `!operand`).
- `"-"` menghasilkan negasi numerik (Compiler → `-operand`).

---

#### MemberExpression

Akses properti berantai (`a.b.c`).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"MemberExpression"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `object` | `ExpressionNode` | ✅ | Objek yang diakses |
| `property` | `Identifier` | ✅ | Nama properti |

**Invariant:**
- `object` boleh berupa `Identifier`, `MemberExpression` (chaining), atau `CallExpression` (`f().result`).
- `property` selalu berupa `Identifier` dengan `name` yang merepresentasikan nama properti.
- Alias properti Indonesia (misal: `.panjang`) disimpan sebagai `property.name === "panjang"`. Resolver/Compiler yang menerjemahkan.

**Contoh:**
```ks
pengguna.nama
```
```json
{
  "type": "MemberExpression",
  "object": { "type": "Identifier", "name": "pengguna" },
  "property": { "type": "Identifier", "name": "nama" }
}
```

```ks
a.b.c.d
```
```json
{
  "type": "MemberExpression",
  "object": {
    "type": "MemberExpression",
    "object": {
      "type": "MemberExpression",
      "object": { "type": "Identifier", "name": "a" },
      "property": { "type": "Identifier", "name": "b" }
    },
    "property": { "type": "Identifier", "name": "c" }
  },
  "property": { "type": "Identifier", "name": "d" }
}
```

---

#### CallExpression

Pemanggilan fungsi dengan notasi `f(arg1, arg2)`.

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"CallExpression"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `callee` | `ExpressionNode` | ✅ | Fungsi yang dipanggil |
| `arguments` | `ExpressionNode[]` | ✅ | Daftar argumen (boleh `[]`) |

**Invariant:**
- `callee` boleh berupa `Identifier`, `MemberExpression`, atau `CallExpression` (higher-order).
- `arguments` berisi node ekspresi, boleh kosong.
- `CallExpression` digunakan untuk **kedua** jenis pemanggilan fungsi KARSA:
  - Pemanggilan fungsi Karsa: `hitungTotal(harga, jumlah)` → `CallExpression(Identifier("hitungTotal"), [Identifier("harga"), Identifier("jumlah")])`
  - Method call: `obj.method(x)` → `CallExpression(MemberExpression(Identifier("obj"), Identifier("method")), [Identifier("x")])`
- **Perbedaan dengan `JalankanExpression`:** `jalankan f` menghasilkan `JalankanExpression`, BUKAN `CallExpression`. Pemanggilan dengan notasi `f(x)` menghasilkan `CallExpression`.

**Contoh:**
```ks
hitungTotal(harga, jumlah)
```
```json
{
  "type": "CallExpression",
  "callee": { "type": "Identifier", "name": "hitungTotal" },
  "arguments": [
    { "type": "Identifier", "name": "harga" },
    { "type": "Identifier", "name": "jumlah" }
  ]
}
```

---

#### ObjectLiteral

Objek literal `{ kunci: nilai }` dan shorthand `{ identifier }`.

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"ObjectLiteral"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `properties` | `PropertyNode[]` | ✅ | Daftar properti (boleh `[]`) |

**Grammar Ref:** Section 4.0.7 — `objek_literal`

**Invariant:**
- Setiap `PropertyNode` dalam `properties` merepresentasikan satu entri objek.
- Properti dengan `shorthand: true` berarti `key === value.name` (ES6 shorthand).
- Kunci boleh berupa `Identifier` (nama properti) atau `Literal` teks (untuk kunci dengan karakter khusus, misalnya `"api-url"`).

**Contoh:**
```ks
{ nama: "Budi", skor: 0, aktif: benar }
```
```json
{
  "type": "ObjectLiteral",
  "properties": [
    { "type": "PropertyNode", "key": "nama", "value": { "type": "Literal", "value": "Budi", "kind": "teks" }, "shorthand": false },
    { "type": "PropertyNode", "key": "skor", "value": { "type": "Literal", "value": 0, "kind": "angka" }, "shorthand": false },
    { "type": "PropertyNode", "key": "aktif", "value": { "type": "Literal", "value": true, "kind": "boolean" }, "shorthand": false }
  ]
}
```

---

#### ArrayLiteral

Array literal `[ nilai, ... ]`.

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"ArrayLiteral"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `elements` | `ExpressionNode[]` | ✅ | Daftar elemen (boleh `[]`) |

**Grammar Ref:** Section 4.0.8 — `array_literal`

**Invariant:**
- `elements` boleh kosong (`[]`) untuk array kosong.
- Setiap elemen boleh berupa `Literal`, `Identifier`, `MemberExpression`, `ObjectLiteral`, `ArrayLiteral`, atau `BinaryExpression`.

**Contoh:**
```ks
["Beranda", "Tentang", "Kontak"]
```
```json
{
  "type": "ArrayLiteral",
  "elements": [
    { "type": "Literal", "value": "Beranda", "kind": "teks" },
    { "type": "Literal", "value": "Tentang", "kind": "teks" },
    { "type": "Literal", "value": "Kontak", "kind": "teks" }
  ]
}
```

---

#### PanggilNativeExpression

Pemanggilan fungsi KARSA native sebagai statement (`f(x)` yang berdiri sendiri).

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"PanggilNativeExpression"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | |
| `docstring` | `string` | ❌ | |
| `callee` | `Identifier` | ✅ | Nama fungsi Karsa |
| `arguments` | `ExpressionNode[]` | ✅ | Daftar argumen (boleh `[]`) |

**Catatan:** Node ini secara struktural identik dengan `CallExpression`, tetapi dibedakan tipenya karena muncul sebagai statement mandiri (bukan sub-ekspresi). Parser menggunakan `PanggilNativeExpression` ketika `f(x)` muncul di posisi statement; menggunakan `CallExpression` ketika `f(x)` muncul sebagai sub-ekspresi (misalnya: `simpan f(x) ke hasil`).

---

### 3.12 UI & Selector Nodes

#### Selector

(Sudah didefinisikan di §2.2)

#### PropertyNode

(Sudah didefinisikan di §2.4)

#### AttributeNode

(Sudah didefinisikan di §2.3)

---

### 3.13 Special Nodes

#### ErrorNode

Node pengganti yang dihasilkan oleh error recovery.

| Properti | Tipe | Wajib | Keterangan |
|---|---|:---:|---|
| `type` | `"ErrorNode"` | ✅ | |
| `loc` | `SourceLocation` | ✅ | Lokasi error |
| `code` | `string` | ✅ | Kode error (misalnya `"E2001"`) |
| `message` | `string` | ✅ | Pesan error |
| `originalToken` | `object` | ❌ | Representasi token yang menyebabkan error |

**Invariant:**
- `ErrorNode` boleh muncul di posisi manapun di mana node lain diharapkan.
- Visitor wajib mengimplementasikan `visitErrorNode` dan tidak boleh mengabaikannya.
- `loc` wajib terisi, bahkan jika lokasi tidak pasti (gunakan lokasi terbaik yang tersedia).

---

## 4. Edge Catalog

Katalog ini mendefinisikan semua edge (relasi induk→anak) yang valid dalam AST KARSA. Setiap edge memiliki nama properti dan kardinalitas.

### 4.1 Notasi

- `1` : tepat satu anak (wajib)
- `0..1` : nol atau satu anak (opsional tunggal)
- `0..*` : nol atau lebih anak (opsional array)
- `1..*` : satu atau lebih anak (wajib array, minimal 1 elemen)

### 4.2 Tabel Edge Lengkap

| Induk | Properti | Tipe Anak | Kardinalitas | Keterangan |
|---|---|---|:---:|---|
| **Program** | `body` | Statement \| Declaration | `0..*` | Top-level statements |
| **BlockStatement** | `body` | Statement \| Declaration | `0..*` | Isi blok |
| **BuatStatement** | `selector` | Selector | `1` | Target elemen |
| | `properties` | PropertyNode | `0..*` | Properti inline |
| | `body` | BlockStatement | `0..1` | Blok anak |
| | `action` | Statement \| Expression | `0..1` | Aksi tunggal |
| **TampilkanStatement** | `target` | Selector \| Literal \| Identifier | `1` | Target tampilkan |
| | `mountTarget` | Selector \| Literal \| Identifier | `0..1` | Target mount |
| **SembunyikanStatement** | `target` | Selector \| Literal \| Identifier | `1` | |
| **HapusStatement** | `target` | Selector \| Literal \| Identifier | `1` | |
| **KosongkanStatement** | `target` | Selector \| Literal \| Identifier | `1` | |
| **PerbaruiStatement** | `target` | Selector \| Literal \| Identifier | `1` | |
| | `value` | ExpressionNode | `1` | Nilai baru |
| **KetikaStatement** | `target` | Selector \| Literal \| Identifier | `0..1` | Null = self-reference |
| | `body` | BlockStatement | `0..1` | |
| | `action` | Statement \| Expression | `0..1` | |
| **SaatStatement** | `body` | BlockStatement | `1` | |
| **LifecycleStatement** | `body` | BlockStatement | `1` | |
| **SetelahStatement** | `body` | BlockStatement | `0..1` | |
| | `action` | Statement \| Expression | `0..1` | |
| **JikaStatement** | `condition` | ExpressionNode | `1` | |
| | `consequent` | BlockStatement | `1` | |
| | `alternate` | BlockStatement \| JikaStatement | `0..1` | |
| **UlangiStatement** | `source` | ExpressionNode \| Literal | `1` | Sumber data |
| | `body` | BlockStatement | `1` | |
| **SelamaStatement** | `condition` | ExpressionNode | `1` | |
| | `body` | BlockStatement | `1` | |
| **KembalikanStatement** | `value` | ExpressionNode | `0..1` | |
| **SimpanStatement** | `value` | ExpressionNode | `1` | |
| **TambahkanStatement** | `value` | ExpressionNode | `1` | |
| **KurangiStatement** | `value` | ExpressionNode | `0..1` | |
| **SisipkanStatement** | `value` | ExpressionNode | `1` | |
| **AmbilDomStatement** | `source` | Selector \| Literal \| Identifier | `1` | |
| **AmbilLuarStatement** | `url` | Literal | `1` | |
| | `options` | FetchOption | `0..*` | |
| | `branches` | FetchBranch | `1..*` | |
| **KomponenDeclaration** | `params` | Parameter | `0..*` | |
| | `body` | BlockStatement | `1` | |
| **FungsiDeclaration** | `params` | Parameter | `0..*` | |
| | `body` | BlockStatement | `1` | |
| **GunakanStatement** | `props` | PropertyNode | `0..*` | |
| | `mountTarget` | Selector \| Literal \| Identifier | `0..1` | |
| **JalankanExpression** | `arguments` | ExpressionNode | `0..*` | |
| | `withArgs` | ExpressionNode | `0..*` | |
| **RantaiAksi** | `first` | Statement \| Expression | `1` | |
| | `chain` | Statement \| Expression | `1..*` | |
| **BinaryExpression** | `left` | ExpressionNode | `1` | |
| | `right` | ExpressionNode | `1` | |
| **UnaryExpression** | `operand` | ExpressionNode | `1` | |
| **MemberExpression** | `object` | ExpressionNode | `1` | |
| | `property` | Identifier | `1` | |
| **CallExpression** | `callee` | ExpressionNode | `1` | |
| | `arguments` | ExpressionNode | `0..*` | |
| **PanggilNativeExpression** | `callee` | Identifier | `1` | |
| | `arguments` | ExpressionNode | `0..*` | |
| **ObjectLiteral** | `properties` | PropertyNode | `0..*` | |
| **ArrayLiteral** | `elements` | ExpressionNode | `0..*` | |
| **Selector** | `attributes` | AttributeNode | `0..*` | |
| **PropertyNode** | `value` | ExpressionNode | `1` | |
| **Parameter** | `defaultValue` | ExpressionNode | `0..1` | |
| **FetchBranch** | `action` | BlockStatement \| ASTNode | `1` | |
| **FetchOption** | `value` | ExpressionNode | `1` | |

---

## 5. JSON Schema Per Node

Bagian ini menyediakan JSON Schema untuk validasi AST. Setiap schema mendefinisikan struktur node secara formal dan dapat digunakan oleh tooling untuk memvalidasi output parser.

### 5.1 Schema Umum

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://karsa.dev/schemas/ast-v1",
  "title": "KARSA AST Node",
  "type": "object",
  "required": ["type", "loc"],
  "properties": {
    "type": {
      "type": "string",
      "enum": [
        "Program", "BlockStatement",
        "DataDeclaration", "TetapDeclaration", "UbahDeclaration", "TurunanDeclaration",
        "KomponenDeclaration", "FungsiDeclaration",
        "BuatStatement", "TampilkanStatement", "SembunyikanStatement",
        "HapusStatement", "KosongkanStatement", "PerbaruiStatement",
        "KetikaStatement", "SaatStatement", "LifecycleStatement", "SetelahStatement",
        "JikaStatement", "UlangiStatement", "SelamaStatement",
        "BerhentiStatement", "LewatiStatement", "KembalikanStatement",
        "SimpanStatement", "TambahkanStatement", "KurangiStatement", "SisipkanStatement",
        "AmbilDomStatement", "AmbilLuarStatement",
        "GunakanStatement", "ArahkanStatement", "MuatUlangStatement", "KembaliStatement",
        "LangsungBlock", "JalankanExpression", "PanggilNativeExpression",
        "RantaiAksi",
        "Literal", "Identifier", "BinaryExpression", "UnaryExpression",
        "MemberExpression", "CallExpression", "ObjectLiteral", "ArrayLiteral",
        "Selector", "PropertyNode", "AttributeNode", "Parameter",
        "FetchBranch", "FetchOption",
        "ErrorNode"
      ]
    },
    "loc": {
      "$ref": "#/$defs/SourceLocation"
    },
    "docstring": {
      "type": "string"
    }
  },
  "$defs": {
    "SourceLocation": {
      "type": "object",
      "required": ["start", "end"],
      "properties": {
        "start": { "$ref": "#/$defs/Position" },
        "end": { "$ref": "#/$defs/Position" }
      }
    },
    "Position": {
      "type": "object",
      "required": ["line", "column"],
      "properties": {
        "line": { "type": "integer", "minimum": 1 },
        "column": { "type": "integer", "minimum": 1 }
      }
    },
    "ExpressionNode": {
      "oneOf": [
        { "$ref": "#/$defs/Literal" },
        { "$ref": "#/$defs/Identifier" },
        { "$ref": "#/$defs/BinaryExpression" },
        { "$ref": "#/$defs/UnaryExpression" },
        { "$ref": "#/$defs/MemberExpression" },
        { "$ref": "#/$defs/CallExpression" },
        { "$ref": "#/$defs/ObjectLiteral" },
        { "$ref": "#/$defs/ArrayLiteral" }
      ]
    }
  }
}
```

### 5.2 Schema Per Node

#### Program

```json
{
  "$ref": "#/$defs/Program",
  "$defs": {
    "Program": {
      "type": "object",
      "required": ["type", "loc", "body"],
      "properties": {
        "type": { "const": "Program" },
        "loc": { "$ref": "#/$defs/SourceLocation" },
        "body": {
          "type": "array",
          "items": { "$ref": "#/$defs/StatementOrDeclaration" }
        },
        "source": { "type": "string" }
      },
      "additionalProperties": false
    }
  }
}
```

#### DataDeclaration

```json
{
  "type": "object",
  "required": ["type", "loc", "name", "init"],
  "properties": {
    "type": { "const": "DataDeclaration" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "name": { "type": "string", "minLength": 1 },
    "typeHint": { "type": "string" },
    "init": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### TetapDeclaration

```json
{
  "type": "object",
  "required": ["type", "loc", "name", "init"],
  "properties": {
    "type": { "const": "TetapDeclaration" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "name": { "type": "string", "minLength": 1 },
    "typeHint": { "type": "string" },
    "init": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### UbahDeclaration

```json
{
  "type": "object",
  "required": ["type", "loc", "name", "init"],
  "properties": {
    "type": { "const": "UbahDeclaration" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "name": { "type": "string", "minLength": 1 },
    "typeHint": { "type": "string" },
    "init": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### TurunanDeclaration

```json
{
  "type": "object",
  "required": ["type", "loc", "name", "init"],
  "properties": {
    "type": { "const": "TurunanDeclaration" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "name": { "type": "string", "minLength": 1 },
    "typeHint": { "type": "string" },
    "init": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### KomponenDeclaration

```json
{
  "type": "object",
  "required": ["type", "loc", "name", "params", "body"],
  "properties": {
    "type": { "const": "KomponenDeclaration" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "name": { "type": "string", "minLength": 1, "pattern": "^[A-Z]" },
    "params": {
      "type": "array",
      "items": { "$ref": "Parameter" }
    },
    "returnType": { "type": "string" },
    "body": { "$ref": "BlockStatement" }
  },
  "additionalProperties": false
}
```

#### FungsiDeclaration

```json
{
  "type": "object",
  "required": ["type", "loc", "name", "params", "body"],
  "properties": {
    "type": { "const": "FungsiDeclaration" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "name": { "type": "string", "minLength": 1 },
    "params": {
      "type": "array",
      "items": { "$ref": "Parameter" }
    },
    "returnType": { "type": "string" },
    "body": { "$ref": "BlockStatement" }
  },
  "additionalProperties": false
}
```

#### BlockStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "body"],
  "properties": {
    "type": { "const": "BlockStatement" },
    "loc": { "$ref": "SourceLocation" },
    "body": {
      "type": "array",
      "items": { "$ref": "ASTNode" }
    }
  },
  "additionalProperties": false
}
```

#### BuatStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "selector"],
  "properties": {
    "type": { "const": "BuatStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "selector": { "$ref": "Selector" },
    "properties": {
      "type": "array",
      "items": { "$ref": "PropertyNode" }
    },
    "body": { "$ref": "BlockStatement" },
    "action": { "$ref": "ASTNode" }
  },
  "additionalProperties": false
}
```

#### TampilkanStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "target"],
  "properties": {
    "type": { "const": "TampilkanStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "target": { "oneOf": [
      { "$ref": "Selector" },
      { "$ref": "Literal" },
      { "$ref": "Identifier" }
    ]},
    "mountTarget": { "oneOf": [
      { "$ref": "Selector" },
      { "$ref": "Literal" },
      { "$ref": "Identifier" }
    ]},
    "mode": { "type": "string", "enum": ["tambahkan", "ganti", "awalan", "sebelum", "sesudah"] },
    "messageKind": { "type": "string", "enum": ["pesan", "pesan-error", "notifikasi"] }
  },
  "additionalProperties": false
}
```

#### PerbaruiStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "property", "target", "value"],
  "properties": {
    "type": { "const": "PerbaruiStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "property": { "type": "string", "minLength": 1 },
    "target": { "oneOf": [
      { "$ref": "Selector" },
      { "$ref": "Literal" },
      { "$ref": "Identifier" }
    ]},
    "value": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### KetikaStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "event"],
  "properties": {
    "type": { "const": "KetikaStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "target": { "oneOf": [
      { "$ref": "Selector" },
      { "$ref": "Literal" },
      { "$ref": "Identifier" }
    ]},
    "event": { "type": "string", "enum": [
      "diklik", "diketik", "disubmit", "dimuat", "diubah",
      "difokus", "ditinggal", "ditekan", "dilepas", "diarahkan",
      "ditinggal-kursor", "digulir", "dipasang", "dilepas-dari-dom"
    ]},
    "body": { "$ref": "BlockStatement" },
    "action": { "$ref": "ASTNode" }
  },
  "additionalProperties": false
}
```

#### SaatStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "target", "body"],
  "properties": {
    "type": { "const": "SaatStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "target": { "type": "string", "minLength": 1 },
    "body": { "$ref": "BlockStatement" }
  },
  "additionalProperties": false
}
```

#### LifecycleStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "kind", "body"],
  "properties": {
    "type": { "const": "LifecycleStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "kind": { "type": "string", "enum": ["dipasang", "diperbarui", "dilepas"] },
    "body": { "$ref": "BlockStatement" }
  },
  "additionalProperties": false
}
```

#### SetelahStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "target"],
  "properties": {
    "type": { "const": "SetelahStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "target": { "type": "string", "minLength": 1 },
    "body": { "$ref": "BlockStatement" },
    "action": { "$ref": "ASTNode" }
  },
  "additionalProperties": false
}
```

#### JikaStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "condition", "consequent"],
  "properties": {
    "type": { "const": "JikaStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "condition": { "$ref": "ExpressionNode" },
    "consequent": { "$ref": "BlockStatement" },
    "alternate": { "oneOf": [
      { "$ref": "BlockStatement" },
      { "$ref": "JikaStatement" }
    ]}
  },
  "additionalProperties": false
}
```

#### UlangiStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "iteratorName", "source", "body", "kind"],
  "properties": {
    "type": { "const": "UlangiStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "iteratorName": { "type": "string" },
    "source": { "$ref": "ExpressionNode" },
    "body": { "$ref": "BlockStatement" },
    "kind": { "type": "string", "enum": ["dari", "kali", "rentang"] },
    "rangeEnd": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### SelamaStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "condition", "body"],
  "properties": {
    "type": { "const": "SelamaStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "condition": { "$ref": "ExpressionNode" },
    "body": { "$ref": "BlockStatement" }
  },
  "additionalProperties": false
}
```

#### SimpanStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "value", "target", "kind"],
  "properties": {
    "type": { "const": "SimpanStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "value": { "$ref": "ExpressionNode" },
    "target": { "type": "string", "minLength": 1 },
    "kind": { "type": "string", "enum": ["simpan_ke", "assign_sama"] }
  },
  "additionalProperties": false
}
```

#### TambahkanStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "value", "target"],
  "properties": {
    "type": { "const": "TambahkanStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "value": { "$ref": "ExpressionNode" },
    "target": { "type": "string", "minLength": 1 }
  },
  "additionalProperties": false
}
```

#### KurangiStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "target"],
  "properties": {
    "type": { "const": "KurangiStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "target": { "type": "string", "minLength": 1 },
    "value": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### SisipkanStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "value", "target"],
  "properties": {
    "type": { "const": "SisipkanStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "value": { "$ref": "ExpressionNode" },
    "target": { "type": "string", "minLength": 1 }
  },
  "additionalProperties": false
}
```

#### AmbilDomStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "kind", "source", "target"],
  "properties": {
    "type": { "const": "AmbilDomStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "kind": { "type": "string", "enum": ["nilai", "teks", "html", "tinggi", "lebar", "atribut"] },
    "source": { "oneOf": [
      { "$ref": "Selector" },
      { "$ref": "Literal" },
      { "$ref": "Identifier" }
    ]},
    "attributeName": { "type": "string" },
    "target": { "type": "string", "minLength": 1 }
  },
  "additionalProperties": false
}
```

#### AmbilLuarStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "url", "branches"],
  "properties": {
    "type": { "const": "AmbilLuarStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "url": { "$ref": "Literal" },
    "options": {
      "type": "array",
      "items": { "$ref": "FetchOption" }
    },
    "branches": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "FetchBranch" }
    }
  },
  "additionalProperties": false
}
```

#### GunakanStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "componentName"],
  "properties": {
    "type": { "const": "GunakanStatement" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "componentName": { "type": "string", "minLength": 1, "pattern": "^[A-Z]" },
    "props": {
      "type": "array",
      "items": { "$ref": "PropertyNode" }
    },
    "mountTarget": { "oneOf": [
      { "$ref": "Selector" },
      { "$ref": "Literal" },
      { "$ref": "Identifier" }
    ]}
  },
  "additionalProperties": false
}
```

#### ArahkanStatement

```json
{
  "type": "object",
  "required": ["type", "loc", "url"],
  "properties": {
    "type": { "const": "ArahkanStatement" },
    "loc": { "$ref": "SourceLocation" },
    "url": { "$ref": "Literal" }
  },
  "additionalProperties": false
}
```

#### MuatUlangStatement

```json
{
  "type": "object",
  "required": ["type", "loc"],
  "properties": {
    "type": { "const": "MuatUlangStatement" },
    "loc": { "$ref": "SourceLocation" }
  },
  "additionalProperties": false
}
```

#### KembaliStatement

```json
{
  "type": "object",
  "required": ["type", "loc"],
  "properties": {
    "type": { "const": "KembaliStatement" },
    "loc": { "$ref": "SourceLocation" }
  },
  "additionalProperties": false
}
```

#### BerhentiStatement

```json
{
  "type": "object",
  "required": ["type", "loc"],
  "properties": {
    "type": { "const": "BerhentiStatement" },
    "loc": { "$ref": "SourceLocation" }
  },
  "additionalProperties": false
}
```

#### LewatiStatement

```json
{
  "type": "object",
  "required": ["type", "loc"],
  "properties": {
    "type": { "const": "LewatiStatement" },
    "loc": { "$ref": "SourceLocation" }
  },
  "additionalProperties": false
}
```

#### KembalikanStatement

```json
{
  "type": "object",
  "required": ["type", "loc"],
  "properties": {
    "type": { "const": "KembalikanStatement" },
    "loc": { "$ref": "SourceLocation" },
    "value": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### LangsungBlock

```json
{
  "type": "object",
  "required": ["type", "loc", "content"],
  "properties": {
    "type": { "const": "LangsungBlock" },
    "loc": { "$ref": "SourceLocation" },
    "content": { "type": "string" }
  },
  "additionalProperties": false
}
```

#### JalankanExpression

```json
{
  "type": "object",
  "required": ["type", "loc", "callee", "kind"],
  "properties": {
    "type": { "const": "JalankanExpression" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "callee": { "type": "string", "minLength": 1 },
    "arguments": {
      "type": "array",
      "items": { "$ref": "ExpressionNode" }
    },
    "withArgs": {
      "type": "array",
      "items": { "$ref": "ExpressionNode" }
    },
    "kind": { "type": "string", "enum": ["parens", "dengan", "no_args"] }
  },
  "additionalProperties": false
}
```

#### PanggilNativeExpression

```json
{
  "type": "object",
  "required": ["type", "loc", "callee", "arguments"],
  "properties": {
    "type": { "const": "PanggilNativeExpression" },
    "loc": { "$ref": "SourceLocation" },
    "docstring": { "type": "string" },
    "callee": { "$ref": "Identifier" },
    "arguments": {
      "type": "array",
      "items": { "$ref": "ExpressionNode" }
    }
  },
  "additionalProperties": false
}
```

#### RantaiAksi

```json
{
  "type": "object",
  "required": ["type", "loc", "first", "chain"],
  "properties": {
    "type": { "const": "RantaiAksi" },
    "loc": { "$ref": "SourceLocation" },
    "first": { "$ref": "ASTNode" },
    "chain": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "ASTNode" }
    }
  },
  "additionalProperties": false
}
```

#### Literal

```json
{
  "type": "object",
  "required": ["type", "loc", "value", "kind"],
  "properties": {
    "type": { "const": "Literal" },
    "loc": { "$ref": "SourceLocation" },
    "value": { "oneOf": [
      { "type": "string" },
      { "type": "number" },
      { "type": "boolean" },
      { "type": "null" }
    ]},
    "kind": { "type": "string", "enum": ["teks", "angka", "boolean", "kosong"] }
  },
  "additionalProperties": false
}
```

#### Identifier

```json
{
  "type": "object",
  "required": ["type", "loc", "name"],
  "properties": {
    "type": { "const": "Identifier" },
    "loc": { "$ref": "SourceLocation" },
    "name": { "type": "string", "minLength": 1 }
  },
  "additionalProperties": false
}
```

#### BinaryExpression

```json
{
  "type": "object",
  "required": ["type", "loc", "operator", "left", "right"],
  "properties": {
    "type": { "const": "BinaryExpression" },
    "loc": { "$ref": "SourceLocation" },
    "operator": { "type": "string", "enum": [
      "+", "-", "*", "/",
      "sama dengan", "tidak sama dengan", "lebih dari", "kurang dari",
      "paling sedikit", "paling banyak", "ada di", "tidak ada di",
      "dan", "atau"
    ]},
    "left": { "$ref": "ExpressionNode" },
    "right": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### UnaryExpression

```json
{
  "type": "object",
  "required": ["type", "loc", "operator", "operand", "prefix"],
  "properties": {
    "type": { "const": "UnaryExpression" },
    "loc": { "$ref": "SourceLocation" },
    "operator": { "type": "string", "enum": ["bukan", "-"] },
    "operand": { "$ref": "ExpressionNode" },
    "prefix": { "type": "boolean", "const": true }
  },
  "additionalProperties": false
}
```

#### MemberExpression

```json
{
  "type": "object",
  "required": ["type", "loc", "object", "property"],
  "properties": {
    "type": { "const": "MemberExpression" },
    "loc": { "$ref": "SourceLocation" },
    "object": { "$ref": "ExpressionNode" },
    "property": { "$ref": "Identifier" }
  },
  "additionalProperties": false
}
```

#### CallExpression

```json
{
  "type": "object",
  "required": ["type", "loc", "callee", "arguments"],
  "properties": {
    "type": { "const": "CallExpression" },
    "loc": { "$ref": "SourceLocation" },
    "callee": { "$ref": "ExpressionNode" },
    "arguments": {
      "type": "array",
      "items": { "$ref": "ExpressionNode" }
    }
  },
  "additionalProperties": false
}
```

#### ObjectLiteral

```json
{
  "type": "object",
  "required": ["type", "loc", "properties"],
  "properties": {
    "type": { "const": "ObjectLiteral" },
    "loc": { "$ref": "SourceLocation" },
    "properties": {
      "type": "array",
      "items": { "$ref": "PropertyNode" }
    }
  },
  "additionalProperties": false
}
```

#### ArrayLiteral

```json
{
  "type": "object",
  "required": ["type", "loc", "elements"],
  "properties": {
    "type": { "const": "ArrayLiteral" },
    "loc": { "$ref": "SourceLocation" },
    "elements": {
      "type": "array",
      "items": { "$ref": "ExpressionNode" }
    }
  },
  "additionalProperties": false
}
```

#### Selector

```json
{
  "type": "object",
  "required": ["type", "loc", "tag", "classes", "attributes"],
  "properties": {
    "type": { "const": "Selector" },
    "loc": { "$ref": "SourceLocation" },
    "tag": { "type": "string", "minLength": 1 },
    "id": { "type": "string" },
    "classes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "attributes": {
      "type": "array",
      "items": { "$ref": "AttributeNode" }
    }
  },
  "additionalProperties": false
}
```

#### PropertyNode

```json
{
  "type": "object",
  "required": ["type", "loc", "key", "value", "shorthand"],
  "properties": {
    "type": { "const": "PropertyNode" },
    "loc": { "$ref": "SourceLocation" },
    "key": { "type": "string", "minLength": 1 },
    "value": { "$ref": "ExpressionNode" },
    "shorthand": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

#### AttributeNode

```json
{
  "type": "object",
  "required": ["type", "loc", "key", "value"],
  "properties": {
    "type": { "const": "AttributeNode" },
    "loc": { "$ref": "SourceLocation" },
    "key": { "type": "string", "minLength": 1 },
    "value": { "type": "string" }
  },
  "additionalProperties": false
}
```

#### Parameter

```json
{
  "type": "object",
  "required": ["type", "loc", "name"],
  "properties": {
    "type": { "const": "Parameter" },
    "loc": { "$ref": "SourceLocation" },
    "name": { "type": "string", "minLength": 1 },
    "typeHint": { "type": "string" },
    "defaultValue": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### FetchBranch

```json
{
  "type": "object",
  "required": ["type", "loc", "kind", "action"],
  "properties": {
    "type": { "const": "FetchBranch" },
    "loc": { "$ref": "SourceLocation" },
    "kind": { "type": "string", "enum": ["berhasil", "gagal", "selalu"] },
    "action": { "oneOf": [
      { "$ref": "BlockStatement" },
      { "$ref": "ASTNode" }
    ]}
  },
  "additionalProperties": false
}
```

#### FetchOption

```json
{
  "type": "object",
  "required": ["type", "loc", "key", "value"],
  "properties": {
    "type": { "const": "FetchOption" },
    "loc": { "$ref": "SourceLocation" },
    "key": { "type": "string", "enum": ["metode", "data", "kepala", "kredensial", "mode"] },
    "value": { "$ref": "ExpressionNode" }
  },
  "additionalProperties": false
}
```

#### ErrorNode

```json
{
  "type": "object",
  "required": ["type", "loc", "code", "message"],
  "properties": {
    "type": { "const": "ErrorNode" },
    "loc": { "$ref": "SourceLocation" },
    "code": { "type": "string", "pattern": "^E2\\d{3}$" },
    "message": { "type": "string", "minLength": 1 },
    "originalToken": { "type": "object" }
  },
  "additionalProperties": false
}
```

---

## 6. Contoh AST Lengkap

Berikut adalah contoh AST lengkap untuk program KARSA sederhana (Counter — Grammar Spec §15.1).

### Source Code

```ks
data hitungan = 0

buat div#app
  buat h1 -> teks: "Penghitung"
  buat p#angka -> teks: hitungan
  buat div.tombol-grup
    buat tombol#kurang -> teks: "−"
    buat tombol#tambah -> teks: "+"

ketika tombol#tambah diklik:
  tambahkan 1 ke hitungan

ketika tombol#kurang diklik:
  kurangi hitungan dengan 1

saat hitungan berubah:
  perbarui teks p#angka -> hitungan
```

### AST Output

```json
{
  "type": "Program",
  "loc": { "start": { "line": 1, "column": 1 }, "end": { "line": 14, "column": 35 } },
  "body": [
    {
      "type": "DataDeclaration",
      "loc": { "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 20 } },
      "name": "hitungan",
      "typeHint": undefined,
      "init": { "type": "Literal", "loc": { "start": { "line": 1, "column": 17 }, "end": { "line": 1, "column": 17 } }, "value": 0, "kind": "angka" }
    },
    {
      "type": "BuatStatement",
      "loc": { "start": { "line": 3, "column": 1 }, "end": { "line": 8, "column": 33 } },
      "selector": {
        "type": "Selector",
        "loc": { "start": { "line": 3, "column": 6 }, "end": { "line": 3, "column": 12 } },
        "tag": "div",
        "id": "app",
        "classes": [],
        "attributes": []
      },
      "body": {
        "type": "BlockStatement",
        "loc": { "start": { "line": 4, "column": 3 }, "end": { "line": 8, "column": 33 } },
        "body": [
          {
            "type": "BuatStatement",
            "loc": { "start": { "line": 4, "column": 3 }, "end": { "line": 4, "column": 27 } },
            "selector": {
              "type": "Selector",
              "loc": { "start": { "line": 4, "column": 8 }, "end": { "line": 4, "column": 9 } },
              "tag": "h1",
              "id": undefined,
              "classes": [],
              "attributes": []
            },
            "properties": [
              {
                "type": "PropertyNode",
                "loc": { "start": { "line": 4, "column": 15 }, "end": { "line": 4, "column": 27 } },
                "key": "teks",
                "value": { "type": "Literal", "loc": { "start": { "line": 4, "column": 21 }, "end": { "line": 4, "column": 27 } }, "value": "Penghitung", "kind": "teks" },
                "shorthand": false
              }
            ]
          },
          {
            "type": "BuatStatement",
            "loc": { "start": { "line": 5, "column": 3 }, "end": { "line": 5, "column": 31 } },
            "selector": {
              "type": "Selector",
              "loc": { "start": { "line": 5, "column": 8 }, "end": { "line": 5, "column": 14 } },
              "tag": "p",
              "id": "angka",
              "classes": [],
              "attributes": []
            },
            "properties": [
              {
                "type": "PropertyNode",
                "loc": { "start": { "line": 5, "column": 20 }, "end": { "line": 5, "column": 31 } },
                "key": "teks",
                "value": { "type": "Identifier", "loc": { "start": { "line": 5, "column": 25 }, "end": { "line": 5, "column": 31 } }, "name": "hitungan" },
                "shorthand": false
              }
            ]
          },
          {
            "type": "BuatStatement",
            "loc": { "start": { "line": 6, "column": 3 }, "end": { "line": 8, "column": 33 } },
            "selector": {
              "type": "Selector",
              "loc": { "start": { "line": 6, "column": 8 }, "end": { "line": 6, "column": 22 } },
              "tag": "div",
              "id": undefined,
              "classes": ["tombol-grup"],
              "attributes": []
            },
            "body": {
              "type": "BlockStatement",
              "loc": { "start": { "line": 7, "column": 5 }, "end": { "line": 8, "column": 33 } },
              "body": [
                {
                  "type": "BuatStatement",
                  "loc": { "start": { "line": 7, "column": 5 }, "end": { "line": 7, "column": 32 } },
                  "selector": {
                    "type": "Selector",
                    "loc": { "start": { "line": 7, "column": 10 }, "end": { "line": 7, "column": 22 } },
                    "tag": "tombol",
                    "id": "kurang",
                    "classes": [],
                    "attributes": []
                  },
                  "properties": [
                    {
                      "type": "PropertyNode",
                      "loc": { "start": { "line": 7, "column": 28 }, "end": { "line": 7, "column": 32 } },
                      "key": "teks",
                      "value": { "type": "Literal", "loc": {}, "value": "−", "kind": "teks" },
                      "shorthand": false
                    }
                  ]
                },
                {
                  "type": "BuatStatement",
                  "loc": { "start": { "line": 8, "column": 5 }, "end": { "line": 8, "column": 33 } },
                  "selector": {
                    "type": "Selector",
                    "loc": { "start": { "line": 8, "column": 10 }, "end": { "line": 8, "column": 22 } },
                    "tag": "tombol",
                    "id": "tambah",
                    "classes": [],
                    "attributes": []
                  },
                  "properties": [
                    {
                      "type": "PropertyNode",
                      "loc": { "start": { "line": 8, "column": 28 }, "end": { "line": 8, "column": 33 } },
                      "key": "teks",
                      "value": { "type": "Literal", "loc": {}, "value": "+", "kind": "teks" },
                      "shorthand": false
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    },
    {
      "type": "KetikaStatement",
      "loc": { "start": { "line": 10, "column": 1 }, "end": { "line": 11, "column": 27 } },
      "target": {
        "type": "Selector",
        "loc": {},
        "tag": "tombol",
        "id": "tambah",
        "classes": [],
        "attributes": []
      },
      "event": "diklik",
      "body": {
        "type": "BlockStatement",
        "loc": {},
        "body": [
          {
            "type": "TambahkanStatement",
            "loc": { "start": { "line": 11, "column": 3 }, "end": { "line": 11, "column": 27 } },
            "value": { "type": "Literal", "loc": {}, "value": 1, "kind": "angka" },
            "target": "hitungan"
          }
        ]
      }
    },
    {
      "type": "KetikaStatement",
      "loc": { "start": { "line": 13, "column": 1 }, "end": { "line": 14, "column": 27 } },
      "target": {
        "type": "Selector",
        "loc": {},
        "tag": "tombol",
        "id": "kurang",
        "classes": [],
        "attributes": []
      },
      "event": "diklik",
      "body": {
        "type": "BlockStatement",
        "loc": {},
        "body": [
          {
            "type": "KurangiStatement",
            "loc": { "start": { "line": 14, "column": 3 }, "end": { "line": 14, "column": 27 } },
            "target": "hitungan",
            "value": { "type": "Literal", "loc": {}, "value": 1, "kind": "angka" }
          }
        ]
      }
    },
    {
      "type": "SaatStatement",
      "loc": { "start": { "line": 14, "column": 1 }, "end": { "line": 14, "column": 35 } },
      "target": "hitungan",
      "body": {
        "type": "BlockStatement",
        "loc": {},
        "body": [
          {
            "type": "PerbaruiStatement",
            "loc": {},
            "property": "teks",
            "target": {
              "type": "Selector",
              "loc": {},
              "tag": "p",
              "id": "angka",
              "classes": [],
              "attributes": []
            },
            "value": { "type": "Identifier", "loc": {}, "name": "hitungan" }
          }
        ]
      }
    }
  ]
}
```

---

*Akhir dokumen AST Specification v1.0.0*

---

## Lampiran Refinement lvl.1 — `ast.semantic`

Mulai **[v0.3.1] Refinement lvl.1**, hasil Resolver menempelkan metadata semantic ke node `Program` melalui properti `ast.semantic`.

Tujuan utama:

- menjadi kontrak internal antara Resolver dan Analyzer;
- menjadi fondasi tooling seperti `check --json`, `inspect`, language server, hover, go to definition, dan find references;
- menyediakan metadata symbol/reference tanpa perlu Analyzer melakukan lookup ulang dari nol.

### Bentuk internal saat ini

```ts
interface Program {
  type: 'Program';
  body: Statement[];
  semantic?: SemanticProgramInfo;
}

interface SemanticProgramInfo {
  symbols: SemanticSymbol[];
  globalScope: Scope;
}
```

### `SemanticSymbol`

```ts
interface SemanticSymbol {
  name: string;
  kind: 'data' | 'tetap' | 'ubah' | 'turunan' | 'fungsi' | 'komponen' | 'parameter';
  declarationNode: ASTNode;
  scope: 'global' | 'blok' | 'komponen' | 'iterasi' | 'watcher';

  isReactive: boolean;
  isWritable: boolean;
  isComputed: boolean;
  isParameter: boolean;
  isComponent: boolean;
  isFunction: boolean;

  shadowedSymbol: SemanticSymbol | null;
  references: Identifier[];
  readCount: number;
  writeCount: number;
}
```

### Metadata pada Identifier

Identifier yang berhasil di-resolve akan memiliki:

```ts
interface Identifier {
  type: 'Identifier';
  name: string;
  resolved?: SemanticSymbol;
  semantic?: {
    symbol: SemanticSymbol;
  };
}
```

### Catatan penting untuk tooling

Struktur internal `ast.semantic` saat ini dapat memiliki circular reference:

```text
symbol -> declarationNode -> symbol
symbol -> references[] -> identifier -> resolved -> symbol
```

Karena itu, consumer tooling **tidak disarankan** melakukan `JSON.stringify(ast)` langsung.

Untuk public JSON API, gunakan bentuk normalized:

```ts
interface PublicSemanticSymbol {
  id: string;
  name: string;
  kind: string;
  loc: SourceLocation | null;
  scope: string;
  isReactive: boolean;
  isWritable: boolean;
  isComputed: boolean;
  readCount: number;
  writeCount: number;
  shadowedSymbolId?: string;
}
```

Normalized semantic export penuh direncanakan untuk **[v0.3.1] Refinement lvl.2** melalui Symbol Table API dan command seperti:

```bash
karsa inspect file.ks --json
karsa graph file.ks --json
```

### Diagnostics usage awal

Analyzer dapat memakai metadata ini untuk diagnostics awal:

- `W4101` — symbol dideklarasikan tetapi tidak pernah digunakan;
- `W4102` — symbol ditulis tetapi tidak pernah dibaca.


### Contoh kecil `ast.semantic.symbols`

Source:

```ks
data hitungan = 0
ubah sementara = 1
turunan dobel = hitungan * 2

tambahkan 1 ke hitungan
```

Bentuk internal konseptual:

```js
ast.semantic.symbols = [
  {
    name: 'hitungan',
    kind: 'data',
    scope: 'global',
    isReactive: true,
    isWritable: true,
    isComputed: false,
    readCount: 1,
    writeCount: 1,
    references: [Identifier('hitungan')]
  },
  {
    name: 'sementara',
    kind: 'ubah',
    scope: 'global',
    isReactive: false,
    isWritable: true,
    isComputed: false,
    readCount: 0,
    writeCount: 0,
    references: []
  },
  {
    name: 'dobel',
    kind: 'turunan',
    scope: 'global',
    isReactive: true,
    isWritable: false,
    isComputed: true,
    readCount: 0,
    writeCount: 0,
    references: []
  }
]
```

Catatan: contoh di atas disederhanakan untuk dokumentasi. Objek runtime internal memuat `declarationNode`, `shadowedSymbol`, dan object reference lain yang dapat membentuk circular reference.

### Stabilitas field internal vs public API

Untuk **[v0.3.1] Refinement lvl.1**:

- `ast.semantic` adalah kontrak internal Resolver → Analyzer.
- Tooling boleh membaca `ast.semantic`, tetapi belum dianggap public JSON API stabil.
- Public JSON yang stabil untuk lvl.1 adalah diagnostics dari `karsa check --json`.

Untuk **[v0.3.1] Refinement lvl.2**:

- Symbol table public akan dinormalisasi menggunakan `symbolId` dan `scopeId`.
- Circular reference tidak boleh muncul pada output `inspect --json` atau `graph --json`.
- Field internal seperti `declarationNode`, `resolved`, dan `symbol` tidak akan diekspos mentah ke tooling JSON.
