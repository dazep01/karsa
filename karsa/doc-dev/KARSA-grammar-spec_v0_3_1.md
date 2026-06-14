# KARSA — Spesifikasi Grammar Formal
**Versi:** 0.3.1  
**Status:** Grammar-complete / implementation-ready  
**Ekstensi file:** `.ks`  
**Tujuan rilis:** menutup semua grammar hole v0.3.0 agar implementasi lexer, parser, resolver, dan compiler dapat dimulai tanpa ambiguitas yang tersisa.

---

## Catatan Rilis v0.3.1

Patch ini menutup semua **grammar hole** yang ditemukan di v0.3.0 sebelum implementasi dimulai. Tidak ada perubahan semantik besar — hanya formalisasi hal-hal yang sebelumnya dipakai tapi tidak didefinisikan.

### Apa yang ditambahkan di v0.3.1

**Grammar foundations baru (Section 3.8):**
- `nilai` — atom operand terkecil, dipakai di seluruh spec
- `akses_properti` — notasi dot berantai (`a.b.c`)
- `pemanggilan_native` — panggilan fungsi Karsa langsung dengan `()`
- `ekspresi_aritmatika` — operasi `+`, `-`, `*`, `/`
- `ekspresi_turunan` — ekspresi komputasi untuk `turunan`
- `nilai_awal` — nilai inisialisasi variabel termasuk objek dan array
- `objek_literal` — `{ kunci: nilai }` dan shorthand `{ identifier }`
- `array_literal` — `[ nilai, ... ]`

**Blok dan aksi (Section 4.6 — baru):**
- `blok_aksi` — definisi formal blok indentasi
- `aksi_tunggal` — definisi formal aksi satu baris setelah `->`
- `pernyataan` — definisi formal semua bentuk pernyataan yang valid

**Perbaikan semantik:**
- `berhenti` diperluas: kini valid di event handler sebagai early return
- `ketika` tanpa target di dalam `buat` block: self-reference ke elemen saat ini
- Sintaks panggil fungsi distandarkan: `f(x)` untuk fungsi Karsa, `jalankan f` untuk JS eksternal
- Section 5.4 lifecycle disinkronkan dengan Section 8.5 (tambah `diperbarui`)

**Perbaikan daftar keyword:**
- `sisipkan` dan `jalankan` ditambahkan ke daftar kata kunci

**Perbaikan contoh:**
- Contoh 15.3: bug `item.indeks` pada array string diperbaiki dengan catatan compiler injection
- Catatan Rilis v0.3.0 dipertahankan di bawah untuk referensi

---

## Catatan Rilis v0.3.0 (arsip)

Versi ini mempertahankan inti konsep KARSA:

- DSL teks untuk menghasilkan Vanilla JavaScript DOM API murni.
- Tidak ada Virtual DOM.
- Tidak ada `eval()`.
- Tidak ada `new Function()`.
- Parser menghasilkan AST.
- Compiler menurunkan AST ke JS yang bisa berjalan tanpa runtime KARSA.

Yang ditambahkan di v0.3.0:

- definisi perilaku yang sebelumnya ambigu;
- aturan reaktivitas yang lebih tegas;
- lifecycle komponen;
- pembedaan DOM vs network untuk `ambil`;
- mode perilaku untuk `tampilkan`;
- type hints minimal dan default parameter;
- aturan konflik operator, event, dan scope yang lebih formal;
- kontrak error yang lebih ketat;
- rincian implementasi yang cukup untuk langsung memulai pembuatan engine.

---

## Daftar Isi

1. Prinsip Dasar
2. Notasi Grammar
3. Lapisan 1 — Leksikal (Token)
4. Lapisan 2 — Struktur dan Fondasi Ekspresi
5. Lapisan 3 — Perilaku
6. Lapisan 4 — Logika
7. Lapisan 5 — Data, Reaktivitas, dan Turunan
8. Lapisan 6 — Komponen
9. Lapisan 7 — Jaringan
10. Lapisan 8 — Alias Properti Indonesia
11. Lapisan 9 — Interop JavaScript
12. Sistem Komentar dan DocString
13. Aturan Prioritas, Resolusi Ambiguitas, dan Scope
14. Tabel Token Lengkap
15. Contoh Program Lengkap
16. Catatan Implementasi Parser dan Compiler

---

## 1. Prinsip Dasar

### 1.1 Filosofi Bahasa

```text
Karsa adalah bahasa DSL berbasis teks yang dikompilasi menjadi
Vanilla JavaScript DOM API murni.

Tidak ada Virtual DOM.
Tidak ada eval().
Tidak ada new Function().
Hanya AST -> DOM API langsung.
```

### 1.2 Jaminan Inti Karsa

```text
[1] Setiap ekspresi Karsa memiliki padanan runtime yang tegas.
[2] Tidak ada akses ke konteks global yang tidak dideklarasikan, kecuali melalui "langsung:".
[3] Semua komentar `--?` terikat ke node AST berikutnya.
[4] Setiap error menunjuk ke baris dan kolom yang tepat.
[5] Output JS dari kompilasi dapat berjalan tanpa `karsa.js`.
[6] Reaktivitas bersifat deterministik dan terbatch.
[7] Komponen memiliki lifecycle yang jelas dan dapat dibersihkan.
```

### 1.3 Aturan Penulisan Dasar

```text
- Semua kata kunci Karsa: huruf kecil semua
- Indentasi: 2 spasi per level, tidak boleh tab
- Encoding: UTF-8
- Baris baru: LF (`\n`)
- Case sensitive: YA
- Nama variabel: bebas, tetapi tidak boleh sama dengan kata kunci
- Nama komponen: wajib diawali huruf kapital
- Semua keyword bersifat longest-match saat dileksikalisasi
```

### 1.4 Filosofi Desain Runtime

Karsa diposisikan sebagai DSL yang:

- mudah dibaca oleh pemula;
- cukup ketat untuk dianalisis statik;
- cukup langsung untuk dikompilasi ke DOM API tanpa lapisan abstraksi besar;
- cukup ekspresif untuk UI, event, reaktivitas, dan fetch;
- tetap punya escape hatch untuk JavaScript mentah.

---

## 2. Notasi Grammar

Spesifikasi ini menggunakan EBNF yang disederhanakan.

```ebnf
::=     berarti "didefinisikan sebagai"
|       berarti "atau"
[ ]     berarti "opsional"
{ }     berarti "nol atau lebih kali"
( )     berarti "pengelompokan"
"..."   berarti literal teks
...     berarti rentang karakter
KAPITAL berarti nama token terminal
kecil   berarti nama aturan non-terminal
+       berarti "satu atau lebih kali" (dipakai setelah { } atau simbol)
```

---

## 3. Lapisan 1 — Leksikal (Token)

### 3.1 Whitespace dan Baris

```ebnf
SPASI         ::= " "
TAB           ::= "\t"
BARIS_BARU    ::= "\n" | "\r\n"
INDENTASI     ::= SPASI SPASI

whitespace    ::= { SPASI | TAB }

-- Whitespace di dalam baris diabaikan kecuali untuk indentasi di awal baris
```

Aturan indentasi:

- satu level indentasi = tepat 2 spasi;
- indentasi campuran spasi dan tab tidak valid;
- dedent harus konsisten dengan stack indentasi;
- parser wajib melaporkan baris dan kolom saat indentasi tidak cocok.

### 3.2 Komentar

```ebnf
komentar_biasa  ::= "--!" { karakter_apapun } BARIS_BARU
                  | "--!" "[[" { karakter_apapun } "]]"

komentar_doc    ::= "--?" { karakter_apapun } BARIS_BARU
                  | "--?" "[[" { karakter_apapun } "]]"
```

Perilaku komentar:

- `--!` diabaikan oleh compiler;
- `--?` menjadi DocString AST;
- beberapa `--?` berturut-turut digabung;
- `--?` yang tidak diikuti node valid menghasilkan warning;
- DocString dapat dipakai untuk `title`, metadata tooling, dan bantuan dev.

### 3.3 Literal

```ebnf
LITERAL_TEKS    ::= '"' { karakter_bukan_kutip } '"'
                  | "'" { karakter_bukan_kutip_tunggal } "'"

LITERAL_ANGKA   ::= digit { digit } [ "." digit { digit } ]
                  | "-" digit { digit } [ "." digit { digit } ]

LITERAL_BOOLEAN ::= "benar" | "salah"

LITERAL_KOSONG  ::= "kosong"

digit           ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
```

Semantik literal:

- `benar` -> boolean `true`
- `salah` -> boolean `false`
- `kosong` -> `null` pada output JS
- string tetap string; tidak ada interpolasi otomatis kecuali melalui ekspresi teks

### 3.4 Identifier

```ebnf
IDENTIFIER      ::= huruf { huruf | digit | "_" }

huruf           ::= "a"..."z" | "A"..."Z"
                  | huruf_indonesia
```

Aturan identifier:

