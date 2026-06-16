<div align="center">

# 🇮🇩 KARSA

**Bahasa pemrograman Indonesia untuk membangun antarmuka web reaktif**

[![Versi](https://img.shields.io/badge/versi-0.3.1-blue.svg)](https://github.com/dazep01/karsa)
[![Lisensi](https://img.shields.io/badge/lisensi-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](package.json)
[![Test](https://img.shields.io/badge/test-313%2B%20assertions%20%E2%9C%85-success.svg)](tester)

*Belajar ngoding tanpa hambatan bahasa. Tulis dalam bahasa yang kau pahami, hasilkan kode yang dunia pahami.*

</div>

---

## 🌋 Kenapa KARSA?

Indonesia telah meresmikan mata pelajaran **coding sejak sekolah dasar**. Tetapi faktanya, mayoritas materi pembelajaran masih menggunakan istilah bahasa Inggris — `variable`, `function`, `if-else`, `while`, `return`. Bagi seorang anak kelas 4 SD di Madiun, kata-kata itu bukan sekadar "istilah asing" — itu adalah **tembok kognitif** yang harus dipecah sebelum ia bahkan mulai berpikir secara logis.

**KARSA hadir untuk memangkas tembok itu total.**

Bukan sekadar "diterjemahkan" — KARSA didesain dari nol sebagai **Domain-Specific Language** dengan sintaksis berbahasa Indonesia yang utuh, konsisten, dan sengaja dibuat ketat agar membiasakan disiplin pemrograman industri. Setiap aturan di KARSA — indentasi 2 spasi wajib, deklarasi eksplisit, pengetatan logika — adalah cerminan langsung dari standar bahasa besar yang sudah ada. Sehingga saat murid KARSA bermigrasi ke JavaScript, TypeScript, Python, Vue, atau React, mereka **tidak memulai dari nol**. Mereka hanya perlu mempelajari kosakata baru — bukan cara berpikir baru.

> 💡 **KARSA bukan framework.** KARSA adalah DSL lokal Indonesia yang mengkompilasi menjadi Vanilla JavaScript DOM API murni — tanpa Virtual DOM, tanpa `eval`, tanpa `new Function`. Kode hasil kompilasi bisa dibaca, dipelajari, dan dimengerti siapa saja.

---

## ✨ Apa yang Membuat KARSA Berbeda?

### 🗣️ Sintaksis Berbahasa Indonesia Penuh

Tidak ada setengah hati. Setiap keyword, setiap konstruksi, ditulis dalam bahasa yang dimengerti tanpa kamus:

```karsa
data nama = "Dunia"
buat h1 -> teks: "Halo " + nama

saat nama berubah:
  perbarui teks h1 -> "Halo " + nama
```

Bukan `let`, bukan `const`, bukan `document.createElement`. Tetapi `data`, `buat`, `saat ... berubah` — kata-kata yang langsung masuk akal.

### ⚡ Reaktif dari Akar, Bukan dari Library

KARSA mengadopsi **Proxy-based reactivity** yang tertanam di dalam compiler — bukan diimpor dari luar. Variabel deklarasikan dengan `data`, secara otomatis menjadi reaktif. Computed value dideklarasikan dengan `turunan`, watcher dengan `saat ... berubah`. Tidak ada boilerplate. Tidak ada setup. Tulis, dan ia bereaksi.

```karsa
data hitungan = 0
turunan genap = hitungan % 2 == 0

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
```

### 🔒 Ketat dengan Sengaja

KARSA memegang prinsip bahwa **disiplin adalah bentuk kepedulian**. Indentasi 2 spasi wajib, bukan opsional — karena Python juga memegang aturan yang sama, dan jutaan programmer hidup dengannya. Deklarasi `data`, `tetap`, dan `ubah` membedakan reaktivitas, kekal, dan bisa diubah — bukan sekadar `var` vs `let` yang mudah tertukar. Analyzer menolak `berhenti` di luar loop, `kembalikan` di luar fungsi, dan lifecycle di luar komponen — **bukan untuk menyulitkan, tetapi untuk membiasakan pikiran struktur yang benar**.

### 🏗️ Arsitektur Compiler 5-Tahap Matang

KARSA bukan transpiler sederhana. Di balik sintaksis yang ramah, berjalan pipeline compiler lengkap yang setara dengan pendekatan bahasa-bahasa besar:

```
Lexer → Parser → Resolver → Analyzer → Compiler
```

Setiap tahap memiliki tanggung jawab terpisah, test suite mandiri, dan error bilingual (Indonesia & Inggris) yang konsisten. Resolver membangun semantic graph dengan metadata reaktivitas. Analyzer memvalidasi logika program. Compiler menghasilkan JavaScript mandiri yang siap jalan di browser mana pun.

### 🔐 Aman dan Deterministik

Tidak ada `eval()`. Tidak ada `new Function()`. Tidak ada `document.write()`. Kode KARSA dikompilasi secara statis menjadi DOM API murni — setiap operasi bisa diaudit, diprediksi, dan di-debug.

---

## 🚀 Mulai dalam 30 Detik

### Instalasi

```bash
git clone https://github.com/dazep01/karsa.git
cd karsa
```

Tidak butuh `npm install`. Tidak butuh build step. Cukup Node.js ≥ 14.

### Hello World

Buat file `halo.ks`:

```karsa
data nama = "Indonesia"
buat h1 -> teks: "Halo " + nama
```

Kompilasi:

```bash
node engine/karsa-cli.js compile halo.ks
```

Atau jalankan langsung di browser:

```html
<script src="engine/karsa.js"></script>
<script type="text/karsa">
  data nama = "Indonesia"
  buat h1 -> teks: "Halo " + nama
</script>
```

### Counter Reaktif — Lengkap dalam 10 Baris

```karsa
data hitungan = 0

buat tombol#tambah -> teks: "+"
  ketika diklik -> tambahkan 1 ke hitungan

buat p#angka -> teks: hitungan

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
```

Empat konsep sekaligus dalam satu contoh kecil: **deklarasi reaktif**, **pembuatan elemen**, **event handler**, dan **watcher**. Itulah kedalaman KARSA — kompleksitas disembunyikan, bukan dihilangkan.

---

## 📖 Tour Sintaksis

### Deklarasi Data

KARSA membedakan tiga jenis deklarasi dengan jelas — bukan sekadar varian `var`/`let`/`const`, tetapi pembagian semantik yang mencerminkan peran data di dalam program:

```karsa
data usia = 17                  -- Reaktif, berubah, bisa di-watch
tetap PI = 3.14                 -- Konstan, tidak bisa diubah
ubah pencacah = 0               -- Bisa diubah, tapi tidak reaktif
turunan luas = sisi * sisi      -- Computed, otomatis dihitung ulang
```

### Membangun Antarmuka

```karsa
buat div.kartu
  buat h2#judul -> teks: "Selamat Datang"
  buat p -> teks: "Ini paragraf pertamaku"
  buat tombol#tutup -> teks: "Tutup"
    ketika diklik -> hapus div.kartu
```

Setiap `buat` menghasilkan elemen DOM nyata. Selector CSS (`#id`, `.class`) langsung menjadi atribut elemen. Anak elemen ditentukan oleh indentasi — seperti HTML, tapi tanpa tutup tag.

### Event & Interaksi

```karsa
ketika tombol#simpan diklik:
  ambil nilai dari #input-nama -> simpan ke namaBaru
  simpan namaBaru ke nama

ketika #input-nama ditekan:
  langsung:
    if (event.key === "Enter") document.getElementById("simpan").click()
```

### Kontrol Alur

```karsa
jika nilai >= 80:
  tampilkan pesan "Lulus dengan baik!"
jika tidak:
  tampilkan pesan "Perlu belajar lagi"

ulangi item dari daftarBelanja:
  buat li -> teks: item

selama pencacah < 10:
  tambahkan 1 ke pencacah
```

### Komponen

```karsa
komponen Kartu(nama, warna="biru"):
  buat div.kartu
    buat h3 -> teks: nama
    buat tombol -> teks: "Pilih"
      ketika diklik -> tampilkan pesan nama + " dipilih"

gunakan Kartu dengan nama: "Kopi", warna: "coklat"
gunakan Kartu dengan nama: "Teh"
```

Komponen di KARSA adalah **factory function** — setiap pemanggilan `gunakan` membuat instance baru yang mandiri. Parameter dengan nilai default didukung, dan aturan penempatan parameter wajib sebelum opsional ditegakkan oleh analyzer.

### Fungsi

```karsa
fungsi hitungLuas(sisi):
  kembalikan sisi * sisi

fungsi sapa(nama="Kawan"):
  kembalikan "Halo, " + nama + "!"
```

### Fetch & Navigasi

```karsa
ambil https://api.contoh.com/data
  ketika sukses -> simpan ke dataMasuk
  ketika gagal -> tampilkan pesan "Gagal memuat data"

arahkan ke "/halaman-lain"
```

### Lifecycle Komponen

```karsa
komponen Penghitung(awal=0):
  saat komponen dipasang:
    tampilkan pesan "Komponen siap!"
  saat komponen dilepas:
    tampilkan pesan "Komponen dihapus"
```

---

## 🛠️ CLI — Perintah Lengkap

KARSA hadir dengan CLI yang dirancang untuk workflow nyata — bukan sekadar compiler mainan:

```bash
# Compile file ke stdout
karsa compile app.ks

# Compile ke file output
karsa compile app.ks -o dist/app.js

# Cek sintaks tanpa compile (cocok untuk CI/linter)
karsa check app.ks

# Cek dengan output JSON (untuk editor/tooling)
karsa check app.ks --json

# Inspeksi semantic — symbol table, references, dependencies
karsa inspect app.ks --json

# Dependency graph — computed, watcher, cycle detection
karsa graph app.ks --json

# Build seluruh direktori
karsa build src/ -o dist/

# Watch & auto-rebuild saat file berubah
karsa watch src/ -o dist/

# Format/beautify kode KARSA
karsa format app.ks -w

# Buat project baru
karsa init nama-proyek
```

### Flag yang Tersedia

| Flag | Fungsi |
|------|--------|
| `-o, --output <path>` | Path output file atau direktori |
| `-w, --write` | Tulis langsung ke file (format) |
| `--recover` | Lanjutkan kompilasi meski ada error |
| `--sourcemap` | Sertakan source map komentar |
| `--verbose` | Output detail untuk debugging |
| `--minify` | Minify output JavaScript |
| `--json` | Output JSON (check/inspect/graph) |
| `--quiet` | Kurangi output non-JSON |
| `--strict-usage` | Peringatkan fungsi/komponen yang tidak dipakai |

---

## 🔌 Ekosistem Tooling

### Language Server (LSP)

KARSA memiliki Language Server MVP yang mendukung integrasi editor:

```bash
node tooling/language-server/server.js
```

Fitur LSP saat ini: live diagnostics, hover basic, go to definition, find references.

### Ekstensi VS Code

Tersedia di `tooling/vscode/` — syntax highlighting TextMate, language configuration, dan koneksi ke language server. Cukup salin folder ke direktori extensions VS Code untuk mulai menulis KARSA dengan penyorotan sintaks dan diagnostics real-time.

### Playground & Visualizer

`tooling/playground/index.html` menyediakan antarmuka visual untuk eksplorasi kode KARSA — panel diagnostics, symbol table, dependency graph, AST, dan compile output dalam satu tampilan.

---

## 🧪 Test Suite

KARSA memiliki test suite komprehensif yang menjangkau seluruh pipeline:

| Suite | Cakupan | Status |
|-------|---------|--------|
| Lexer | 61 assertions — token, indentasi, literal, selector, komentar, performa 5MB | ✅ |
| Parser | 95 assertions — 23 kategori AST, idempotency, invariant | ✅ |
| Resolver | 5 assertions — metadata semantic, shadowing, undefined, write-to-const | ✅ |
| Analyzer | 6 assertions — lifecycle, parameter, type hint, kontrol alur | ✅ |
| Diagnostics JSON | 5 assertions — kontrak API `--json`, error/warning shape | ✅ |
| Semantic Graph | 6 assertions — inspect, graph, cycle detection, CLI JSON | ✅ |
| Compiler Snapshots | 8 assertions — snapshot output 7 konstruksi utama | ✅ |
| Runtime Behavior | 5 assertions — DOM creation, reaktivitas, event, cleanup | ✅ |
| Source Map | 3 assertions — source comment, error mapping, CLI flag | ✅ |
| Compiler Unit | 105 assertions — 34 kategori per node type + helpers | ✅ |
| Pipeline Integration | 1 assertion — end-to-end lexer→compiler | ✅ |
| Standalone Smoke | 1 assertion — bundle mandiri di browser | ✅ |
| Language Server | 6 assertions — initialize, diagnostics, hover, definition, references | ✅ |
| VS Code Extension | 4 assertions — package.json, grammar, config, syntax | ✅ |
| Playground | 1 assertion — panel & runtime integration | ✅ |
| **Total** | **313+ assertions, 0 failures** | ✅ |

Jalankan semua test:

```bash
npm test
```

Atau per suite:

```bash
npm run test:lexer
npm run test:compiler
npm run test:lsp
# ... lihat package.json untuk daftar lengkap
```

---

## 📂 Struktur Proyek

```
karsa/
├── lexer/                  Pemecah teks menjadi token
│   └── karsa-lexer.js      (1.461 baris — handel indentasi, keyword multi-kata, selector CSS)
│
├── parser/                 Pembangun pohon sintaks abstrak (AST)
│   ├── karsa-parser.js      Orkestrator parsing
│   ├── statement-parser.js  (1.671 baris — semua konstruksi statement)
│   ├── expression-parser.js Ekspresi, operator, precedence
│   ├── selector-parser.js   Parser selector CSS
│   ├── ast-factory.js       Pabrik node AST + ensureLoc
│   ├── binding-powers.js    Tabel precedence Pratt parser
│   ├── token-types.js       Definisi tipe token
│   ├── error-codes.js       (474 baris — 84 kode error/warning bilingual)
│   └── index.js             Entry point modul parser
│
├── resolver/               Pengelola lingkup (scope), nama, dan metadata semantic
│   └── karsa-resolver.js    (674 baris — SemanticSymbol, Scope, reference tracking)
│
├── analyzer/               Validasi semantik dan logika
│   ├── karsa-analyzer.js    Pemeriksa aturan (lifecycle, konteks, type hint)
│   └── dependency-graph.js  Deteksi siklus dependensi turunan
│
├── compiler/               Generator kode JavaScript
│   ├── karsa-compiler.js    Orkestrator kompilasi + source context
│   ├── emitters/
│   │   ├── runtime.js       Emitter runtime helpers
│   │   └── statements.js    (698 baris — 36 visitor method per statement type)
│   ├── lower/
│   │   └── expression.js    Lowering ekspresi AST ke JavaScript
│   └── utils/
│       └── codegen.js       Utilitas pembangkit kode
│
├── engine/                 Orkestrator utama & CLI
│   ├── karsa.js             Engine API (compile, inspect, graph, mapRuntimeError)
│   ├── karsa-cli.js         (1.143 baris — CLI lengkap dengan 10 sub-command)
│   └── karsa.standalone.js  Bundle mandiri untuk browser (8.934 baris, dihasilkan otomatis)
│
├── utils/                  Pola Visitor dan utilitas bersama
│   └── visitor.js           BaseVisitor + accept dispatch
│
├── scripts/                Skrip build dan utilitas
│   └── build-standalone.js Pembangun bundle standalone
│
├── tooling/                Perangkat pengembangan
│   ├── language-server/     LSP server MVP
│   ├── vscode/              Ekstensi VS Code MVP
│   └── playground/          Playground & semantic visualizer
│
├── tester/                 Test suite (16 file, 313+ assertions)
├── example/                Contoh aplikasi (counter, todo-app, halo)
├── doc-dev/                Dokumentasi pengembangan internal
└── style.css               Stylesheet demo
```

---

## 🎓 Visi Pendidikan — Modul Ajar

KARSA tidak hanya bahasa — ia dirancang sebagai **landasan belajar dan mengajar**. Enam modul ajar sedang dikembangkan untuk membentang kurva belajar dari nol hingga siap industri:

| Modul | Fokus | Status |
|-------|-------|--------|
| **Modul 1** | Dasar KARSA — deklarasi, buat, teks, event | ✅ Tersedia |
| **Modul 2** | Alur & Logika — jika, ulangi, selama, fungsi | ✅ Tersedia |
| **Modul 3** | Komponen & Komposisi | 🔜 Dalam pengerjaan |
| **Modul 4** | Interoperabilitas — JS, API, framework | 🔜 Dalam pengerjaan |
| **Modul 5** | Pola & Arsitektur — state, props, watcher | 🔜 Dalam pengerjaan |
| **Modul 6** | Migrasi Industri — dari KARSA ke JS/TS/Vue/React/Python | 🔜 Dalam pengerjaan |

Setiap modul tidak hanya mengajarkan KARSA — terselip secara halus konsep yang berlaku di bahasa dan framework besar: variabel reaktif (Vue `ref`), computed property (Vue `computed`), component props (React/Vue), event binding, lifecycle hook, hingga dependency injection. Sehingga saat murid akhirnya memasuki dunia JavaScript atau Python, mereka menemukan bahwa **konsep yang mereka kenal sudah memiliki nama lain** — dan itu cukup, tidak perlu mulai dari nol.

---

## 🧭 Filosofi Desain

Prinsip-prinsip yang membentuk setiap keputusan desain KARSA:

**Indonesia Dulu, Global Kemudian.** Sintaksis ditulis dalam bahasa yang dimengerti pertama, bukan bahasa yang dipinjam. Tapi output-nya adalah JavaScript standar industri yang berjalan di mana saja.

**Ketatan adalah Kepedulian.** Aturan indentasi, deklarasi eksplisit, dan validasi ketat bukan hambatan — mereka adalah latihan yang membentuk kebiasaan. Murid KARSA tidak akan terkejut saat Python menolak tab, atau saat TypeScript menolak implicit any.

**Tanpa Sihir.** Setiap baris kode KARSA bisa ditelusuri ke output JavaScript-nya. Komentar source map (`// @karsa-source`) mencantumkan baris dan kolom asal. Runtime helpers (`__createReactive`, `__watch`, `__setState`) adalah fungsi JavaScript biasa yang bisa di-inspect di DevTools. Tidak ada abstraksi yang tidak bisa ditembus.

**Kedewasaan dari Dalam.** Pipeline 5-tahap, error code registry 84 kode bilingual, semantic graph, dependency cycle detection, source map — ini bukan fitur yang terlihat dari luar. Tapi mereka adalah tulang punggung yang membuat KARSA bukan mainan, melainkan bahasa yang siap diajak serius.

---

## 🤝 Kontribusi

KARSA adalah proyek sumber terbuka dengan lisensi MIT. Kontribusi — kode, dokumentasi, modul ajar, terjemahan, atau sekadar laporan bug — sangat diterima.

Cara berkontribusi:

1. Fork repositori ini
2. Buat branch fitur (`git checkout -b fitur/nama-fitur`)
3. Commit perubahanmu (`git commit -m "Deskripsi jelas"`)
4. Push ke fork-mu (`git push origin fitur/nama-fitur`)
5. Buat Pull Request

Pastikan semua test lulus sebelum mengajukan PR:

```bash
npm test
```

---

## 📜 Lisensi

KARSA dirilis di bawah [Lisensi MIT](LICENSE).

---

<div align="center">

**KARSA** — *Bahasa yang kau pahami, kode yang dunia pahami.*

Dibuat dengan ❤️ oleh [RaaRion](https://github.com/dazep01)

</div>
