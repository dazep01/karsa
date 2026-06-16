<div align="center">

# 🇮🇩 KARSA

**Bahasa pemrograman berbahasa Indonesia untuk antarmuka web yang reaktif**

[![Versi](https://img.shields.io/badge/versi-0.3.1-blue.svg)](https://github.com/dazep01/karsa)
[![Lisensi](https://img.shields.io/badge/lisensi-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](package.json)
[![Test](https://img.shields.io/badge/test-313%2B%20assertions%20%E2%9C%85-success.svg)](tester)

*Tulis dalam bahasa yang kamu pahami. Hasilkan kode yang dunia mengerti.*

</div>

---

## 🔘 Apa Itu KARSA?

**KARSA** adalah bahasa pemrograman _Domain-Specific Language_ (DSL) berbahasa Indonesia yang dikompilasi menjadi **Vanilla JavaScript DOM API** murni — tanpa Virtual DOM, tanpa `eval`, tanpa framework eksternal.

KARSA dirancang untuk siapa saja yang ingin mengekspresikan logika antarmuka web dalam bahasa yang terasa alami, lalu menghasilkan kode JavaScript standar industri yang bisa berjalan di browser mana pun.

```karsa
data nama = "Indonesia"
buat h1 -> teks: "Halo, " + nama

saat nama berubah:
  perbarui teks h1 -> "Halo, " + nama
```

---

## 🌋 Mengapa KARSA Perlu Ada?

Di Indonesia, jutaan orang berurusan dengan teknologi setiap harinya — namun ketika mencoba memahami bagaimana teknologi itu bekerja, mereka berhadapan dengan satu hambatan yang sering luput dari perhatian: **bahasa**.

`variable`, `function`, `if-else`, `while`, `return` — bagi sebagian besar orang, kata-kata itu bukan sekadar istilah teknis. Mereka adalah **tembok kognitif** yang harus diruntuhkan sebelum seseorang bahkan bisa mulai berpikir secara logis tentang sebuah program.

**KARSA hadir untuk meruntuhkan tembok itu.**

Bukan dengan menerjemahkan secara harfiah, melainkan dengan merancang ulang dari nol — sebuah bahasa yang sintaksis dan cara berpikirnya tumbuh dari bahasa Indonesia, bukan sekadar tempelan di atas bahasa lain.

Dan yang lebih penting: setiap kebiasaan yang dibentuk oleh KARSA — indentasi wajib, deklarasi eksplisit, struktur yang ketat — adalah cerminan langsung dari standar bahasa-bahasa besar yang sudah ada. Sehingga ketika seseorang akhirnya bermigrasi ke JavaScript, TypeScript, Python, Vue, atau React, mereka **tidak memulai dari nol**. Mereka hanya perlu mempelajari kosakata baru — bukan cara berpikir baru.

> 💡 **KARSA bukan framework.** KARSA adalah DSL yang mengkompilasi ke Vanilla JavaScript DOM API murni. Kode hasil kompilasinya dapat dibaca, dipelajari, dan dipahami oleh siapa saja.

---

## ✨ Yang Membuat KARSA Berbeda

### 🗣️ Sintaksis Berbahasa Indonesia — Sungguhan

Tidak setengah hati. Setiap keyword, setiap konstruksi, ditulis dalam bahasa yang langsung dipahami tanpa kamus:

```karsa
data hitungan = 0
turunan genap = hitungan % 2 == 0

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
```

Bukan `let`, bukan `const`, bukan `document.createElement`. Tapi `data`, `buat`, `saat ... berubah` — kata-kata yang masuk akal sejak baris pertama.

---

### ⚡ Reaktivitas dari Dalam, Bukan dari Library

KARSA mengadopsi **Proxy-based reactivity** yang tertanam langsung di compiler — bukan diimpor dari luar. Variabel dideklarasikan dengan `data`, secara otomatis menjadi reaktif. Nilai turunan dideklarasikan dengan `turunan`. Watcher dengan `saat ... berubah`. Tidak ada boilerplate. Tidak ada setup tersembunyi.

```karsa
data hitungan = 0
turunan genap = hitungan % 2 == 0

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
```

---

### 🔒 Ketat dengan Tujuan

KARSA memegang prinsip bahwa **disiplin adalah bentuk kepedulian**. Indentasi 2 spasi adalah kewajiban, bukan saran — karena Python juga memegang aturan yang sama, dan jutaan pengembang hidup dengannya. Deklarasi `data`, `tetap`, dan `ubah` memisahkan reaktivitas, kekal, dan bisa diubah — pembagian semantik yang jauh lebih bermakna dari sekadar `var` vs `let`.

Analyzer KARSA menolak `berhenti` di luar loop, `kembalikan` di luar fungsi, dan lifecycle di luar komponen — **bukan untuk menyulitkan, melainkan untuk membiasakan struktur berpikir yang benar**.

---

### 🏗️ Compiler 5 Tahap yang Matang

Di balik sintaksis yang ramah, berjalan pipeline compiler lengkap:

```
Lexer → Parser → Resolver → Analyzer → Compiler
```

Setiap tahap memiliki tanggung jawab terpisah, test suite mandiri, dan pesan error bilingual (Indonesia & Inggris). Resolver membangun semantic graph dengan metadata reaktivitas. Analyzer memvalidasi logika program. Compiler menghasilkan JavaScript mandiri yang siap jalan di browser mana pun.

---

### 🔐 Aman dan Dapat Diaudit

Tidak ada `eval()`. Tidak ada `new Function()`. Tidak ada `document.write()`. Kode KARSA dikompilasi secara statis menjadi DOM API murni — setiap operasi dapat diaudit, diprediksi, dan di-debug.

---

## 🚀 Mulai dalam 30 Detik

### Instalasi

```bash
git clone https://github.com/dazep01/karsa.git
cd karsa
```

Tidak perlu `npm install`. Tidak perlu build step. Cukup **Node.js ≥ 14**.

---

### Hello World

Buat file `halo.ks`:

```karsa
data nama = "Indonesia"
buat h1 -> teks: "Halo, " + nama
```

Kompilasi via CLI:

```bash
node engine/karsa-cli.js compile halo.ks
```

Atau jalankan langsung di browser:

```html
<script src="engine/karsa.js"></script>
<script type="text/karsa">
  data nama = "Indonesia"
  buat h1 -> teks: "Halo, " + nama
</script>
```

---

### Counter Reaktif — 10 Baris, 4 Konsep

```karsa
data hitungan = 0

buat tombol#tambah -> teks: "+"
  ketika diklik -> tambahkan 1 ke hitungan

buat p#angka -> teks: hitungan

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
```

Empat konsep dalam satu contoh kecil: **deklarasi reaktif**, **pembuatan elemen**, **event handler**, dan **watcher**. Itulah kedalaman KARSA — kompleksitas disembunyikan, bukan dihilangkan.

---

## 📖 Tur Sintaksis

### Deklarasi Data

KARSA membedakan tiga jenis deklarasi secara semantik — bukan sekadar varian `var`/`let`/`const`:

```karsa
data usia = 17              -- Reaktif: berubah, bisa di-watch
tetap PI = 3.14             -- Konstan: tidak bisa diubah
ubah pencacah = 0           -- Bisa diubah, tapi tidak reaktif
turunan luas = sisi * sisi  -- Computed: dihitung ulang otomatis
```

---

### Membangun Antarmuka

```karsa
buat div.kartu
  buat h2#judul -> teks: "Selamat Datang"
  buat p -> teks: "Ini paragraf pertamaku"
  buat tombol#tutup -> teks: "Tutup"
    ketika diklik -> hapus div.kartu
```

Setiap `buat` menghasilkan elemen DOM nyata. Selector CSS (`#id`, `.class`) langsung menjadi atribut elemen. Hierarki ditentukan oleh indentasi — seperti HTML, tapi tanpa tag penutup.

---

### Event & Interaksi

```karsa
ketika tombol#simpan diklik:
  ambil nilai dari #input-nama -> simpan ke namaBaru
  simpan namaBaru ke nama

ketika #input-nama ditekan:
  langsung:
    if (event.key === "Enter") document.getElementById("simpan").click()
```

---

### Kontrol Alur

```karsa
jika nilai >= 80:
  tampilkan pesan "Lulus dengan baik!"
jika tidak:
  tampilkan pesan "Perlu ditingkatkan"

ulangi item dari daftarBelanja:
  buat li -> teks: item

selama pencacah < 10:
  tambahkan 1 ke pencacah
```

---

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

Komponen di KARSA adalah **factory function** — setiap pemanggilan `gunakan` membuat instance baru yang mandiri. Parameter opsional dengan nilai default didukung penuh, dan urutannya ditegakkan oleh analyzer.

---

### Fungsi

```karsa
fungsi hitungLuas(sisi):
  kembalikan sisi * sisi

fungsi sapa(nama="Kawan"):
  kembalikan "Halo, " + nama + "!"
```

---

### Fetch & Navigasi

```karsa
ambil https://api.contoh.com/data
  ketika sukses -> simpan ke dataMasuk
  ketika gagal -> tampilkan pesan "Gagal memuat data"

arahkan ke "/halaman-lain"
```

---

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

KARSA hadir dengan CLI yang dirancang untuk workflow nyata:

```bash
# Compile ke stdout
karsa compile app.ks

# Compile ke file output
karsa compile app.ks -o dist/app.js

# Cek sintaks tanpa kompilasi (cocok untuk CI/linter)
karsa check app.ks

# Cek dengan output JSON (untuk editor atau tooling)
karsa check app.ks --json

# Inspeksi semantik — symbol table, referensi, dependensi
karsa inspect app.ks --json

# Dependency graph — computed, watcher, deteksi siklus
karsa graph app.ks --json

# Build seluruh direktori
karsa build src/ -o dist/

# Watch & auto-rebuild saat file berubah
karsa watch src/ -o dist/

# Format kode KARSA
karsa format app.ks -w

# Inisiasi project baru
karsa init nama-proyek
```

### Flag yang Tersedia

| Flag | Fungsi |
|---|---|
| `-o, --output <path>` | Path output file atau direktori |
| `-w, --write` | Tulis langsung ke file (untuk format) |
| `--recover` | Lanjutkan kompilasi meski ada error |
| `--sourcemap` | Sertakan source map sebagai komentar |
| `--verbose` | Output detail untuk debugging |
| `--minify` | Minify output JavaScript |
| `--json` | Output JSON (check / inspect / graph) |
| `--quiet` | Kurangi output non-JSON |
| `--strict-usage` | Peringatkan fungsi/komponen yang tidak digunakan |

---

## 🔌 Ekosistem Tooling

### Language Server (LSP)

KARSA dilengkapi Language Server MVP untuk integrasi editor modern:

```bash
node tooling/language-server/server.js
```

Fitur saat ini: live diagnostics, hover dasar, go to definition, find references.

---

### Ekstensi VS Code

Tersedia di `tooling/vscode/` — syntax highlighting TextMate, language configuration, dan koneksi ke language server. Salin folder ke direktori extensions VS Code untuk mulai menulis KARSA dengan penyorotan sintaks dan diagnostics real-time.

---

### Playground & Visualizer

`tooling/playground/index.html` menyediakan antarmuka visual untuk eksplorasi — panel diagnostics, symbol table, dependency graph, AST viewer, dan compile output dalam satu tampilan terpadu.

---

## 🧪 Test Suite

KARSA memiliki test suite komprehensif yang menjangkau seluruh pipeline kompilasi:

| Suite | Cakupan | Status |
|---|---|---|
| Lexer | 61 assertions — token, indentasi, literal, selector, komentar, performa 5MB | ✅ |
| Parser | 95 assertions — 23 kategori AST, idempotency, invariant | ✅ |
| Resolver | 5 assertions — metadata semantik, shadowing, undefined, write-to-const | ✅ |
| Analyzer | 6 assertions — lifecycle, parameter, type hint, kontrol alur | ✅ |
| Diagnostics JSON | 5 assertions — kontrak API `--json`, error/warning shape | ✅ |
| Semantic Graph | 6 assertions — inspect, graph, cycle detection, CLI JSON | ✅ |
| Compiler Snapshots | 8 assertions — snapshot output 7 konstruksi utama | ✅ |
| Runtime Behavior | 5 assertions — DOM creation, reaktivitas, event, cleanup | ✅ |
| Source Map | 3 assertions — source comment, error mapping, CLI flag | ✅ |
| Compiler Unit | 105 assertions — 34 kategori per node type + helpers | ✅ |
| Pipeline Integration | 1 assertion — end-to-end lexer → compiler | ✅ |
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
# lihat package.json untuk daftar lengkap
```

---

## 📂 Struktur Proyek

```
karsa/
├── lexer/
│   └── karsa-lexer.js          Pemecah teks menjadi token
│                               (1.461 baris — indentasi, keyword multi-kata, selector CSS)
│
├── parser/
│   ├── karsa-parser.js         Orkestrator parsing
│   ├── statement-parser.js     (1.671 baris — semua konstruksi statement)
│   ├── expression-parser.js    Ekspresi, operator, precedence
│   ├── selector-parser.js      Parser selector CSS
│   ├── ast-factory.js          Pabrik node AST + ensureLoc
│   ├── binding-powers.js       Tabel precedence Pratt parser
│   ├── token-types.js          Definisi tipe token
│   ├── error-codes.js          (474 baris — 84 kode error/warning bilingual)
│   └── index.js                Entry point modul parser
│
├── resolver/
│   └── karsa-resolver.js       Pengelola scope, nama, dan metadata semantik
│                               (674 baris — SemanticSymbol, Scope, reference tracking)
│
├── analyzer/
│   ├── karsa-analyzer.js       Validasi semantik dan logika program
│   └── dependency-graph.js     Deteksi siklus dependensi turunan
│
├── compiler/
│   ├── karsa-compiler.js       Orkestrator kompilasi + source context
│   ├── emitters/
│   │   ├── runtime.js          Emitter runtime helpers
│   │   └── statements.js       (698 baris — 36 visitor method per statement type)
│   ├── lower/
│   │   └── expression.js       Lowering ekspresi AST ke JavaScript
│   └── utils/
│       └── codegen.js          Utilitas pembangkit kode
│
├── engine/
│   ├── karsa.js                Engine API (compile, inspect, graph, mapRuntimeError)
│   ├── karsa-cli.js            (1.143 baris — CLI lengkap dengan 10 sub-command)
│   └── karsa.standalone.js     Bundle mandiri untuk browser (8.934 baris, auto-generated)
│
├── utils/
│   └── visitor.js              BaseVisitor + accept dispatch
│
├── scripts/
│   └── build-standalone.js     Builder bundle standalone
│
├── tooling/
│   ├── language-server/        LSP server MVP
│   ├── vscode/                 Ekstensi VS Code MVP
│   └── playground/             Playground & semantic visualizer
│
├── tester/                     Test suite (16 file, 313+ assertions)
├── example/                    Contoh aplikasi (counter, todo-app, halo)
├── doc-dev/                    Dokumentasi pengembangan internal
└── style.css                   Stylesheet demo
```

---

## 🗺️ Modul Panduan

KARSA hadir dengan modul panduan yang dirancang untuk membantu siapa saja — dari yang baru memulai hingga yang ingin memahami arsitektur web secara lebih dalam:

| Modul | Fokus | Status |
|---|---|---|
| **Modul 1** | Fondasi — deklarasi, buat, teks, event | ✅ Tersedia |
| **Modul 2** | Alur & Logika — jika, ulangi, selama, fungsi | ✅ Tersedia |
| **Modul 3** | Komponen & Komposisi | 🔜 Dalam pengerjaan |
| **Modul 4** | Interoperabilitas — JS, API, framework | 🔜 Dalam pengerjaan |
| **Modul 5** | Pola & Arsitektur — state, props, watcher | 🔜 Dalam pengerjaan |
| **Modul 6** | Jembatan ke Industri — dari KARSA ke JS / TS / Vue / React / Python | 🔜 Dalam pengerjaan |

Setiap modul tidak hanya membahas KARSA — secara tersirat ia memperkenalkan konsep yang berlaku universal: variabel reaktif (Vue `ref`), computed property (Vue `computed`), component props (React/Vue), event binding, lifecycle hook, hingga dependency injection. Sehingga ketika pembaca akhirnya berhadapan dengan JavaScript atau Python, mereka akan menemukan bahwa **konsep yang mereka kenal sudah memiliki nama lain** — dan itu cukup.

---

## 🧭 Filosofi Desain

Prinsip-prinsip yang membentuk setiap keputusan dalam KARSA:

**🇮🇩 Indonesia Dulu, Global Kemudian.**
Sintaksis ditulis dalam bahasa yang dipahami pertama, bukan bahasa yang dipinjam. Tapi output-nya adalah JavaScript standar industri yang berjalan di mana saja.

**🔒 Ketatan adalah Kepedulian.**
Aturan indentasi, deklarasi eksplisit, dan validasi ketat bukan hambatan — mereka adalah latihan yang membentuk kebiasaan. Pengguna KARSA tidak akan terkejut saat Python menolak tab, atau saat TypeScript menolak implicit `any`.

**🔍 Tanpa Sihir.**
Setiap baris kode KARSA dapat ditelusuri ke output JavaScript-nya. Source map (`// @karsa-source`) mencantumkan baris dan kolom asal. Runtime helpers (`__createReactive`, `__watch`, `__setState`) adalah fungsi JavaScript biasa yang bisa di-inspect di DevTools. Tidak ada abstraksi yang tidak bisa ditembus.

**🏛️ Kedewasaan dari Dalam.**
Pipeline 5-tahap, registry 84 kode error bilingual, semantic graph, dependency cycle detection, source map — ini bukan fitur yang terlihat dari luar. Tapi mereka adalah tulang punggung yang membuat KARSA bukan sekadar proyek eksperimental, melainkan bahasa yang siap diajak serius.

---

## 🤝 Kontribusi

KARSA adalah proyek sumber terbuka berlisensi MIT. Kontribusi dalam bentuk apa pun — kode, dokumentasi, modul panduan, terjemahan, atau laporan bug — sangat diterima dan dihargai.

**Cara berkontribusi:**

1. Fork repositori ini
2. Buat branch fitur: `git checkout -b fitur/nama-fitur`
3. Commit perubahan: `git commit -m "Deskripsi yang jelas"`
4. Push ke fork: `git push origin fitur/nama-fitur`
5. Buat Pull Request

Pastikan semua test lulus sebelum mengajukan PR:

```bash
npm test
```

---

## 📜 Lisensi

KARSA dirilis di bawah [Lisensi MIT](LICENSE) — bebas digunakan, dimodifikasi, dan didistribusikan.

---

<div align="center">

**KARSA** — *Bahasa yang kamu pahami. Kode yang dunia mengerti.*

Dibuat dengan ❤️ untuk Indonesia, oleh [RaaRion](https://github.com/dazep01)

</div>