- tidak boleh sama dengan keyword;
- boleh PascalCase, camelCase, snake_case;
- `NAMA_KOMPONEN` wajib diawali huruf kapital;
- identifier dapat mengandung huruf beraksen yang masih valid sebagai huruf.

### 3.5 Selektor Elemen

```ebnf
SELEKTOR        ::= TAG_HTML [ id_selector ] { class_selector } { atribut_selector }

TAG_HTML        ::= "div" | "span" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
                  | "input" | "tombol" | "form" | "img" | "a" | "ul" | "ol" | "li"
                  | "tabel" | "header" | "footer" | "main" | "section" | "artikel"
                  | "nav" | "aside" | "video" | "audio" | "kanvas" | "label"
                  | "textarea" | "pilihan" | "opsi"
                  | "fragmen"
                  | IDENTIFIER

id_selector     ::= "#" IDENTIFIER
class_selector  ::= "." IDENTIFIER
atribut_selector ::= "[" IDENTIFIER "=" LITERAL_TEKS "]"
```

Alias tag:

- `tombol` -> `<button>`
- `pilihan` -> `<select>`
- `opsi` -> `<option>`
- `artikel` -> `<article>`
- `kanvas` -> `<canvas>`
- `fragmen` -> `DocumentFragment`

Catatan:

- tag HTML yang bukan alias dipakai apa adanya;
- `fragmen` dipakai untuk multi-root dalam komponen atau blok konten yang butuh fragment;
- selector string CSS tetap didukung pada target tertentu.

### 3.6 Operator dan Simbol Khusus

```ebnf
PANAH           ::= "->"
TITIK_DUA       ::= ":"
KOMA            ::= ","
TITIK           ::= "."
PLUS            ::= "+"
SAMA_DENGAN     ::= "="
```

Kata operator:

```ebnf
SAMA_DENGAN_KATA     ::= "sama dengan"
TIDAK_SAMA_KATA      ::= "tidak sama dengan"
LEBIH_DARI           ::= "lebih dari"
KURANG_DARI          ::= "kurang dari"
SAMA_ATAU_LEBIH      ::= "paling sedikit"
SAMA_ATAU_KURANG     ::= "paling banyak"
ADA_DI               ::= "ada di"
TIDAK_ADA_DI         ::= "tidak ada di"
BUKAN_UNARY          ::= "bukan"
```

Aturan operator:

- `bukan` diperlakukan sebagai negasi unary;
- ketaksamaan binary memakai `tidak sama dengan`;
- keyword boolean `atau` hanya dipakai sebagai operator logika;
- lexer harus melakukan longest-match sehingga `jika tidak` tidak pecah menjadi dua token yang mengacaukan parse chain.

### 3.7 Kata Kunci

Kata kunci tidak boleh dipakai sebagai identifier:

```text
buat tampilkan sembunyikan hapus kosongkan
ketika saat lalu setelah
jika jika tidak kalau ulangi selama
berhenti lewati kembalikan
data turunan simpan ambil tetap ubah sisipkan
komponen gunakan dengan di fragmen
fungsi jalankan dari ke
perbarui tambahkan kurangi arahkan muat ulang kembali
berhasil gagal selalu langsung
benar salah kosong dan atau bukan
```

Tambahan v0.3.0:

- `turunan` = computed/derived state
- `fragmen` = fragment node
- `saat` tetap dipakai untuk watcher reaktif
- `langsung` tetap dipakai untuk JS raw block

Tambahan v0.3.1:

- `sisipkan` = operasi append eksplisit untuk array
- `jalankan` = pemanggilan fungsi JS eksternal / global

---

## 4. Lapisan 2 — Struktur dan Fondasi Ekspresi

### 4.0 Fondasi Ekspresi (Grammar Foundations)

Bagian ini mendefinisikan non-terminal inti yang dipakai di seluruh lapisan lain. Semua rule di bawah ini **wajib diimplementasikan sebelum layer lainnya dapat diparse dengan benar**.

#### 4.0.1 Nilai (nilai)

`nilai` adalah atom operand terkecil yang bisa muncul sebagai operand dalam ekspresi, kondisi, atau assignment.

```ebnf
nilai ::= LITERAL_TEKS
        | LITERAL_ANGKA
        | LITERAL_BOOLEAN
        | LITERAL_KOSONG
        | pemanggilan_native
        | akses_properti
        | IDENTIFIER
```

Aturan resolusi:

- parser mencoba `pemanggilan_native` sebelum `akses_properti` sebelum `IDENTIFIER` (longest-match);
- `LITERAL_BOOLEAN` (`benar`/`salah`) dikenali sebelum `IDENTIFIER`;
- `LITERAL_KOSONG` (`kosong`) dikenali sebelum `IDENTIFIER`;
- `akses_properti` dengan satu segmen (`hanya IDENTIFIER`) identik dengan `IDENTIFIER` — keduanya valid.

#### 4.0.2 Akses Properti (akses_properti)

```ebnf
akses_properti ::= IDENTIFIER { "." IDENTIFIER }
```

Contoh valid:

```ks
pengguna.nama
hasilnya.token
daftarBelanja.panjang
a.b.c.d
```

Aturan:

- kedalaman akses tidak dibatasi oleh grammar, tetapi dibatasi oleh ketersediaan properti saat runtime;
- `.indeks` pada konteks iterasi adalah properti virtual yang diinjeksi compiler;
- alias properti Indonesia (Section 10) diselesaikan saat fase Resolver, bukan Lexer;
- akses properti pada `LITERAL_TEKS` atau `LITERAL_ANGKA` tidak valid — compiler wajib error.

#### 4.0.3 Pemanggilan Fungsi Karsa (pemanggilan_native)

`pemanggilan_native` adalah pemanggilan langsung fungsi yang didefinisikan dengan keyword `fungsi` di dalam file Karsa yang sama.

```ebnf
pemanggilan_native ::= IDENTIFIER "(" [ daftar_argumen ] ")"

daftar_argumen     ::= nilai { "," nilai }
```

Contoh:

```ks
hitungTotal(harga, jumlah)
hapusItem(indeks)
validasiEmail(emailKu)
format(angka, 2)
```

Aturan:

- `IDENTIFIER` harus merujuk ke fungsi yang dideklarasikan dengan `fungsi`;
- resolver wajib error bila identifier tidak dikenali sebagai fungsi;
- berbeda dari `jalankan` (Section 11.2) yang untuk fungsi JS eksternal/global;
- `pemanggilan_native` boleh muncul sebagai `aksi_tunggal`, di dalam `blok_aksi`, atau sebagai `nilai` (saat fungsi mengembalikan nilai).

#### 4.0.4 Ekspresi Aritmatika (ekspresi_aritmatika)

```ebnf
ekspresi_aritmatika ::= nilai operator_aritmatika nilai
                      | "(" ekspresi_aritmatika ")" operator_aritmatika nilai
                      | nilai operator_aritmatika "(" ekspresi_aritmatika ")"

operator_aritmatika ::= "+" | "-" | "*" | "/"
```

Aturan:

- operator `+` pada string = konkatenasi (sama dengan ekspresi teks);
- operator `+`, `-`, `*`, `/` pada angka = aritmatika numerik biasa;
- tidak ada operator modulo atau eksponensial di level grammar Karsa; gunakan `langsung:` bila diperlukan;
- precedence: `*` dan `/` lebih kuat dari `+` dan `-`; tanda kurung mengoverride;
- pembagian dengan nol menghasilkan runtime error, bukan compile error.

#### 4.0.5 Ekspresi Turunan (ekspresi_turunan)

Dipakai khusus untuk body deklarasi `turunan`.

```ebnf
ekspresi_turunan ::= nilai
                   | ekspresi_aritmatika
                   | ekspresi_teks
                   | pemanggilan_native
```

Aturan:

- `ekspresi_turunan` tidak boleh mengandung side-effect (tidak boleh `simpan`, `perbarui`, `tampilkan`, dsb.);
- compiler wajib error bila `ekspresi_turunan` berisi aksi imperatif;
- dependensi dilacak otomatis dari semua `nilai` yang merupakan `data` reaktif.

#### 4.0.6 Nilai Awal (nilai_awal)

Dipakai pada deklarasi `data`, `tetap`, `ubah`, parameter default komponen, dan parameter default fungsi.

```ebnf
nilai_awal ::= LITERAL_TEKS
             | LITERAL_ANGKA
             | LITERAL_BOOLEAN
             | LITERAL_KOSONG
             | IDENTIFIER
             | akses_properti
             | objek_literal
             | array_literal
             | ekspresi_aritmatika
```

#### 4.0.7 Objek Literal (objek_literal)

```ebnf
objek_literal ::= "{" [ isi_objek ] "}"

isi_objek ::= entri_objek { "," entri_objek }

entri_objek ::= IDENTIFIER ":" nilai_awal
              | LITERAL_TEKS ":" nilai_awal
              | IDENTIFIER
```

Bentuk `IDENTIFIER` tanpa titik dua adalah **shorthand** — nama properti = nama variabel, mengikuti ES6 object shorthand.

Contoh:

