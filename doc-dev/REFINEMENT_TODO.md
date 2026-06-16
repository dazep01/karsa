# KARSA v0.3.1 — Refinement TODO Tracker

Tanggal mulai tracker: 2026-06-16  
Versi tetap: **v0.3.1**  
Strategi: pengembangan dilakukan lewat **Refinement Level**, bukan kenaikan nomor versi.

---

## Status Saat Ini

| Refinement | Status | Catatan |
|---|---:|---|
| **lvl.1 — Stabilization Patch** | ✅ Selesai | Diagnostics schema, `check --json`, resolver metadata tests, docs |
| **lvl.2 — Semantic Maturity Release** | ✅ Selesai | Semantic analyzer, symbol table, dependency graph, cycle detection, inspect/graph API |
| **lvl.3 — Tooling Release** | ✅ Selesai MVP | Language server, VS Code extension shell, playground/visualizer |
| **lvl.4 — Runtime & Compiler Hardening** | ⏳ Belum mulai | Modularisasi compiler, snapshot tests, browser e2e, sourcemap/runtime mapping |

Progress terakhir: **[v0.3.1] Refinement lvl.3D — Playground / Visualizer MVP selesai**.

---

## Prinsip Umum

- [x] Jangan tambah syntax/keyword baru selama fase refinement.
- [x] Prioritaskan stabilitas semantic, diagnostics, testing, dan tooling.
- [x] Semua perubahan harus tetap kompatibel dengan v0.3.1.
- [x] Setiap refinement harus punya test yang bisa dijalankan otomatis.
- [x] Public API untuk tooling harus JSON-safe dan tidak membawa circular reference dari AST internal.

---

# [v0.3.1] Refinement lvl.1 — Stabilization Patch

Fokus: stabilisasi fondasi, diagnostics, metadata resolver, dan output JSON dasar.

## 1. Diagnostics Schema

- [x] Definisikan schema diagnostics publik.
- [x] Dokumentasikan schema di `doc-dev/diagnostics-schema.md`.
- [x] Pertahankan field kompatibilitas lama:
  - `kode`
  - `pesan`
  - `saran`
- [x] Arahkan tooling baru memakai field standar:
  - `code`
  - `message`
  - `suggestion`
  - `severity`
  - `stage`
  - `loc`
- [x] Tambahkan `diagnostics` pada hasil `Karsa.compile()`.
- [x] Tambahkan `semantic` pada hasil `Karsa.compile()` yang sukses.
- [x] Audit semua jalur error exception agar selalu mengisi `diagnostics`.
- [x] Normalisasi `stage` agar public JSON selalu lowercase.
- [x] Tambahkan `relatedInformation` untuk diagnostics yang punya lokasi terkait.

## 2. Warning Usage Dasar

- [x] Tambahkan kode warning `W4101` untuk unused symbol.
- [x] Tambahkan kode warning `W4102` untuk write-only symbol.
- [x] Analyzer memakai `readCount` dari resolver.
- [x] Analyzer memakai `writeCount` dari resolver.
- [x] Parameter dikecualikan dari warning unused agar tidak terlalu bising.
- [x] Tinjau apakah fungsi/komponen top-level harus selalu kena unused warning atau hanya mode lint ketat.
- [x] Tambahkan opsi CLI untuk mengatur strictness warning usage.
- [x] Hindari duplicate warning jika symbol sudah punya error fatal terkait deklarasi.

## 3. `karsa check --json`

- [x] Tambahkan flag `--json` pada CLI parser.
- [x] Implementasikan output JSON untuk `karsa check`.
- [x] Output JSON berisi:
  - `version`
  - `command`
  - `file`
  - `success`
  - `stage`
  - `diagnostics`
  - `errors`
  - `warnings`
- [x] Pastikan warning tidak membuat `success: false`.
- [x] Tambahkan opsi `--quiet` untuk hanya output JSON/error tanpa banner/log tambahan.
- [x] Tambahkan dokumentasi CLI `check --json` di README.
- [x] Pastikan semua error file-not-found juga bisa tampil sebagai JSON.

## 4. Resolver Metadata Tests

