# KARSA v0.3.1 — Lexer (Tahap 1)

Lexer murni JavaScript yang mengkonversi stream karakter Karsa (`.ks`) menjadi
stream token dengan penanganan indentasi 2-spasi yang ketat, longest-match
keyword multi-kata, komentar/DocString, selektor CSS, dan region mentah
`langsung:`.

> Mengikuti `KARSA-grammar-spec_v0_3_1.md` (Section 3, 12, 14, 16.1).

## Berkas

| Berkas | Fungsi |
|---|---|
| `karsa-lexer.js` | Modul lexer (tanpa dependensi, ES2015) |
| `test-lexer.js` | 61 tes otomatis (longest-match, indentasi, literal, selektor, docstring, raw, perf) |
| `edge-cases.js` | 16 tes edge case (CRLF, CR, input kosong, aksen, dedent ganda) |
| `demo-spec.js` | Verifikasi contoh spesifikasi 15.2 & 15.3 + dump token stream |

## Penggunaan

```js
const { tokenize, TT, formatError } = require("./karsa-lexer.js");

const hasil = tokenize(`
--? Komponen sapaan
buat div#app
  buat h1 -> teks: "Halo"
`);

// hasil.tokens  -> [{ tipe, nilai, baris, kolom, docstring }, ...]
// hasil.errors  -> [LexerError, ...]
// hasil.warnings-> [{ baris, kolom, kode, pesan }, ...]

hasil.tokens.forEach(t => console.log(t.baris, t.kolom, t.tipe, t.nilai));
hasil.errors.forEach(e => console.log(formatError(e)));
```

## Bentuk Token

Setiap token selalu memiliki 5 field inti (sesuai spesifikasi):

```js
{
  tipe: "TK_BUAT",          // konstanta tipe token
  nilai: "buat",            // nilai/teks token
  baris: 2,                 // 1-based
  kolom: 1,                 // 1-based
  docstring: null           // string DocString --? yang menempel, atau null
}
```

Beberapa tipe menambah field turunan untuk kenyamanan:
`TK_LITERAL_TEKS.mentah` (dengan kutip), `TK_LITERAL_ANGKA.angka` (Number),
`TK_ATRIBUT.kunci` + `TK_ATRIBUT.nilaiAtribut` (key/value terurai),
`TK_BLOK_LANGSUNG` (nilai = JS mentah).

## Error Berkode [E1xxx]

Setiap error berisi: **baris, kolom, kode, pesan, penjelasan, saran**.

| Kode | Kondisi |
|---|---|
| `E1001` | Indentasi bukan kelipatan 2 spasi |
| `E1002` | Karakter TAB di indentasi (dilarang) |
| `E1003` | DEDENT ke level yang tidak ada di stack indentasi |
| `E1004` | Literal teks tidak ditutup (kutip penutup hilang) |
| `E1005` | Karakter tidak dikenal |
| `E1006` | DocString blok `--? [[` tidak ditutup `]]` |
| `E1007` | Komentar blok `--! [[` tidak ditutup `]]` |
| `E1009` | Selektor ID kosong (`#` tanpa nama) |
| `W1001` | (warning) DocString tidak menempel ke node mana pun |

Contoh format (sama persis contoh spesifikasi):
```
✗ Baris 5, Kolom 3 [E1001]
Indentasi tidak valid: 3 spasi ditemukan, tetapi Karsa memakai 2 spasi per level.
Saran: gunakan 2, 4, 6, atau 8 spasi (kelipatan 2).
```

## Keputusan Desain Penting (didokumentasikan di kode)

1. **Trie keyword** — semua 76+ keyword (termasuk multi-kata & ber-hyphen)
   dimasukkan ke satu trie. Pencocokan longest-match dalam O(panjang keyword),
   memilih terminal terpanjang yang batas-katanya valid.
   - `jika tidak` → `TK_JIKA_TIDAK` (bukan `TK_JIKA` + identifier)
   - `tidak sama dengan` → `TK_TIDAK_SAMA_DENGAN` (bukan `tidak` + `sama dengan`)
   - `ditinggal-kursor` → `TK_DITINGGAL_KURSOR` (bukan `ditinggal` + `-` + `kursor`)

2. **Inden­­tasi Python-style** — stack `[0]`; INDENT bila naik, DEDENT bila turun
   (boleh beberapa level sekaligus). Baris kosong & baris komentar TIDAK
   memicu INDENT/DEDENT. Pemulihan: indentasi ganjil dibulatkan ke genap agar
   tidak mengakibatkan error berjalan.

3. **Komentar inline & awal baris** — `--!` (diabaikan) dan `--?` (DocString,
   menempel ke token signifikan berikutnya) dikenali di mana saja, sebaris
   maupun blok `[[ ... ]]`.

4. **Region mentah `langsung:`** — setelah `langsung` `:` di akhir baris, baris
   yang lebih dalam ditangkap utuh sebagai `TK_BLOK_LANGSUNG` (JS tidak
   di-tokenisasi, brace/tanda `===` tidak memicu error). Berguna untuk
   escape-hatch Section 11.

5. **Selektor CSS**:
   - `#id` → `TK_ID` (nama boleh ber-hyphen, mis. `#btn-masuk`)
   - `.nama` ber-hyphen → `TK_CLASS`; `.nama` tanpa-hyphen → `TK_TITIK` + `TK_IDENTIFIER`
     (parser memutuskan: kelas vs akses-properti lewat konteks — ini tidak bisa
     diputuskan murni di lexer tanpa parsing grammar)
   - `[kunci="nilai"]` → `TK_ATRIBUT`; `[ ... ]` lainnya → kurung siku array

6. **Ambiguitas penamaan** — spesifikasi EBNF 3.6 (`SAMA_DENGAN ::= "="`) dan
   Tabel Token 14 (`TK_SAMA_DENGAN = "sama dengan"`) bertabrakan. Dipisah:
   `=` → `TK_TANDA_SAMA`; `sama dengan` → `TK_SAMA_DENGAN`.

7. **Minus vs angka negatif** — `-` diikuti digit DAN bukan setelah nilai
   (literal/identifier/kurung-tutup) → `LITERAL_ANGKA` negatif; jika tidak →
   `TK_MINUS` (pengurangan). Contoh: `= -45` → negatif; `a - 5` → kurang.

8. **Continuasi baris** — di dalam `()`/`{}`/`[]`, baris baru diabaikan (tidak
   memicu INDENT/DEDENT), memungkinkan objek/array multi-baris.

## Performa

| Ukuran | Token | Waktu | Throughput |
|---|---|---|---|
| 5 MB | 1,36 juta | ~630 ms | ~8 MB/s |
| 10 MB | 2,73 juta | ~1,14 dtk | ~8,8 MB/s |

Implementasi karakter-per-karakter dengan trie; tidak ada regex global yang
dijalankan berulang pada seluruh sumber. Memori ~22 byte/token.

## Menjalankan Tes

```bash
node test-lexer.js     # 61 tes fungsional
node edge-cases.js     # 16 tes edge case
node demo-spec.js      # verifikasi contoh spesifikasi 15.2 & 15.3
```

## Kompatibilitas

Bekerja di Node.js (CommonJS) dan browser (global `KarsaLexer`). Tanpa
TypeScript, Python, React, atau dependensi apa pun.