```ks
data pengguna = { nama: "Budi", skor: 0, aktif: benar }
data payload = { emailKu, sandiKu }     -- shorthand
data config = { "api-url": "/api/v1" }  -- kunci string
```

#### 4.0.8 Array Literal (array_literal)

```ebnf
array_literal ::= "[" [ nilai_awal { "," nilai_awal } ] "]"
```

Contoh:

```ks
data keranjang = []
data menu = ["Beranda", "Tentang", "Kontak"]
data skor = [10, 20, 30]
```

---

### 4.1 Pernyataan, Blok, dan Aksi

#### 4.1.1 Blok Aksi (blok_aksi)

`blok_aksi` adalah satu atau lebih pernyataan yang ditulis pada baris baru dengan satu level indentasi lebih dalam dari baris pemanggilnya.

```ebnf
blok_aksi ::= BARIS_BARU ( INDENTASI pernyataan BARIS_BARU )+
```

Aturan:

- setiap pernyataan dalam blok ditulis pada baris tersendiri;
- semua baris dalam satu blok harus memiliki level indentasi yang sama;
- blok berakhir saat dedent ke level indentasi sebelumnya terdeteksi;
- blok kosong tidak valid — minimal satu pernyataan wajib ada.

#### 4.1.2 Aksi Tunggal (aksi_tunggal)

`aksi_tunggal` adalah satu pernyataan yang ditulis pada baris yang sama setelah operator `->`.

```ebnf
aksi_tunggal ::= pernyataan_buat
               | pernyataan_tampilkan
               | pernyataan_sembunyikan
               | pernyataan_hapus
               | pernyataan_kosongkan
               | pernyataan_perbarui
               | pernyataan_simpan
               | pernyataan_tambahkan
               | pernyataan_kurangi
               | pernyataan_sisipkan
               | pernyataan_arahkan
               | pernyataan_muat_ulang
               | pernyataan_kembali
               | pernyataan_kembalikan
               | pernyataan_berhenti
               | pemanggilan_native
               | pemanggilan_fungsi
```

Aturan:

- `aksi_tunggal` tidak boleh diikuti `lalu` pada baris yang sama; chaining `lalu` hanya valid di `blok_aksi`;
- bila aksi membutuhkan sub-blok sendiri (`ambil dari`, `jika`, `ulangi`), gunakan `blok_aksi`.

#### 4.1.3 Pernyataan (pernyataan)

`pernyataan` adalah semua bentuk ekspresi yang valid sebagai satu unit eksekusi di dalam `blok_aksi`.

```ebnf
pernyataan ::= pernyataan_buat
             | pernyataan_tampilkan
             | pernyataan_sembunyikan
             | pernyataan_hapus
             | pernyataan_kosongkan
             | pernyataan_perbarui
             | pernyataan_simpan
             | pernyataan_tambahkan
             | pernyataan_kurangi
             | pernyataan_sisipkan
             | pernyataan_ketika
             | pernyataan_jika
             | pernyataan_ulangi
             | pernyataan_selama
             | pernyataan_berhenti
             | pernyataan_lewati
             | pernyataan_kembalikan
             | pernyataan_data
             | pernyataan_tetap
             | pernyataan_ubah
             | pernyataan_turunan
             | pernyataan_saat
             | pernyataan_ambil_dom
             | pernyataan_ambil_luar
             | pernyataan_arahkan
             | pernyataan_muat_ulang
             | pernyataan_kembali
             | pernyataan_gunakan
             | pernyataan_setelah
             | pemanggilan_native
             | pemanggilan_fungsi
             | rantai_aksi
             | blok_langsung
```

---

### 4.2 Pernyataan Buat

```ebnf
pernyataan_buat  ::= "buat" SELEKTOR [ blok_properti | properti_inline ]

properti_inline   ::= "->" { pasangan_properti }

blok_properti     ::= BARIS_BARU { INDENTASI pasangan_properti BARIS_BARU }
                    | BARIS_BARU { INDENTASI pernyataan_buat BARIS_BARU }
                    | BARIS_BARU { INDENTASI pernyataan BARIS_BARU }

pasangan_properti ::= kunci_properti ":" nilai_properti
                    | kunci_properti ":" nilai_properti KOMA pasangan_properti
```

Kunci properti dasar:

```ebnf
kunci_properti ::= "teks" | "html" | "nilai" | "gaya" | "kelas"
                 | "src" | "href" | "alt" | "tipe" | "nama"
                 | "placeholder" | "id" | "title"
                 | "data-" IDENTIFIER
                 | IDENTIFIER
```

Nilai properti:

```ebnf
nilai_properti ::= LITERAL_TEKS | LITERAL_ANGKA | LITERAL_BOOLEAN
                 | LITERAL_KOSONG
                 | IDENTIFIER
                 | akses_properti
                 | ekspresi_teks
```

Semantik `buat`:

- membuat node DOM sesuai selector;
- properti diterapkan setelah node dibuat;
- child node dari blok di-append ke node induk;
- `title` dari DocString `--?` diterapkan bila tersedia;
- atribut `data-...` menjadi `dataset`.

### 4.3 Ekspresi Teks

```ebnf
ekspresi_teks   ::= LITERAL_TEKS { "+" nilai_properti }
                  | nilai_properti { "+" nilai_properti }
```

Aturan:

- semua operand dikonversi ke string secara eksplisit saat lowering;
- ekspresi teks tidak melakukan evaluasi HTML;
- `html` digunakan jika memang ingin konten HTML mentah.

Contoh:

```ks
teks: "Halo, " + namaPengguna + "!"
teks: "Total: Rp" + hargaTotal
```

### 4.4 Pernyataan Tampilkan

```ebnf
pernyataan_tampilkan ::= "tampilkan" target_tampilkan [ "di" target_muat ] [ opsi_tampilkan ]

target_tampilkan ::= SELEKTOR
                   | LITERAL_TEKS
                   | IDENTIFIER
                   | "pesan" LITERAL_TEKS
                   | "pesan-error" LITERAL_TEKS
                   | "notifikasi" LITERAL_TEKS

target_muat ::= LITERAL_TEKS | IDENTIFIER | SELEKTOR

opsi_tampilkan ::= "dengan" "mode" ":" mode_tampilkan

mode_tampilkan ::= "tambahkan"
                 | "ganti"
                 | "awalan"
                 | "sebelum"
                 | "sesudah"
```

Semantik default:

- tanpa opsi mode, `tampilkan` berarti append ke target;
- `ganti` berarti `replaceChildren(...)`;
- `awalan` berarti prepend;
- `sebelum` dan `sesudah` memetakan ke insertion point sibling;
- jika target sudah ada di DOM, perilaku ditentukan oleh mode.

Contoh:

```ks
tampilkan div#kartu di "#kontainer"
tampilkan pesan "Data berhasil disimpan!"
tampilkan pesan-error "Terjadi kesalahan"
tampilkan notifikasi "Tersimpan ✓"
tampilkan KartuProfil di "#app" dengan mode: "ganti"
```

### 4.5 Pernyataan Sembunyikan, Hapus, Kosongkan

```ebnf
pernyataan_sembunyikan ::= "sembunyikan" target_elemen
pernyataan_hapus       ::= "hapus" target_elemen
pernyataan_kosongkan    ::= "kosongkan" target_elemen

target_elemen ::= SELEKTOR | LITERAL_TEKS | IDENTIFIER
```

Semantik:

- `sembunyikan` -> `style.display = "none"`
- `hapus` -> `remove()`
- `kosongkan` -> `replaceChildren()` / reset isi

### 4.6 Pernyataan Perbarui

```ebnf
pernyataan_perbarui ::= "perbarui" kunci_properti target_elemen "->" nilai_properti
```

Contoh:

```ks
perbarui teks "#angka" -> hitungan
perbarui html "#konten" -> templateBaru
perbarui nilai input#nama -> ""
perbarui kelas div#kotak -> "aktif"
```

Semantik:

- `perbarui teks` -> update `innerText`
- `perbarui html` -> update `innerHTML`
- `perbarui nilai` -> update `.value`
- `perbarui kelas` -> replace class string, bukan merge otomatis
- update dilakukan pada node yang sudah ada

---

## 5. Lapisan 3 — Perilaku

### 5.1 Pernyataan Ketika (Event Listener)

```ebnf
pernyataan_ketika ::= "ketika" target_event nama_event ":"
                      blok_aksi
                    | "ketika" target_event nama_event "->" aksi_tunggal
                    | "ketika" nama_event ":"
                      blok_aksi
                    | "ketika" nama_event "->" aksi_tunggal

target_event ::= SELEKTOR | LITERAL_TEKS | IDENTIFIER
               | "halaman"
               | "form" IDENTIFIER

nama_event   ::= "diklik"
               | "diketik"
               | "disubmit"
               | "dimuat"
               | "diubah"
               | "difokus"
               | "ditinggal"
               | "ditekan"
               | "dilepas"
               | "diarahkan"
               | "ditinggal-kursor"
               | "digulir"
               | "dipasang"
               | "dilepas-dari-dom"
```