- [x] Tambahkan `tester/test-resolver.js`.
- [x] Test `ast.semantic` tersedia.
- [x] Test `semantic.symbols` tersedia.
- [x] Test `globalScope` tersedia.
- [x] Test metadata:
  - `isReactive`
  - `isWritable`
  - `isComputed`
  - `readCount`
  - `writeCount`
  - `references`
- [x] Test shadowing menghasilkan `shadowedSymbol`.
- [x] Test shadowing menghasilkan `W3002`.
- [x] Tambahkan `test:resolver` di `package.json`.
- [x] Masukkan `test-resolver.js` ke `npm test`.
- [x] Tambah test metadata untuk `targetSymbol` pada statement mutasi.
- [x] Tambah test undefined identifier `E3001`.
- [x] Tambah test write ke `tetap` menghasilkan `E3003`.

## 5. Dokumentasi `ast.semantic`

- [x] Dokumentasikan `ast.semantic` di `doc-dev/AST-Specification.md`.
- [x] Dokumentasikan `SemanticProgramInfo`.
- [x] Dokumentasikan `SemanticSymbol`.
- [x] Dokumentasikan metadata identifier:
  - `resolved`
  - `semantic.symbol`
- [x] Tambahkan catatan circular reference internal.
- [x] Tambahkan rekomendasi normalized public semantic export untuk tooling.
- [x] Tambah contoh lengkap `ast.semantic.symbols` dari source kecil.
- [x] Tambah aturan stabilitas field internal vs public API.

## 6. Diagnostics Tests / Golden Tests

- [x] Tambahkan test khusus `karsa check --json`.
- [x] Tambahkan golden/snapshot diagnostics dasar untuk warning `W4101`.
- [x] Tambahkan golden/snapshot diagnostics dasar untuk warning `W4102`.
- [x] Tambahkan test JSON output valid saat ada analyzer error.
- [x] Tambahkan test JSON output valid saat file tidak ditemukan.
- [x] Tambahkan test bahwa warning tetap `success: true`.
- [x] Tambahkan script `test:diagnostics`.

## 7. Standalone Build

- [x] Perbaiki dependency mapping `../parser/error-codes` untuk resolver/analyzer pada standalone build.
- [x] Regenerate `engine/karsa.standalone.js`.
- [x] Pastikan `node -c engine/karsa.standalone.js` lulus.
- [x] Tambah test smoke untuk standalone bundle di lingkungan browser-like minimal.

## Definition of Done lvl.1

Refinement lvl.1 dianggap selesai jika:

- [x] `npm test` lulus.
- [x] `npm run build:standalone` lulus.
- [x] `karsa check --json` menghasilkan JSON valid.
- [x] Diagnostics JSON punya test otomatis.
- [x] README menjelaskan `check --json`.
- [x] Semua item penting lvl.1 selesai atau dipindah eksplisit ke lvl.2.

---

# [v0.3.1] Refinement lvl.2 — Semantic Maturity Release

Fokus: analyzer memakai semantic metadata secara lebih dalam, dependency graph, cycle detection, dan symbol table API.

## 1. Analyzer Memakai Metadata Resolver

- [x] Gunakan `node.resolved` / `node.targetSymbol` alih-alih lookup nama global bila memungkinkan.
- [x] Perbaiki risiko `_symbolMap` overwrite saat shadowing.
- [x] Tambahkan `symbol.id` internal.
- [x] Tambahkan `scopeId` internal.
- [x] Tambahkan diagnostics untuk invalid write berbasis `isWritable`.
- [x] Tambahkan diagnostics invalid watcher target berbasis `isReactive` sebagai rule analyzer resmi.
- [x] Tambahkan dead reactive diagnostics.
- [x] Tambahkan unused function/component dengan kebijakan configurable.

## 2. Dependency Graph

- [x] Buat modul `analyzer/dependency-graph.js`.
- [x] Ekstrak dependency dari ekspresi `turunan`.
- [x] Ekstrak dependency dari watcher `saat`.
- [x] Simpan dependency di `ast.semantic.dependencies`.
- [x] Bentuk edge:
  - `fromSymbolId`
  - `toSymbolId`
  - `kind`
  - `loc`
- [x] Tambahkan JSON-safe export untuk dependency graph.

## 3. Cycle Detection

