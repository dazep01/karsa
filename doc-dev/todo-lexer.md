# KARSA — TODO LEXER & PRE-PARSER BACKLOG
Versi: Draft Pasca Grammar v0.3.1
Status: Technical Debt Register

## Tujuan Dokumen

Dokumen ini berfungsi sebagai catatan hutang teknis resmi yang sengaja ditunda agar pengembangan dapat langsung berlanjut ke Tahap 2 (Parser).

Prinsip utama:

- Jangan melakukan refactor besar pada lexer sebelum parser berjalan.
- Perbaiki hanya bug nyata yang ditemukan selama implementasi parser.
- Semua item di bawah ini merupakan backlog terstruktur agar konteks tidak hilang walaupun proyek dibuka kembali setelah waktu yang lama.

---

# BAGIAN A — HUTANG WAJIB

Item pada bagian ini belum harus dikerjakan sekarang, tetapi wajib diselesaikan sebelum KARSA menuju rilis stabil yang serius.

## LEXER-005 — Source Map Metadata

### Latar Belakang

Compiler, debugger, formatter, dan error reporter membutuhkan informasi posisi yang lebih presisi.

### Kondisi Saat Ini

Token telah memiliki informasi lokasi dasar.

### Target Masa Depan

Setiap token idealnya memiliki:

```js
{
  type,
  value,
  line,
  column,
  startOffset,
  endOffset,
  sourceFile
}
```

### Manfaat

- Source map
- Debugger
- Error highlight presisi
- IDE integration

### Prioritas

Tinggi

---

## RFC-001 — Expression Grammar V2

### Latar Belakang

Grammar ekspresi saat ini cukup untuk tahap awal namun belum mencakup seluruh kebutuhan bahasa modern.

### Contoh yang Harus Didukung

```karsa
(a + b) * c
a && b || c
x ?? y
```

### Rekomendasi

Pertimbangkan Pratt Parser.

### Dampak

Berpengaruh langsung terhadap desain parser dan AST.

### Prioritas

Sangat Tinggi

---

## RFC-002 — Operator Precedence Table

### Tujuan

Mendefinisikan urutan prioritas operator secara formal.

Contoh urutan:

```text
()
[]
.

*
/

+
-

< <= > >=

== !=

&&

||

??
```

### Manfaat

- Menghilangkan ambiguitas parser
- Konsistensi lintas implementasi

### Prioritas

Sangat Tinggi

---

## TYPE-002 — Function Signature Checking

### Tujuan

Memastikan validasi parameter dan nilai balik fungsi.

Contoh:

```karsa
fungsi tambah(a: angka, b: angka)
```

### Harus Memeriksa

- jumlah parameter
- tipe parameter
- tipe return
- pemanggilan fungsi

### Prioritas

Tinggi

---

## RUN-001 — Reactive Dependency Graph

### Tujuan

Mendefinisikan kontrak reaktivitas secara formal.

Contoh:

```karsa
simpan "Budi" ke pengguna.profil.nama
```

Harus jelas:

- dependency tracking
- invalidation
- propagation
- batching

### Prioritas

Sangat Tinggi

---

## RUN-002 — Scheduler Contract

### Tujuan

Menentukan kapan update dieksekusi.

Definisikan:

```text
sync
microtask
macrotask
```

### Prioritas

Tinggi

---

## RUN-003 — Watcher Lifecycle

### Tujuan

Mendefinisikan siklus hidup watcher.

Tahapan:

```text
create
update
dispose
```

### Prioritas

Tinggi

---

## RUN-004 — Memory Leak Prevention

### Tujuan

Mencegah observer atau watcher yang tidak pernah dibersihkan.

### Prioritas

Tinggi

---

## MOD-001 — Import Export System

### Tujuan

Mendukung proyek multi-file.

Contoh:

```karsa
impor Tombol dari "./Tombol.ks"
```

### Dampak

Mempengaruhi:

- parser
- resolver
- compiler
- bundler

### Prioritas

Sangat Tinggi

---

## COMPILER-001 — Tree Shaking

Menghapus simbol yang tidak digunakan.

Prioritas: Tinggi

---

## COMPILER-002 — Dead Code Elimination

Menghapus kode yang tidak pernah dieksekusi.

Prioritas: Tinggi

---

## COMPILER-003 — Source Map Generation

Mendukung debugging hasil kompilasi.

Prioritas: Tinggi

---

## TOOL-001 — LSP

Fitur:

- autocomplete
- hover
- go to definition

Prioritas: Tinggi

---

## TOOL-002 — Formatter

Target:

Prettier untuk KARSA.

Prioritas: Tinggi

---

## TOOL-003 — Linter

Target:

ESLint untuk KARSA.

Prioritas: Tinggi

---

## DOC-001 — Error Catalog

Contoh:

```text
KARSA1001
KARSA1002
KARSA1003
```

Prioritas: Tinggi

---

# BAGIAN B — HUTANG SUNNAH

Item berikut sengaja ditunda karena tidak menghambat pembangunan parser.

## LEXER-001 — Unicode Identifier

Contoh masa depan:

```karsa
data 用户
data pengguna_α
```

Prioritas: Rendah

---

## LEXER-002 — Template String Multi Interpolasi

Contoh:

```karsa
teks sapaan = `Halo ${nama}`
```

Prioritas: Rendah

---

## LEXER-003 — Raw JS Validation

Fokus:

- validasi indent
- validasi block
- warning syntax

Prioritas: Sedang

---

## LEXER-004 — Better Error Recovery

Saat lexer gagal, lanjutkan proses scanning agar banyak error dapat dilaporkan sekaligus.

Prioritas: Sedang

---

## TYPE-001 — Type Inference

Contoh:

```karsa
data umur = 20
```

Inferensi:

```text
angka
```

Prioritas: Sedang

---

## TYPE-003 — Generic Collection

Contoh:

```karsa
array<angka>
array<teks>
```

Prioritas: Rendah

---

## TYPE-004 — Union Type

Contoh:

```karsa
teks | kosong
```

Prioritas: Rendah

---

## COMP-001 — Slot System

Contoh:

```karsa
slot header
slot isi
slot footer
```

Prioritas: Sedang

---

## COMP-002 — Dynamic Component

Komponen ditentukan saat runtime.

Prioritas: Sedang

---

## COMP-003 — Lazy Component

Muat komponen saat diperlukan.

Prioritas: Rendah

---

## MOD-002 — Namespace

Contoh:

```karsa
UI.Tombol
```

Prioritas: Sedang

---

## MOD-003 — Package Manager

Contoh:

```bash
karsa install ui-kit
```

Prioritas: Rendah

---

## COMPILER-004 — Minifier

Optimasi ukuran output.

Prioritas: Rendah

---

## DOC-002 — Style Guide

Standar penulisan resmi KARSA.

Prioritas: Sedang

---

## DOC-003 — Cookbook

Kumpulan pola implementasi umum.

Topik awal:

- CRUD
- Form
- Dashboard
- Routing
- API Fetch

Prioritas: Sedang

---

# KEPUTUSAN ARSITEKTURAL SAAT INI

Selama tidak ditemukan bug kritis:

1. Grammar v0.3.1 dianggap cukup.
2. Lexer dibekukan dari refactor besar.
3. Pengembangan dilanjutkan ke Tahap 2 (Parser).
4. Semua backlog dalam dokumen ini dianggap tertunda secara resmi.
5. Perubahan lexer hanya dilakukan bila parser menemukan kebutuhan nyata.

Status proyek saat dokumen ini dibuat:

```text
✓ Grammar
✓ Lexer
→ Parser
→ AST
→ Resolver
→ Semantic Analyzer
→ Compiler
→ Runtime
```