Aturan **self-reference** (v0.3.1):

- bila `ketika` ditulis **tanpa target** di dalam blok `buat` atau `komponen`, event listener diikat ke elemen yang sedang dibuat (parent node terdekat dalam AST);
- self-reference hanya valid di dalam blok `buat` atau blok `komponen` yang punya root node tunggal;
- self-reference di luar konteks `buat` adalah error compile-time [E5001].

Pemetaan event:

- `diklik` -> `click`
- `diketik` -> `input`
- `disubmit` -> `submit`
- `dimuat` -> `load`
- `diubah` -> `change`
- `difokus` -> `focus`
- `ditinggal` -> `blur`
- `ditekan` -> `keydown`
- `dilepas` -> `keyup`
- `diarahkan` -> `mouseenter`
- `ditinggal-kursor` -> `mouseleave`
- `digulir` -> `scroll`

Aturan khusus `disubmit`:

- default: compiler menyisipkan `preventDefault()`;
- bila user ingin perilaku bawaan browser, gunakan opsi eksplisit:
  `ketika form#login disubmit dengan izinkan-default: benar:`
- tanpa override, form tidak melakukan reload halaman.

Aturan khusus `diketik` dan `ditekan`:

- `diketik` adalah event `input`, cocok untuk validasi teks langsung;
- `ditekan` adalah `keydown`, cocok untuk deteksi Enter, Escape, dan shortcut;
- `dilepas` adalah `keyup`.

### 5.2 Chaining Aksi

```ebnf
rantai_aksi ::= aksi { "lalu" aksi }
```

Aturan:

- `lalu` mengeksekusi aksi berikutnya setelah aksi sebelumnya selesai;
- untuk aksi sinkron, eksekusi berurutan;
- untuk aksi async, urutan bergantung pada promise chain;
- `lalu` tidak menggantikan kontrol alur async yang eksplisit.

Contoh:

```ks
kosongkan input#pesan
  lalu tampilkan notifikasi "Terkirim!"
  lalu sembunyikan div#loading
```

### 5.3 Aksi Setelah

```ebnf
pernyataan_setelah ::= "setelah" IDENTIFIER "selesai" ":"
                       blok_aksi
                     | "setelah" IDENTIFIER "selesai" "->" aksi_tunggal
```

Aturan:

- `IDENTIFIER` pada `setelah` harus merujuk pada operasi async yang dikenal compiler;
- `setelah` tidak boleh ambigu dengan identifier biasa karena harus selalu mengikuti kata `selesai`;
- callback `berhasil`, `gagal`, dan `selalu` di network call menggunakan mekanisme ini secara implisit.

### 5.4 Lifecycle Komponen

```ebnf
pernyataan_saat_dipasang ::= "saat" "komponen" "dipasang" ":"
                             blok_aksi

pernyataan_saat_diperbarui ::= "saat" "komponen" "diperbarui" ":"
                               blok_aksi

pernyataan_saat_dilepas  ::= "saat" "komponen" "dilepas" ":"
                             blok_aksi
```

Kegunaan:

- `dipasang`: memasang event listener, memulai timer, fetch data awal;
- `diperbarui`: merespons perubahan props dari luar;
- `dilepas`: membersihkan subscription, membatalkan request, mencegah memory leak.

Catatan: hook lifecycle ini identik dengan yang didefinisikan di Section 8.5 — keduanya merujuk rule yang sama.

---

## 6. Lapisan 4 — Logika

### 6.1 Percabangan Jika

```ebnf
pernyataan_jika ::= "jika" kondisi ":"
                    blok_aksi
                    { "kalau" kondisi ":"
                      blok_aksi }
                    [ "jika tidak" ":"
                      blok_aksi ]
```

Aturan:

- `kalau` adalah else-if chain;
- `jika tidak` adalah else final;
- `jika` dan `kalau` boleh dipakai dalam satu rantai;
- `jika tidak` hanya boleh sekali di akhir rantai.

### 6.2 Kondisi

```ebnf
kondisi ::= ekspresi_kondisi { ("dan" | "atau") ekspresi_kondisi }

ekspresi_kondisi ::= nilai "kosong"
                   | nilai "tidak kosong"
                   | nilai "sama dengan" nilai
                   | nilai "tidak sama dengan" nilai
                   | nilai "lebih dari" nilai
                   | nilai "kurang dari" nilai
                   | nilai "paling sedikit" nilai
                   | nilai "paling banyak" nilai
                   | nilai "ada di" nilai
                   | nilai "tidak ada di" nilai
                   | IDENTIFIER
                   | "bukan" IDENTIFIER
                   | "bukan" "(" kondisi ")"
```

Aturan interpretasi:

- `bukan X` adalah negasi unary;
- `tidak sama dengan` dipakai untuk ketaksamaan binary;
- `atau` hanya operator boolean;
- `dan` dan `atau` memiliki precedence biasa: `dan` lebih kuat daripada `atau`, kecuali dikelompokkan dengan tanda kurung;
- string/angka/boolean dibandingkan sesuai coercion yang ditentukan compiler; bila ambigu, compiler boleh mengeluarkan warning.

### 6.3 Perulangan Ulangi

```ebnf
pernyataan_ulangi ::= "ulangi" IDENTIFIER "dari" sumber_data ":"
                      blok_aksi
                    | "ulangi" LITERAL_ANGKA "kali" ":"
                      blok_aksi
                    | "ulangi" IDENTIFIER "dari" LITERAL_ANGKA "sampai" LITERAL_ANGKA ":"
                      blok_aksi
```

Sumber data:

```ebnf
sumber_data ::= IDENTIFIER
              | rentang_angka

rentang_angka ::= LITERAL_ANGKA "sampai" LITERAL_ANGKA
```

Aturan iterasi:

- pada `ulangi produk dari semuaProduk`, variabel `produk` mewakili item saat ini;
- compiler menyediakan properti virtual `.indeks` dan `.nilai` saat item berasal dari array/iterable yang relevan;
- jika iterasi dari objek, mode enumerasi harus didefinisikan oleh compiler atau runtime helper;
- `berhenti` dan `lewati` hanya valid di dalam konteks perulangan.

### 6.4 Perulangan Selama

```ebnf
pernyataan_selama ::= "selama" kondisi ":"
                      blok_aksi
```

Aturan:

- selama kondisi bernilai truthy, blok dieksekusi;
- untuk loop async, compiler harus mencegah blocking yang tidak disengaja;
- `berhenti` mengakhiri loop;
- `lewati` melompat ke iterasi berikutnya.

### 6.5 Berhenti, Lewati, dan Kembalikan

```ebnf
pernyataan_berhenti   ::= "berhenti"
pernyataan_lewati     ::= "lewati"
pernyataan_kembalikan ::= "kembalikan" [ nilai ]
```

Aturan:

- `berhenti` valid di dalam `ulangi`, `selama`, **atau blok event handler** (`ketika`);
  - di dalam loop: menghentikan iterasi (dikompilasi menjadi `break`);
  - di dalam event handler: mengakhiri eksekusi handler lebih awal (dikompilasi menjadi `return`);
- `lewati` hanya valid di dalam `ulangi` atau `selama` (dikompilasi menjadi `continue`);
- `kembalikan` valid di dalam `fungsi` dan blok yang secara semantik mengembalikan nilai;
- `kembalikan` tanpa nilai dikompilasi menjadi `return;`;
- `berhenti` di dalam `fungsi` (bukan handler dan bukan loop) adalah error [E6001]; gunakan `kembalikan` untuk itu.

---

## 7. Lapisan 5 — Data, Reaktivitas, dan Turunan

### 7.1 Deklarasi Data Reaktif

```ebnf
pernyataan_data ::= "data" IDENTIFIER [ ":" tipe_data ] "=" nilai_awal
```

Semantik:

- `data` menghasilkan state reaktif;
- state bersifat deep reactive by default;
- perubahan di dalam nested object/array ikut terdeteksi;
- pembacaan dalam efek/watcher membentuk dependensi.

Contoh:

```ks
data hitungan = 0
data nama = "Budi"
data keranjang = []
data pengguna = { nama: "Budi", aktif: benar, skor: 0 }
```

### 7.2 Variabel Tetap dan Ubah

```ebnf
pernyataan_tetap ::= "tetap" IDENTIFIER [ ":" tipe_data ] "=" nilai_awal
pernyataan_ubah  ::= "ubah" IDENTIFIER [ ":" tipe_data ] "=" nilai_awal
```

Semantik:

- `tetap` -> `const`
- `ubah` -> `let`
- keduanya non-reaktif kecuali nilainya di-wrap manual lewat `data`

### 7.3 Type System Minimal

Type system Karsa bersifat ringan, opsional, dan ditujukan untuk validasi serta tooling.

```ebnf
tipe_data ::= "teks"
            | "angka"
            | "benar-salah"
            | "objek"
            | "array"
            | "elemen"
            | "fungsi"
            | "apapun"
            | IDENTIFIER
```

Aturan:

- type hint boleh dipakai pada `data`, `tetap`, `ubah`, parameter fungsi, parameter komponen, dan default props;
- type hint tidak wajib;
- compiler boleh memberi warning bila nilai default tidak cocok dengan type hint;
- type hint tidak wajib menghasilkan runtime validator, tetapi validator boleh disediakan di mode dev.

### 7.4 Turunan / Computed State

```ebnf
pernyataan_turunan ::= "turunan" IDENTIFIER [ ":" tipe_data ] "=" ekspresi_turunan
```

Semantik:

- `turunan` adalah state baca-saja yang dihitung dari state lain;
- dependensi dilacak otomatis;
- ketika dependensi berubah, nilai turunan ikut dihitung ulang;
- `turunan` tidak boleh di-assign langsung.

Contoh:

```ks
data harga = 10000
data jumlah = 2
turunan total = harga * jumlah
```

### 7.5 Operasi Data

```ebnf
pernyataan_simpan    ::= "simpan" nilai "ke" IDENTIFIER
                       | IDENTIFIER "=" nilai

pernyataan_tambahkan ::= "tambahkan" nilai "ke" IDENTIFIER
pernyataan_kurangi   ::= "kurangi" IDENTIFIER [ "dengan" nilai ]
```

Aturan semantik:

- `simpan` melakukan assignment langsung;
- `tambahkan` mengikuti tipe target:
  - number -> penjumlahan numerik;
  - array -> append item;
  - string -> concatenation bila memang dipakai eksplisit;
- `kurangi` mengikuti tipe target:
  - number -> pengurangan numerik;
  - array/string tidak otomatis dikurangi kecuali compiler memiliki helper khusus;
- bila jenis operand ambigu, compiler wajib memberi warning atau error yang jelas.

Untuk mengurangi ambiguitas, v0.3.0 mengizinkan alias opsional:

```ebnf
pernyataan_sisipkan ::= "sisipkan" nilai "ke" IDENTIFIER
```

Semantik `sisipkan` khusus untuk array, selalu append atau insert sesuai helper yang dipilih compiler.

### 7.6 Watcher Reaktif

```ebnf
pernyataan_saat ::= "saat" IDENTIFIER "berubah" ":"
                    blok_aksi
```

Aturan reaktivitas:

- watcher memantau perubahan state reaktif;
- watcher dieksekusi secara batched dalam satu microtask flush;
- perubahan berantai dalam satu tick tidak memicu watcher berulang kali secara redundan;
- jika watcher mengubah state yang sama, perubahan baru masuk batch berikutnya;
- nested property mutation pada data deep reactive juga memicu watcher yang relevan.

Contoh:

```ks
saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
  jika hitungan lebih dari 99:
    tampilkan "#peringatan"
    simpan 99 ke hitungan
```

### 7.7 Pengambilan Nilai dari DOM

```ebnf
pernyataan_ambil_dom ::= "ambil" jenis_ambil "dari" sumber_ambil
                          "->" "simpan" "ke" IDENTIFIER

jenis_ambil ::= "nilai"
              | "teks"
              | "html"
              | "tinggi"
              | "lebar"
              | "atribut" LITERAL_TEKS
```

Pemetaan:

- `nilai` -> `.value`
- `teks` -> `.innerText`
- `html` -> `.innerHTML`
- `tinggi` -> `.offsetHeight`
- `lebar` -> `.offsetWidth`
- `atribut "x"` -> `.getAttribute("x")`

Catatan:

- `tinggi` dan `lebar` memakai ukuran layout box, bukan murni content box;
- bila developer ingin content box atau style box, gunakan `langsung:` atau helper eksplisit.

---

## 8. Lapisan 6 — Komponen

### 8.1 Definisi Komponen

```ebnf
pernyataan_komponen ::= "komponen" NAMA_KOMPONEN "(" [ daftar_parameter ] ")" [ "->" tipe_data ] ":"
                        blok_konten

daftar_parameter ::= parameter { "," parameter }

parameter ::= IDENTIFIER [ ":" tipe_data ] [ "=" nilai_awal ]
```

Aturan komponen:

- nama komponen wajib diawali huruf kapital;
- parameter tersedia sebagai variabel lokal di dalam komponen;
- parameter boleh punya type hint;
- parameter boleh punya default value;
- komponen secara default menghasilkan satu root node;
- bila body menghasilkan beberapa root tanpa `fragmen`, compiler wajib error.

Contoh:

```ks
komponen KartuProduk(nama: teks, harga: angka, foto: teks = "/default.jpg"):
  buat div.kartu-produk
    buat img -> src: foto, alt: nama
    buat h3 -> teks: nama
    buat p.harga -> teks: "Rp " + harga
    buat tombol.beli -> teks: "Beli Sekarang"
      ketika diklik -> tambahkan nama ke keranjang
```

### 8.2 Fragmen

```ebnf
pernyataan_fragmen ::= "buat" "fragmen" [ "->" properti_inline ] 
```

Semantik:

- `fragmen` membuat `DocumentFragment`;
- dapat dipakai sebagai root komponen bila memang multi-root dibutuhkan;
- saat ditampilkan ke DOM, fragment tidak tetap sebagai node permanen setelah dipindah; isi fragment yang dipindah ke target.

### 8.3 Penggunaan Komponen

```ebnf
pernyataan_gunakan ::= "gunakan" NAMA_KOMPONEN
                       [ "dengan" daftar_props ]
                       [ "di" target_mount ]

daftar_props ::= pasangan_prop { "," pasangan_prop }
               | IDENTIFIER

pasangan_prop ::= IDENTIFIER ":" nilai_properti
```

Contoh:

```ks
gunakan KartuProduk
  dengan nama: "Sepatu", harga: 150000, foto: "sepatu.jpg"
  di "#daftar-produk"
```

Aturan:

- object spreading via `IDENTIFIER` didukung;
- props yang tidak dikenali oleh komponen menghasilkan error atau warning tergantung mode compiler;
- props default dipakai bila tidak diisi.

### 8.4 State Internal Komponen

```ebnf
pernyataan_state_lokal ::= "data" IDENTIFIER [ ":" tipe_data ] "=" nilai_awal
```

Aturan:

- state lokal hanya hidup selama komponen hidup;
- saat komponen dilepas, state lokal ikut dibersihkan;
- watcher lokal berhenti otomatis saat lifecycle selesai.

### 8.5 Lifecycle Komponen

Komponen memiliki lifecycle berikut:

1. mount/pasang
2. update/perbarui
3. unmount/lepas

Hook yang tersedia:

```ebnf
pernyataan_saat_dipasang ::= "saat" "komponen" "dipasang" ":"
                             blok_aksi

pernyataan_saat_diperbarui ::= "saat" "komponen" "diperbarui" ":"
                                blok_aksi

pernyataan_saat_dilepas ::= "saat" "komponen" "dilepas" ":"
                            blok_aksi
```

Aturan:

- `dipasang` dipanggil saat node root pertama kali ditambahkan ke DOM;
- `diperbarui` dipanggil saat props/state yang terikat berubah;
- `dilepas` dipanggil sebelum node dihapus dari DOM;
- hook dipakai untuk cleanup event listener, timer, dan subscription.

---

## 9. Lapisan 7 — Jaringan

### 9.1 Pengambilan Data Eksternal

```ebnf
pernyataan_ambil_luar ::= "ambil" "dari" LITERAL_TEKS [ "dengan" opsi_ambil ] ":"
                          cabang_ambil
```

Opsi:

```ebnf
opsi_ambil ::= pasangan_opsi { "," pasangan_opsi }

pasangan_opsi ::= "metode" ":" metode_http
                | "data" ":" IDENTIFIER
                | "kepala" ":" objek_literal

metode_http ::= '"GET"' | '"POST"' | '"PUT"' | '"DELETE"' | '"PATCH"'
```

Cabang:

```ebnf
cabang_ambil ::= { cabang_ambil_baris }

cabang_ambil_baris ::= INDENTASI "berhasil" "->" aksi_tunggal BARIS_BARU
                     | INDENTASI "berhasil" ":" blok_aksi
                     | INDENTASI "gagal" "->" aksi_tunggal BARIS_BARU
                     | INDENTASI "gagal" ":" blok_aksi
                     | INDENTASI "selalu" "->" aksi_tunggal BARIS_BARU
                     | INDENTASI "selalu" ":" blok_aksi
```

Variabel khusus:

- `hasilnya` -> response body yang telah diparse JSON bila memungkinkan
- `statusnya` -> HTTP status code
- `errornya` -> pesan error

Aturan:

- bila response bukan JSON valid, compiler/runtime harus menyediakan fallback string/raw response;
- `selalu` dieksekusi terlepas dari sukses atau gagal;
- `berhasil` hanya saat request sukses jaringan dan response valid sesuai mode parser;
- `gagal` mencakup network error, response non-OK, parsing error, dan abort jika tidak di-handle berbeda.

Contoh:

```ks
ambil dari "/api/produk":
  berhasil -> simpan hasilnya ke semuaProduk
  gagal -> tampilkan pesan-error "Gagal memuat produk"
  selalu -> sembunyikan div#loading
```