- [x] Implementasi DFS cycle detection.
- [x] Diagnostics `E4201` untuk dependency cycle.
- [x] Pesan error memuat path cycle.
- [x] Test cycle sederhana dua node.
- [x] Test cycle tiga node.
- [x] Test tidak false positive pada graph acyclic.

## 4. Symbol Table API

- [x] Buat normalized symbol table tanpa circular reference.
- [x] Tambahkan `symbolId`.
- [x] Tambahkan `scopeId`.
- [x] Tambahkan references JSON-safe.
- [x] Tambahkan API internal `Karsa.inspect(source)`.
- [x] Dokumentasikan public shape.

## 5. CLI Inspect & Graph

- [x] Tambahkan `karsa inspect <file.ks>`.
- [x] Tambahkan `karsa inspect <file.ks> --json`.
- [x] Tambahkan `karsa graph <file.ks>`.
- [x] Tambahkan `karsa graph <file.ks> --json`.
- [x] Tambahkan tests untuk inspect/graph.

---

# [v0.3.1] Refinement lvl.3 — Tooling Release

Fokus: editor tooling dan developer experience.

## 1. Language Server MVP

- [x] Buat folder `tooling/language-server`.
- [x] Implementasi diagnostics live.
- [x] Implementasi hover basic.
- [x] Implementasi go to definition basic.
- [x] Implementasi find references basic.
- [x] Dokumentasikan cara menjalankan server.

## 2. VS Code Extension MVP

- [x] Buat folder `tooling/vscode`.
- [x] Syntax highlighting dasar.
- [x] Integrasi LSP diagnostics.
- [x] Hover info.
- [x] Go to definition.
- [x] Find references.
- [x] README extension.

## 3. Playground / Visualizer

- [x] Visualizer AST.
- [x] Visualizer semantic symbols.
- [x] Visualizer dependency graph.
- [x] Panel diagnostics.
- [x] Export JSON.

## Definition of Done lvl.3

- [x] Language Server MVP tersedia dan punya test.
- [x] Live diagnostics berjalan via `Karsa.inspect()`.
- [x] Hover basic tersedia.
- [x] Go to definition basic tersedia.
- [x] Find references basic tersedia.
- [x] VS Code extension shell tersedia.
- [x] Syntax highlighting dasar tersedia.
- [x] Playground / visualizer static tersedia.
- [x] Test `test:lsp`, `test:vscode`, dan `test:playground` tersedia.
- [x] `npm test` lulus setelah lvl.3D.

**Status lvl.3:** ✅ Selesai untuk scope MVP.

---

# [v0.3.1] Refinement lvl.4 — Runtime & Compiler Hardening

Fokus: modularisasi compiler, test runtime, sourcemap, dan error mapping.

## 1. Modularisasi Compiler

- [x] Pisah runtime emitter.
- [x] Pisah expression lowering.
- [x] Pisah statement lowering.
- [x] Pisah DOM/component emitter.
- [x] Pisah codegen utilities.
- [x] Pastikan output JS tidak berubah tanpa sengaja lewat snapshot tests.

## 2. Snapshot Tests Output JS

- [x] Tambahkan golden output untuk data declaration.
- [x] Tambahkan golden output untuk component.
- [x] Tambahkan golden output untuk watcher.
- [x] Tambahkan golden output untuk event handler.
- [x] Tambahkan update snapshot workflow.

## 3. Browser E2E Tests

- [x] Pilih runner browser/headless.
- [x] Test counter app.
- [x] Test todo app.
- [x] Test event click.
- [x] Test watcher update DOM.
- [x] Test cleanup behavior.

## 4. Sourcemap & Runtime Error Mapping

- [x] Perbaiki sourcemap line mapping.
- [x] Tambahkan source context pada compiler output.
- [x] Runtime error bisa dipetakan ke source `.ks`.
- [x] Dokumentasikan batasan sourcemap.

## Definition of Done lvl.4

- [x] Snapshot compiler tersedia dan masuk `npm test`.
- [x] Runtime behavior tests tersedia dan masuk `npm test`.
- [x] Runtime emitter dipisah.
- [x] Codegen utilities dipisah.
- [x] Expression lowering dipisah.
- [x] Statement emitters dipisah.
- [x] Standalone build diperbarui untuk modul compiler baru.
- [x] Source context comments tersedia pada output JS.
- [x] Sourcemap memiliki `x_karsaMappings`.
- [x] Runtime error stack dapat dipetakan best-effort ke source `.ks`.
- [x] Dokumentasi sourcemap/runtime mapping tersedia.
- [x] `npm test` lulus.
- [x] `npm run build:standalone` lulus.