### 9.2 Opsi Keamanan dan Header

```ebnf
pasangan_opsi ::= "metode" ":" metode_http
                | "data" ":" IDENTIFIER
                | "kepala" ":" objek_literal
                | "kredensial" ":" LITERAL_BOOLEAN
                | "mode" ":" LITERAL_TEKS
```

Catatan:

- `kepala` adalah header fetch;
- `kredensial` dipetakan ke credentials fetch;
- `mode` dipakai untuk CORS atau mode lainnya bila diperlukan.

### 9.3 Navigasi

```ebnf
pernyataan_arahkan   ::= "arahkan" "ke" LITERAL_TEKS
pernyataan_muat_ulang ::= "muat ulang"
pernyataan_kembali   ::= "kembali"
```

Semantik:

- `arahkan ke` -> `location.assign(...)`
- `muat ulang` -> `location.reload()`
- `kembali` -> `history.back()`

---

## 10. Lapisan 8 — Alias Properti Indonesia

Alias adalah lookup compile-time. Parser tidak perlu tahu detailnya.

### 10.1 Tabel Alias Properti

| Karsa | JavaScript | Keterangan |
|---|---|---|
| `.panjang` | `.length` | Panjang array/string |
| `.nilai` | `.value` | Nilai input/select |
| `.teks` | `.innerText` | Teks terlihat |
| `.html` | `.innerHTML` | Konten HTML |
| `.tipe` | `.type` | Tipe input |
| `.nama` | `.name` | Name attribute |
| `.ditandai` | `.checked` | Checkbox/radio |
| `.nonaktif` | `.disabled` | Disabled state |
| `.indeks` | virtual index | Indeks iterasi |
| `.anak` | `.children` | Node anak |
| `.induk` | `.parentElement` | Parent element |
| `.fokus` | `.focus()` | Memanggil fokus |
| `.atribut` | `.getAttribute()` | Dipakai bersama argumen |

### 10.2 Alias yang Tidak Dibuat

Tidak dibuat alias untuk hal berikut:

- `terakhir`
- `pertama`
- `ada`
- `kosong`

Alasan:

- terlalu ambigu;
- terlalu banyak kemungkinan lowering;
- lebih baik eksplisit.

### 10.3 Aturan Alias

- alias hanya untuk hubungan yang 1-ke-1;
- alias dengan efek method harus ditandai jelas sebagai tindakan, bukan properti murni;
- bila ada nama JS asli yang lebih tepat, itu boleh dipakai langsung di `langsung:`.

---

## 11. Lapisan 9 — Interop JavaScript

### 11.1 Blok JS Langsung

```ebnf
blok_langsung ::= "langsung" ":" BARIS_BARU
                  { INDENTASI baris_js BARIS_BARU }

baris_js ::= { karakter_apapun }
```

Aturan:

- isi `langsung:` dimasukkan ke output tanpa parsing;
- gunakan seminimal mungkin;
- `langsung:` adalah escape hatch, bukan fitur utama;
- di dalam event handler, loop, atau kondisi, `langsung:` tetap boleh dipakai bila compiler belum mendukung pola tertentu.

Contoh:

```ks
langsung:
  console.log("debug info")
  window.__karsa_versi = "0.3.0"
```

### 11.2 Memanggil Fungsi JS Eksternal

`jalankan` dipakai khusus untuk memanggil fungsi yang **tidak** dideklarasikan dengan `fungsi` di dalam file Karsa — misalnya fungsi global browser, library JS yang sudah tersedia di scope window, atau helper dari file JS lain.

```ebnf
pemanggilan_fungsi ::= "jalankan" IDENTIFIER [ "(" [ daftar_argumen ] ")" ]
                     | "jalankan" IDENTIFIER "dengan" daftar_argumen
```

Aturan:

- `jalankan` adalah escape hatch menuju fungsi JS di luar Karsa;
- compiler tidak memvalidasi signature fungsi eksternal;
- bila target adalah nama global, hanya valid di mode aman yang mengizinkan akses global;
- **berbeda dari** `pemanggilan_native` (Section 4.0.3) yang memanggil fungsi `fungsi` Karsa dengan sintaks `f(x)`.

**Ringkasan perbedaan:**

| Sintaks | Dipakai untuk | Divalidasi resolver? |
|---|---|---|
| `f(x)` (`pemanggilan_native`) | fungsi `fungsi` di file Karsa | Ya |
| `jalankan f` | fungsi JS eksternal / global | Tidak |

Contoh:

```ks
-- Memanggil fungsi Karsa (resolver memvalidasi):
hitungTotal(harga, jumlah)
hapusItem(indeks)

-- Memanggil fungsi JS eksternal (tidak divalidasi):
jalankan console.log("debug")
jalankan analytics.track("klik-beli")
jalankan myLibrary.init dengan config
```

### 11.3 Definisi Fungsi

```ebnf
pernyataan_fungsi ::= "fungsi" IDENTIFIER "(" [ daftar_parameter ] ")" [ "->" tipe_data ] ":"
                      blok_aksi
```

Aturan:

- parameter boleh default dan type hint;
- `kembalikan` dipakai untuk return;
- fungsi bisa mengakses scope luar sesuai aturan lexical scope;
- fungsi boleh dipakai untuk helper, validasi, mapper, dan utilitas DOM.

Contoh:

```ks
fungsi hitungTotal(harga: angka, jumlah: angka = 1) -> angka:
  kembalikan harga * jumlah
```

---

## 12. Sistem Komentar dan DocString

### 12.1 Ringkasan

```ebnf
komentar_biasa_sebaris  ::= "--!" karakter_sampai_baris_baru
komentar_biasa_blok     ::= "--!" "[[" karakter_apapun "]]"
komentar_doc_sebaris    ::= "--?" karakter_sampai_baris_baru
komentar_doc_blok       ::= "--?" "[[" karakter_apapun "]]"
```

### 12.2 Aturan Pengikatan `--?`

1. `--?` selalu menempel ke node pertama setelah komentar.
2. Banyak `--?` berturut-turut digabung menjadi satu dokumen DocString.
3. `--?` tanpa node berikutnya -> warning.
4. DocString dapat diterjemahkan menjadi:
   - `title` HTML;
   - metadata komponen;
   - tooltip tooling;
   - bantuan dalam mode development.

---

## 13. Aturan Prioritas, Resolusi Ambiguitas, dan Scope

### 13.1 Prioritas Parsing

Urutan dasar:

```text
1. Komentar
2. Indentasi
3. Keyword awal baris
4. Selektor
5. Operator `->`
6. Titik dua `:`
7. Ekspresi nilai
```

### 13.2 Aturan Resolusi Ambiguitas

**Ambiguitas `tampilkan`:**  
default = append. Mode harus eksplisit bila perilaku lain dipakai.

**Ambiguitas `disubmit`:**  
default = `preventDefault()`.

**Ambiguitas `ambil`:**  
- `ambil nilai/teks/html/tinggi/lebar/atribut dari ...` = DOM read
- `ambil dari "/url"` = network fetch

**Ambiguitas `tambahkan`:**  
- pada angka = penjumlahan
- pada array = append
- pada string = concatenation jika diset eksplisit; bila tidak, compiler memberi warning

**Ambiguitas `bukan`:**  
- unary negation saja
- binary inequality memakai `tidak sama dengan`

**Ambiguitas `kalau` dan `atau`:**  
- `kalau` hanya untuk else-if
- `atau` hanya operator boolean
- tokenisasi harus longest-match

**Ambiguitas `ditekan` vs `diketik`:**  
- `ditekan` -> keydown
- `diketik` -> input

**Ambiguitas `indeks`:**  
- `.indeks` adalah properti virtual dari konteks iterasi
- tidak boleh dipakai sebagai properti data biasa kecuali runtime memang menyediakannya

**Ambiguitas self-reference `ketika` tanpa target (v0.3.1):**  
- `ketika diklik` tanpa target di dalam `buat` block → self-reference ke elemen yang sedang dibuat
- `ketika diklik` tanpa target di luar `buat` block → error [E5001]

**Ambiguitas `berhenti` (v0.3.1):**  
- di dalam `ulangi`/`selama` → `break`
- di dalam `ketika` (event handler) → `return` (exit handler)
- di dalam `fungsi` bukan handler → error [E6001]; gunakan `kembalikan`

**Ambiguitas panggil fungsi (v0.3.1):**  
- `f(x)` → `pemanggilan_native`; resolver memvalidasi bahwa `f` dideklarasikan dengan `fungsi`
- `jalankan f` → `pemanggilan_fungsi`; memanggil JS eksternal, tidak divalidasi

### 13.3 Aturan Scope

```text
Scope 1 — Global file:
  semua data, tetap, ubah, turunan, fungsi, komponen di level 0 indentasi

Scope 2 — Blok:
  variabel yang dideklarasikan di dalam blok hanya hidup dalam blok tersebut dan anaknya

Scope 3 — Komponen:
  variabel di dalam komponen terisolasi
  parameter otomatis tersedia
  state lokal dibersihkan saat unmount

Scope 4 — Iterasi:
  variabel iterasi hanya hidup di blok ulangi

Scope 5 — Watcher:
  binding yang dipakai watcher bersifat lexical terhadap closure yang dibentuk saat watcher dibuat
```

### 13.4 Error Kontrak

Setiap error wajib punya:

1. baris;
2. kolom;
3. pesan bahasa Indonesia;
4. penjelasan singkat;
5. saran perbaikan bila memungkinkan;
6. kode error yang stabil.

Contoh:

```text
✗ Baris 12, Kolom 3 [E1001]
Kata kunci "Buat" tidak dikenal.
Karsa menggunakan huruf kecil.
Saran: gunakan "buat".
```

```text
✗ Baris 24, Kolom 1 [E2003]
Komponen "kartuProduk" tidak valid.
Nama komponen harus diawali huruf kapital.
Saran: gunakan "KartuProduk".
```

```text
✗ Baris 8, Kolom 5 [E3002]
Indentasi tidak konsisten.
Baris ini memiliki 3 spasi, tetapi Karsa memakai 2 spasi per level.
```

---

## 14. Tabel Token Lengkap

| Token | Nilai | Kategori |
|---|---|---|
| `TK_BUAT` | `buat` | Struktur |
| `TK_TAMPILKAN` | `tampilkan` | Struktur |
| `TK_SEMBUNYIKAN` | `sembunyikan` | Struktur |
| `TK_HAPUS` | `hapus` | Struktur |
| `TK_KOSONGKAN` | `kosongkan` | Struktur |
| `TK_PERBARUI` | `perbarui` | Struktur |
| `TK_KETIKA` | `ketika` | Perilaku |
| `TK_DIKLIK` | `diklik` | Event |
| `TK_DIKETIK` | `diketik` | Event |
| `TK_DISUBMIT` | `disubmit` | Event |
| `TK_DIMUAT` | `dimuat` | Event |
| `TK_DIUBAH` | `diubah` | Event |
| `TK_DIFOKUS` | `difokus` | Event |
| `TK_DITINGGAL` | `ditinggal` | Event |
| `TK_DITEKAN` | `ditekan` | Event |
| `TK_DILEPAS` | `dilepas` | Event |
| `TK_DIARAHKAN` | `diarahkan` | Event |
| `TK_DITINGGAL_KURSOR` | `ditinggal-kursor` | Event |
| `TK_DIGULIR` | `digulir` | Event |
| `TK_DIPASANG` | `dipasang` | Lifecycle |
| `TK_DILEPAS_DARI_DOM` | `dilepas-dari-dom` | Lifecycle |
| `TK_LALU` | `lalu` | Alur |
| `TK_SETELAH` | `setelah` | Alur |
| `TK_JIKA` | `jika` | Logika |
| `TK_KALAU` | `kalau` | Logika |
| `TK_JIKA_TIDAK` | `jika tidak` | Logika |
| `TK_ULANGI` | `ulangi` | Logika |
| `TK_SELAMA` | `selama` | Logika |
| `TK_BERHENTI` | `berhenti` | Logika |
| `TK_LEWATI` | `lewati` | Logika |
| `TK_KEMBALIKAN` | `kembalikan` | Logika |
| `TK_DATA` | `data` | Data |
| `TK_TURUNAN` | `turunan` | Data |
| `TK_SIMPAN` | `simpan` | Data |
| `TK_AMBIL` | `ambil` | Data/Jaringan |
| `TK_TETAP` | `tetap` | Data |
| `TK_UBAH` | `ubah` | Data |
| `TK_TAMBAHKAN` | `tambahkan` | Data |
| `TK_SISIPKAN` | `sisipkan` | Data |
| `TK_KURANGI` | `kurangi` | Data |
| `TK_SAAT` | `saat` | Reaktif |
| `TK_BERUBAH` | `berubah` | Reaktif |
| `TK_KOMPONEN` | `komponen` | Komponen |
| `TK_GUNAKAN` | `gunakan` | Komponen |
| `TK_DENGAN` | `dengan` | Komponen |
| `TK_DI` | `di` | Target |
| `TK_DARI` | `dari` | Sumber |
| `TK_KE` | `ke` | Target |
| `TK_FUNGSI` | `fungsi` | Fungsi |
| `TK_JALANKAN` | `jalankan` | Fungsi |
| `TK_BERHASIL` | `berhasil` | Jaringan |
| `TK_GAGAL` | `gagal` | Jaringan |
| `TK_SELALU` | `selalu` | Jaringan |
| `TK_ARAHKAN` | `arahkan` | Navigasi |
| `TK_MUAT_ULANG` | `muat ulang` | Navigasi |
| `TK_KEMBALI` | `kembali` | Navigasi |
| `TK_BENAR` | `benar` | Literal |
| `TK_SALAH` | `salah` | Literal |
| `TK_KOSONG` | `kosong` | Literal |
| `TK_DAN` | `dan` | Operator |
| `TK_ATAU` | `atau` | Operator |
| `TK_BUKAN` | `bukan` | Operator |
| `TK_SAMA_DENGAN` | `sama dengan` | Operator |
| `TK_TIDAK_SAMA_DENGAN` | `tidak sama dengan` | Operator |
| `TK_LEBIH_DARI` | `lebih dari` | Operator |
| `TK_KURANG_DARI` | `kurang dari` | Operator |
| `TK_PALING_SEDIKIT` | `paling sedikit` | Operator |
| `TK_PALING_BANYAK` | `paling banyak` | Operator |
| `TK_ADA_DI` | `ada di` | Operator |
| `TK_TIDAK_ADA_DI` | `tidak ada di` | Operator |
| `TK_PANAH` | `->` | Simbol |
| `TK_TITIK_DUA` | `:` | Simbol |
| `TK_KOMA` | `,` | Simbol |
| `TK_ID` | `#nama` | Selektor |
| `TK_CLASS` | `.nama` | Selektor |
| `TK_ATRIBUT` | `[k="v"]` | Selektor |
| `TK_IDENTIFIER` | nama pengguna | Identifier |
| `TK_LITERAL_TEKS` | `"..."` | Literal |
| `TK_LITERAL_ANGKA` | `123` | Literal |
| `TK_KOMENTAR_BIASA` | `--!` | Komentar |
| `TK_KOMENTAR_DOC` | `--?` | DocString |
| `TK_LANGSUNG` | `langsung` | Interop |
| `TK_FRAGMEN` | `fragmen` | Node |
| `TK_INDENT` | 2 spasi | Whitespace |
| `TK_DEDENT` | kurang indentasi | Whitespace |
| `TK_BARIS_BARU` | `\n` | Whitespace |
| `TK_EOF` | akhir file | Control |

---

## 15. Contoh Program Lengkap

### 15.1 Counter Sederhana

```ks
--! Aplikasi penghitung sederhana

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

### 15.2 Form Login dengan Validasi dan Fetch

```ks
data sedangMemuat = salah

--? Form utama untuk login pengguna
buat div#halaman-login.terpusat
  buat h2 -> teks: "Masuk ke Akun"
  buat form#login
    buat div.kolom
      buat label -> teks: "Email"
      buat input#email[tipe="email"][placeholder="contoh@email.com"]
    buat div.kolom
      buat label -> teks: "Kata Sandi"
      buat input#sandi[tipe="password"][placeholder="Minimal 8 karakter"]
    buat tombol#btn-masuk[tipe="submit"] -> teks: "Masuk"
  buat p#pesan-error.tersembunyi

ketika form#login disubmit:
  ambil nilai dari input#email -> simpan ke emailKu
  ambil nilai dari input#sandi -> simpan ke sandiKu

  jika emailKu kosong:
    tampilkan pesan-error "Email tidak boleh kosong"
    berhenti

  jika sandiKu kosong:
    tampilkan pesan-error "Kata sandi tidak boleh kosong"
    berhenti

  jika sandiKu kurang dari 8:
    tampilkan pesan-error "Kata sandi minimal 8 karakter"
    berhenti

  simpan benar ke sedangMemuat
  perbarui teks tombol#btn-masuk -> "Memuat..."

  ambil dari "/api/login"
    dengan metode: "POST", data: { emailKu, sandiKu }:
      berhasil:
        simpan hasilnya.token ke tokenSaya
        tampilkan notifikasi "Selamat datang!"
        arahkan ke "/dashboard"
      gagal:
        tampilkan pesan-error errornya
      selalu:
        simpan salah ke sedangMemuat
        perbarui teks tombol#btn-masuk -> "Masuk"

saat sedangMemuat berubah:
  jika sedangMemuat:
    perbarui kelas tombol#btn-masuk -> "memuat"
  jika tidak:
    perbarui kelas tombol#btn-masuk -> ""
```

### 15.3 Komponen dan Daftar Dinamis

```ks
data daftarBelanja = []
data inputBaru = ""