**Status lvl.4:** ✅ Selesai untuk scope hardening v0.3.1.

---

## Catatan Progress

### 2026-06-16

Selesai tahap awal Refinement lvl.1:

- diagnostics schema doc;
- warning `W4101` dan `W4102`;
- analyzer usage warning berbasis resolver metadata;
- `karsa check --json`;
- resolver metadata tests;
- dokumentasi `ast.semantic`;
- standalone dependency mapping untuk `error-codes`;
- audit report dibuat di `AUDIT_KARSA_MATURITY_REPORT.md`.

### 2026-06-16 — Completion pass lvl.1

Hutang Refinement lvl.1 diselesaikan:

- exception path pada `Karsa.compile()` mulai mengisi `diagnostics`;
- `relatedInformation` didukung pada diagnostics JSON, mulai dari shadowing `W3002`;
- warning usage memiliki mode normal vs `--strict-usage`;
- `--quiet` ditambahkan untuk output non-JSON yang lebih senyap;
- file-not-found pada `check --json` menghasilkan JSON valid;
- resolver metadata tests diperluas untuk `targetSymbol`, `E3001`, dan `E3003`;
- dokumentasi `ast.semantic` ditambah contoh dan aturan stabilitas internal/public;
- standalone smoke test ditambahkan;
- `npm test` dan `npm run build:standalone` lulus.

### 2026-06-16 — Refinement lvl.2 start

Mulai implementasi Semantic Maturity:

- `symbol.id` dan `scopeId` ditambahkan di resolver;
- `analyzer/dependency-graph.js` dibuat;
- dependency graph untuk `turunan` dan watcher dibangun;
- cycle detection DFS ditambahkan;
- diagnostics `E4201` untuk dependency cycle ditambahkan;
- normalized semantic export dibuat tanpa circular reference;
- API `Karsa.inspect(source)` dan `Karsa.graph(source)` ditambahkan;
- CLI `karsa inspect <file.ks> --json` dan `karsa graph <file.ks> --json` ditambahkan;
- test semantic graph ditambahkan di `tester/test-semantic-graph.js`;
- standalone build diperbarui agar mem-bundle dependency graph utility;
- `npm test` dan `npm run build:standalone` lulus.

### 2026-06-16 — Refinement lvl.2 analyzer diagnostics

Tambahan semantic analyzer:

- `E4101` untuk invalid write berbasis `isWritable`;
- `W4103` untuk dead reactive state;
- `W4104` untuk watcher target non-reactive pada analyzer;
- lvl.2 checklist inti sekarang selesai.

### 2026-06-16 — Refinement lvl.3A Language Server MVP

Mulai Tooling Release tahap A:

- folder `tooling/language-server` dibuat;
- language server MVP dependency-free dibuat di `tooling/language-server/server.js`;
- LSP method minimal: `initialize`, `shutdown`, `exit`, `didOpen`, `didChange`, `didClose`;
- live diagnostics memakai `Karsa.inspect(source)`;
- diagnostics dipublikasikan via `textDocument/publishDiagnostics`;
- dokumentasi server ditambahkan di `tooling/language-server/README.md`;
- smoke test LSP ditambahkan di `tester/test-language-server.js`;
- script `test:lsp` ditambahkan.

### 2026-06-16 — Refinement lvl.3B Hover/Definition/References

Language server MVP diperluas:

- `hoverProvider` diaktifkan;
- `definitionProvider` diaktifkan;
- `referencesProvider` diaktifkan;
- semantic cache per document ditambahkan;
- hover menampilkan symbol kind, flags, scope, read/write count;
- definition menuju lokasi deklarasi symbol;
- references mengembalikan deklarasi dan semua reference yang diketahui;
- test LSP diperluas untuk hover, definition, dan references.

### 2026-06-16 — Refinement lvl.3C VS Code Extension Shell

VS Code Extension MVP dibuat:

- folder `tooling/vscode` dibuat;
- `package.json` extension contribution dibuat;
- bahasa `karsa` untuk file `.ks` diregistrasikan;
- TextMate grammar dasar ditambahkan;
- language configuration ditambahkan;
- extension shell dependency-free dibuat;
- extension menghubungkan VS Code ke `tooling/language-server/server.js`;
- diagnostics, hover, definition, dan references di-bridge ke provider VS Code;
- README extension ditambahkan;
- test struktur extension ditambahkan di `tester/test-vscode-extension.js`;
- script `test:vscode` ditambahkan.

### 2026-06-16 — Refinement lvl.3D Playground / Visualizer MVP

Playground visualizer static dibuat:

- folder `tooling/playground` dibuat;
- `index.html` standalone playground ditambahkan;
- source editor textarea ditambahkan;
- diagnostics panel ditambahkan;
- semantic symbols panel ditambahkan;
- dependency graph SVG panel ditambahkan;
- AST panel dengan sanitizer circular reference ditambahkan;
- JSON export ditambahkan;
- compile output JS panel ditambahkan;
- test static playground ditambahkan di `tester/test-playground.js`;
- script `test:playground` ditambahkan.

### 2026-06-16 — Refinement lvl.4A/lvl.4B Safety Net

Safety net sebelum modularisasi compiler/runtime selesai dibuat:

- compiler snapshot test ditambahkan di `tester/test-compiler-snapshots.js`;
- snapshot baseline dibuat di `tester/snapshots/compiler/*.snap.js`;
- update workflow tersedia via `UPDATE_SNAPSHOTS=1 npm run test:snapshots`;
- runtime behavior test ditambahkan di `tester/test-runtime-behavior.js`;
- fake DOM dependency-free dibuat untuk runtime tests;
- runtime behavior mencakup DOM creation, event click, watcher update DOM, show/hide/clear, dan cleanup helper;
- bug runtime reactivity ditemukan dan diperbaiki: subscriber sekarang memakai proxy key secara konsisten;
- `test:snapshots` dan `test:runtime` ditambahkan;
- `npm test` dan `npm run build:standalone` lulus.

### 2026-06-16 — Refinement lvl.4C/lvl.4D Runtime Emitter & Codegen Utils

Modularisasi aman tahap pertama selesai:

- runtime helper emitter dipisah ke `compiler/emitters/runtime.js`;
- utilitas codegen dasar dipisah ke `compiler/utils/codegen.js`;
- `compiler/karsa-compiler.js` tetap mempertahankan API `emitRuntimeHelpers()`, `emit()`, dan `genVar()` sehingga perubahan minim;
- standalone build diperbarui agar membundle `KarsaRuntimeEmitter` dan `KarsaCodegen`;
- compiler snapshot tests tetap match setelah refactor;
- `npm test` dan `npm run build:standalone` lulus.

### 2026-06-16 — Refinement lvl.4E/lvl.4F Expression & Statement Emitters

Modularisasi compiler tahap kedua selesai:

- expression lowering dipisah ke `compiler/lower/expression.js`;
- statement visitor emitters dipisah ke `compiler/emitters/statements.js`;
- `compiler/karsa-compiler.js` menjadi lebih fokus sebagai orchestrator/core compiler;
- standalone build diperbarui agar membundle `KarsaExpressionLowering` dan `KarsaStatementEmitters`;
- snapshot tests memastikan output JS tetap sama setelah refactor;
- runtime tests tetap lulus;
- `npm test` dan `npm run build:standalone` lulus.

### 2026-06-16 — Refinement lvl.4G Sourcemap & Runtime Mapping

Runtime/compiler hardening tahap akhir selesai:

- compiler menambahkan source context comment `// @karsa-source line:column NodeType`;
- `Karsa.mapGeneratedLine(js, generatedLine)` ditambahkan;
- `Karsa.mapRuntimeError(error, js)` ditambahkan;
- CLI sourcemap menambahkan ekstensi `x_karsaMappings`;
- dokumentasi dibuat di `doc-dev/sourcemap-runtime-mapping.md`;
- test sourcemap/runtime mapping ditambahkan di `tester/test-source-map-runtime.js`;
- mini todo behavior test ditambahkan ke runtime behavior suite;
- lvl.4 selesai untuk scope hardening v0.3.1.