--? Komponen satu item dalam daftar belanja
komponen ItemBelanja(nama: teks, indeks: angka):
  buat li.item-belanja
    buat span -> teks: nama
    buat tombol.hapus-item -> teks: "×"
      ketika diklik -> hapusItem(indeks)

fungsi hapusItem(i: angka):
  ubah daftarBaru = []
  ulangi item dari daftarBelanja:
    --! .indeks di sini adalah properti virtual yang diinjeksi compiler
    --! ke setiap item iterasi — bukan properti dari string itu sendiri
    jika item.indeks tidak sama dengan i:
      tambahkan item ke daftarBaru
  simpan daftarBaru ke daftarBelanja

buat div#app
  buat h1 -> teks: "Daftar Belanja"
  buat div.tambah-item
    buat input#input-item[placeholder="Nama barang..."]
    buat tombol#btn-tambah -> teks: "Tambah"
  buat ul#daftar-belanja
  buat p#pesan-kosong -> teks: "Daftar masih kosong"

ketika tombol#btn-tambah diklik:
  ambil nilai dari input#input-item -> simpan ke namaBaru
  jika namaBaru tidak kosong:
    tambahkan namaBaru ke daftarBelanja
    perbarui nilai input#input-item -> ""

ketika input#input-item ditekan:
  langsung:
    if (event.key === "Enter") {
      document.querySelector("#btn-tambah").click()
    }

saat daftarBelanja berubah:
  kosongkan ul#daftar-belanja
  ulangi item dari daftarBelanja:
    gunakan ItemBelanja
      dengan nama: item, indeks: item.indeks
      di ul#daftar-belanja
  jika daftarBelanja.panjang lebih dari 0:
    sembunyikan p#pesan-kosong
  jika tidak:
    tampilkan p#pesan-kosong
```

Catatan implementasi untuk contoh ini:

- `item.indeks` pada iterasi adalah **properti virtual** yang diinjeksi compiler — bukan properti JavaScript asli dari nilai string. Compiler membungkus setiap item iterasi dengan objek `{ nilai: item, indeks: i }` atau menggunakan closure index, sesuai strategi runtime;
- `hapusItem` menerima `i: angka` (bukan `indeks`) untuk menghindari bayangan nama dengan `.indeks` virtual.

---

## 16. Catatan Implementasi Parser dan Compiler

### 16.1 Arsitektur yang Direkomendasikan

Pipeline wajib diimplementasikan **dalam urutan berikut**. Melewati Resolver atau Analyzer akan menyebabkan compiler melakukan resolusi nama dan validasi secara ad-hoc, yang lebih sulit di-debug.

```text
karsa.js
├── Tahap 1 — Lexer
│   ├── Baca karakter per karakter
│   ├── Hasilkan stream token
│   └── Tangani indentasi -> TK_INDENT / TK_DEDENT
│
├── Tahap 2 — Parser
│   ├── Konsumsi stream token
│   ├── Hasilkan AST mentah
│   └── Tangani error dengan pesan ramah
│
├── Tahap 3 — Resolver
│   ├── Validasi nama variabel, komponen, fungsi
│   ├── Resolusi scope (global, blok, komponen, iterasi, watcher)
│   ├── Resolusi alias properti Indonesia -> JS
│   ├── Resolusi self-reference event target
│   ├── Ikat DocString ke node AST
│   └── Error bila identifier tidak dikenal
│
├── Tahap 4 — Analyzer
│   ├── Validasi type hint (opsional, warning di mode dev)
│   ├── Validasi lifecycle hook (hanya boleh dalam komponen)
│   ├── Validasi reaktivitas (turunan tidak boleh diassign)
│   ├── Validasi berhenti/lewati hanya dalam konteks yang benar
│   └── Deteksi ambiguitas yang tersisa
│
├── Tahap 5 — Compiler
│   ├── Terima AST yang sudah di-resolve dan di-analyze
│   ├── Hasilkan JS Vanilla
│   ├── Tambahkan runtime helper minimum bila perlu
│   └── Tidak pakai eval() atau new Function()
│
└── Tahap 6 — Runtime minimal
    ├── Proxy-based reactivity (deep reactive default)
    ├── Microtask batching untuk watcher
    ├── Mount/unmount lifecycle
    ├── Virtual .indeks injection untuk iterasi
    └── Error handler yang ramah pemula
```

### 16.2 Node AST yang Dibutuhkan

```text
-- Node program
Program

-- Struktur DOM
BuatNode
TampilkanNode
SembunyikanNode
HapusNode
KosongkanNode
PerbaruiNode

-- Event dan perilaku
KetikaNode          -- target bisa null (self-reference)
SaatNode            -- watcher reaktif
SetelahNode

-- Logika
JikaNode
UlangiNode
SelamaNode

-- Data
DataNode
TurunanNode
TetapNode
UbahNode
SimpanNode
TambahkanNode
KurangiNode
SisipkanNode

-- Jaringan
AmbilDomNode
AmbilLuarNode

-- Komponen
KomponenNode
GunakanNode

-- Fungsi
FungsiNode
KembalikanNode
JalankanNode        -- JS eksternal (jalankan)
PanggilNativeNode   -- fungsi Karsa f(x)

-- Kontrol alur
BerhentiNode
LewatiNode
RantaiNode          -- lalu-chain

-- Ekspresi (v0.3.1)
NilaiLiteralNode    -- teks, angka, boolean, kosong
AksesPropertiNode   -- a.b.c
ObjekLiteralNode    -- { k: v }
ArrayLiteralNode    -- [ v, ... ]
EkspresiAritNode    -- a + b * c
EkspresiTeksNode    -- "a" + b + "c"

-- Navigasi
ArahkanNode
MuatUlangNode
KembaliNode

-- Interop
LangsungNode

-- Node khusus
FragmenNode
KomenBiasaNode
DocStringNode
```

### 16.3 Strategi Error yang Ramah Pemula

Setiap error wajib memiliki:

1. nomor baris;
2. kolom;
3. kode error;
4. pesan utama;
5. penjelasan singkat;
6. saran perbaikan bila memungkinkan.

Contoh format:

```text
✗ Baris 12, Kolom 3 [E1001]
Kata kunci "Buat" tidak dikenal.
Karsa menggunakan huruf kecil.
Saran: gunakan "buat".
```

```text
✗ Baris 24, Kolom 1 [E2003]
Komponen "kartuProduk" tidak valid.
Nama komponen harus diawali huruf kapital.
Saran: gunakan "KartuProduk".
```

```text
✗ Baris 8, Kolom 5 [E3002]
Indentasi tidak konsisten.
Baris ini memiliki 3 spasi, tetapi Karsa memakai 2 spasi per level.
```

### 16.4 Prinsip Output Compiler

- output JS harus self-contained;
- helper runtime hanya disertakan jika fitur spesifik dipakai;
- compiler boleh melakukan tree-shaking internal pada helper yang tidak terpakai;
- semantik harus tetap deterministik;
- build hasil kompilasi harus debuggable;
- source map dianjurkan.

---

## 17. Penutup

Dokumen ini adalah spesifikasi hidup untuk KARSA v0.3.1. Prinsipnya:

- sintaks tetap ramah baca;
- semantik harus tegas;
- runtime harus bisa diimplementasikan tanpa menebak;
- fitur baru boleh ditambahkan, tetapi tidak boleh mengaburkan inti bahasa.

### Status Grammar v0.3.1

Semua non-terminal yang sebelumnya dipakai tanpa definisi kini sudah didefinisikan:

| Non-terminal | Status |
|---|---|
| `blok_aksi` | ✅ Didefinisikan di Section 4.1.1 |
| `aksi_tunggal` | ✅ Didefinisikan di Section 4.1.2 |
| `pernyataan` | ✅ Didefinisikan di Section 4.1.3 |
| `nilai` | ✅ Didefinisikan di Section 4.0.1 |
| `akses_properti` | ✅ Didefinisikan di Section 4.0.2 |
| `pemanggilan_native` | ✅ Didefinisikan di Section 4.0.3 |
| `ekspresi_aritmatika` | ✅ Didefinisikan di Section 4.0.4 |
| `ekspresi_turunan` | ✅ Didefinisikan di Section 4.0.5 |
| `nilai_awal` | ✅ Didefinisikan di Section 4.0.6 |
| `objek_literal` | ✅ Didefinisikan di Section 4.0.7 |
| `array_literal` | ✅ Didefinisikan di Section 4.0.8 |

### Target setelah v0.3.1

Implementasi dilakukan dalam urutan berikut:

1. Tahap 1 — Lexer (char stream → token stream + INDENT/DEDENT)
2. Tahap 2 — Parser (token stream → AST mentah)
3. Tahap 3 — Resolver (scope, alias, self-reference)
4. Tahap 4 — Analyzer (type, lifecycle, reaktivitas)
5. Tahap 5 — Compiler (AST → Vanilla JS)
6. Tahap 6 — Runtime minimal (Proxy reactivity, batching, lifecycle)
7. Tahap 7 — Integrasi karsa.js (mode dev/build, source map, error overlay)
8. Test suite
9. Dokumentasi pengguna
10. Playground

