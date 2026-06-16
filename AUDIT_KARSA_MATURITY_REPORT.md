# Audit Kedewasaan KARSA v0.3.1

Tanggal audit: 2026-06-16  
Repo: `https://github.com/dazep01/karsa.git`  
Commit lokal yang diaudit: `a767ce6 Merge pull request #3 from raarion/main`

---

## 1. Ringkasan Eksekutif

KARSA v0.3.1 sudah melewati fase parser/lexer eksperimental. Fondasi pipeline sudah jelas dan cukup disiplin:

```text
Lexer -> Parser -> Resolver -> Analyzer -> Compiler -> Runtime/JS
```

Kekuatan utama repo saat ini ada pada:

1. **Parser/Lexer yang relatif matang** dan memiliki test suite cukup baik.
2. **Resolver yang kaya metadata semantic**, bukan hanya symbol lookup.
3. **Engine yang bersih sebagai orchestrator**.
4. **Compiler yang sudah menghasilkan runtime reaktif self-contained**.
5. **CLI dan build standalone yang sudah tersedia**.

Titik lemah utama bukan lagi syntax, tetapi **kedewasaan semantic layer, diagnostics, dan tooling API**.

Kesimpulan strategis:

> Untuk v0.4, KARSA sebaiknya membekukan penambahan syntax besar, lalu fokus pada semantic analyzer, dependency graph, diagnostics, dan tooling contract.

---

## 2. Status Verifikasi

Perintah yang dijalankan:

```bash
npm test
npm run build:standalone
node engine/karsa-cli.js compile example/halo.ks
node engine/karsa-cli.js compile example/index.ks
node engine/karsa-cli.js compile example/test.ks
```

Hasil:

- Test suite lulus.
- Build standalone berhasil.
- Contoh `.ks` berhasil dikompilasi.

Catatan: `npm run build:standalone` mengubah `engine/karsa.standalone.js` karena timestamp build; perubahan tersebut tidak perlu dianggap perubahan source utama.

---

## 3. Peta Modul dan Kondisi Saat Ini

| Modul | Estimasi Nilai | Kondisi | Risiko Utama |
|---|---:|---|---|
| Lexer | 8.5 | Stabil, test banyak, performa diuji | Kompleksitas file cukup besar |
| Parser | 8.0 | Struktur modular, AST factory ada | `statement-parser.js` besar, raw syntax surface luas |
| Resolver | 8.8 | Semantic metadata kuat | Tanggung jawab mulai bercampur dengan analyzer |
| Analyzer | 6.3 | Validasi dasar ada | Belum memakai metadata resolver secara penuh |
| Compiler | 7.6 | Self-contained, runtime minimal | File hampir 1000 baris, lowering dan runtime campur |
| Engine | 8.5 | Orchestrator bersih | API hasil compile belum distandarkan untuk tooling |
| Runtime | 7.2 | Proxy reactivity minimal | Belum ada static dependency graph/cycle detection |
| CLI/Tooling | 7.0 | CLI cukup lengkap | Belum ada LSP, stable diagnostics API, visualizer |
| Dokumentasi | 7.0 | Banyak dokumen dev | Perlu sinkronisasi spec vs implementasi |
| Testing | 7.5 | Test lulus dan cukup luas | Belum ada snapshot/golden/e2e browser/negative semantic suite besar |

---

## 4. Temuan Utama

### 4.1 Resolver adalah fondasi semantic yang kuat

File: `resolver/karsa-resolver.js`

Resolver sudah memiliki model semantic yang cukup matang:

- `SemanticSymbol`
- `Scope`
- `references`
- `readCount`
- `writeCount`
- `shadowedSymbol`
- `isReactive`
- `isWritable`
- `isComputed`
- metadata parameter, fungsi, komponen

Resolver juga menempelkan metadata ke AST:

```js
ast.semantic = {
  symbols: this.allSymbols,
  globalScope: this.currentScope
};
```

Dan pada identifier:

```js
node.resolved = symbol;
node.semantic = { symbol };
symbol.readCount++;
symbol.references.push(node);
```

Ini berarti KARSA sudah memiliki fondasi untuk:

- unused variable diagnostics,
- write-only/read-only diagnostics,
- dependency graph,
- symbol index,
- language server,
- hover/definition/references,
- semantic visualization.

### 4.2 Analyzer belum memakai potensi resolver

File: `analyzer/karsa-analyzer.js`

Analyzer sudah membuat map dari `ast.semantic.symbols`, tetapi pemanfaatannya masih terbatas.

Validasi analyzer saat ini lebih banyak berupa:

- type hint mismatch,
- lifecycle context,
- duplicate/default parameter,
- side-effect dalam `turunan`,
- write ke `turunan`,
- control flow context,
- mode `tampilkan`,
- validasi `gunakan` untuk komponen.

Metadata berikut belum dimanfaatkan secara maksimal:

- `readCount`,
- `writeCount`,
- `references`,
- `shadowedSymbol`,
- `isWritable`,
- `isComputed`,
- `isReactive`.

Ini adalah gap terbesar di repo.

### 4.3 Batas tanggung jawab Resolver vs Analyzer perlu dirapikan

Saat ini resolver tidak hanya resolve symbol, tetapi juga mengeluarkan beberapa diagnostics semantic:

- undefined identifier,
- duplicate declaration,
- shadowing warning,
- write ke const,
- watcher target non-reactive.

Sebagian ini masuk akal berada di resolver, tetapi untuk kedewasaan arsitektur perlu dibuat batas eksplisit:

- **Resolver**: membangun symbol table, scope, binding, references.
- **Analyzer**: membaca semantic model dan memutuskan diagnostics/kebijakan.

Rekomendasi: pertahankan resolver sebagai sumber fakta, tetapi pindahkan/duplikasi rule policy ke analyzer secara bertahap.

### 4.4 Compiler bekerja, tetapi perlu dipisah menjadi lowering + runtime

File: `compiler/karsa-compiler.js`

Compiler sudah self-contained dan cukup jelas, tetapi file mencapai hampir 1000 baris. Saat ini compiler memuat:

- visitor statement,
- expression lowering,
- runtime helper emitter,
- DOM generation,
- reactive assignment logic,
- component/lifecycle lowering.

Untuk v0.4/v0.5, sebaiknya dipisah menjadi:

```text
compiler/
  karsa-compiler.js        entry visitor
  emitters/runtime.js      runtime helper emitter
  emitters/dom.js          DOM helper/lowering
  lower/expression.js      expression lowering
  lower/statements.js      statement lowering
  utils/codegen.js         indent, temp var, escaping
```

Tujuannya bukan sekadar estetika, tetapi agar regression testing dan refactor lebih aman.

### 4.5 Engine sudah sehat

File: `engine/karsa.js`

Engine sudah menjadi orchestrator:

```text
Lexer -> Parser -> Resolver -> Analyzer -> Compiler
```

Tidak terlihat engine melakukan parsing/compiling kedua. Ini bagus dan perlu dipertahankan.

Yang perlu ditingkatkan adalah bentuk output compile agar menjadi kontrak API tooling.

### 4.6 Tooling dasar sudah ada, tooling ekosistem belum

File: `engine/karsa-cli.js`

CLI sudah cukup lengkap:

- compile,
- build,
- watch,
- format,
- check,
- init,
- sourcemap,
- minify.

Namun untuk bahasa yang lebih dewasa, tooling berikut belum terlihat matang:

- Language Server Protocol,
- VS Code extension,
- diagnostics JSON stable schema,
- symbol index API,
- hover/definition/references API,
- AST/semantic visualizer,
- dependency graph visualizer,
- formatter test suite/golden tests.

---

## 5. Masalah Prioritas

### P0 — Semantic Analyzer Upgrade

Implementasi diagnostics dari metadata resolver:

1. `W4101` unused symbol
   - deklarasi tidak pernah dibaca.
2. `W4102` write-only symbol
   - ditulis tetapi tidak pernah dibaca.
3. `W4103` dead reactive
   - `data` reaktif tidak pernah dibaca/watch/dipakai turunan.
4. `W4104` unused component/function
   - fungsi/komponen dideklarasikan tetapi tidak digunakan.
5. `W4105` shadowing policy
   - gunakan `shadowedSymbol` untuk pesan yang lebih akurat.
6. `E4101` invalid write target
   - gunakan `isWritable`, bukan hanya `kind === 'turunan'`.
7. `E4102` invalid watcher target
   - gunakan `isReactive` sebagai rule analyzer resmi.
8. `E4103` read-before-init
   - khusus deklarasi lokal bila grammar memungkinkan urutan eksekusi bermasalah.

### P0 — Dependency Graph untuk `turunan` dan `saat`

Bangun graph static dari references:

```text
symbol A -> symbol B
```

Jika `turunan total = harga * jumlah`, maka:

```text
total depends on harga
 total depends on jumlah
```

Kebutuhan utama:

- dependency extraction,
- cycle detection,
- diagnostics cycle path,
- graph output untuk tooling.

Contoh diagnostics:

```text
E4201: Dependency cycle pada data turunan:
a -> b -> c -> a
```

### P0 — Stable diagnostics schema

Semua tahap sudah memakai object error, tetapi perlu kontrak formal:

```ts
interface KarsaDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  stage: 'lexer' | 'parser' | 'resolver' | 'analyzer' | 'compiler' | 'runtime';
  message: string;
  suggestion?: string;
  loc?: SourceLocation;
  relatedInformation?: Array<{
    message: string;
    loc?: SourceLocation;
  }>;
}
```

Ini penting untuk CLI, LSP, editor, web playground, dan test snapshot.

---

## 6. Rekomendasi Roadmap: v0.3.1 Refinement Levels

Catatan versi:

> Untuk sementara, KARSA tidak perlu menaikkan nomor versi minor/patch. Semua peningkatan berikut tetap berada di bawah label **v0.3.1**, tetapi diberi nama **Refinement Level** agar arah pengembangan tetap jelas tanpa memberi kesan breaking release atau feature release baru.

### [v0.3.1] Refinement lvl.1 — Stabilization Patch

Fokus: stabilisasi tanpa syntax baru.

- Rapikan diagnostics schema.
- Tambah warning unused/write-only berbasis `readCount` dan `writeCount`.
- Tambah `karsa check --json`.
- Tambah test resolver metadata.
- Dokumentasikan `ast.semantic`.
- Tambah golden tests untuk diagnostics.
- Dokumentasikan output `Karsa.compile()`.

Deliverable minimal:

```text
Karsa.compile(source, { diagnostics: 'json' })
```

menghasilkan output stabil:

```js
{
  success,
  js,
  ast,
  diagnostics,
  stages,
  semantic
}
```

### [v0.3.1] Refinement lvl.2 — Semantic Maturity Release

Fokus: semantic analyzer dan dependency graph.

- Analyzer memakai metadata resolver.
- Dependency graph untuk `turunan` dan watcher.
- Cycle detection.
- Unused/dead diagnostics yang lebih matang.
- Symbol table API.
- `karsa inspect <file.ks>`.
- `karsa graph <file.ks> --json`.

Output contoh:

```json
{
  "symbols": [],
  "references": [],
  "dependencies": [],
  "diagnostics": []
}
```

### [v0.3.1] Refinement lvl.3 — Tooling Release

Fokus: developer experience.

- Language Server MVP.
- VS Code extension MVP.
- Hover symbol info.
- Go to definition.
- Find references.
- Live diagnostics.
- Formatter golden tests.
- Playground visualizer.

### [v0.3.1] Refinement lvl.4 — Runtime & Compiler Hardening

Fokus: robustness output JS dan runtime behavior.

- Modularisasi compiler.
- Runtime helper modular.
- Snapshot tests output JS.
- Browser e2e tests.
- DOM behavior tests.
- Sourcemap lebih akurat.
- Optional minified runtime.
- Runtime error mapping ke source `.ks`.

---

## 7. PR yang Disarankan

### PR 1 — Analyzer memakai semantic metadata

Scope PR:

- Tambah helper di analyzer:

```js
getSymbols()
getReferences(symbol)
isUnused(symbol)
isWriteOnly(symbol)
isDeadReactive(symbol)
```

- Tambah warning:

```text
W4101 unused symbol
W4102 write-only symbol
W4103 dead reactive data
```

- Tambah tests di `tester/test-analyzer.js`.

Nilai: sangat tinggi. Risiko: rendah-menengah.

### PR 2 — Dependency graph static

Scope PR:

- Tambah file:

```text
analyzer/dependency-graph.js
```

- Graph node = symbol.
- Edge = reference dari ekspresi `turunan`/watcher.
- Tambah cycle detection DFS.
- Output graph di `ast.semantic.dependencies`.

Nilai: sangat tinggi. Risiko: menengah.

### PR 3 — Diagnostics JSON dan CLI inspect

Scope PR:

- `karsa check file.ks --json`
- `karsa inspect file.ks --json`
- Standardisasi `diagnostics` array.
- Jangan campur warning ke `errors` di public API.

Nilai: tinggi. Risiko: rendah.

### PR 4 — Resolver/Analyzer contract

Scope PR:

- Dokumentasikan `SemanticSymbol`.
- Dokumentasikan `ast.semantic`.
- Pisahkan rule policy yang cocok dipindah ke analyzer.
- Tambah tests agar shape semantic tidak berubah sembarangan.

Nilai: tinggi. Risiko: menengah.

### PR 5 — Compiler modularization

Scope PR:

- Pisahkan runtime helper emitter.
- Pisahkan expression lowering.
- Pisahkan DOM/component emitter.
- Tambah snapshot tests output JS.

Nilai: menengah-tinggi. Risiko: menengah.

---

## 8. Quick Wins 1–2 Hari

1. Tambah `karsa check --json`.
2. Tambah analyzer warning untuk unused symbol berbasis `readCount === 0`.
3. Tambah analyzer warning untuk write-only symbol berbasis `writeCount > 0 && readCount === 0`.
4. Tambah test resolver metadata:
   - read count,
   - write count,
   - shadowing,
   - targetSymbol.
5. Dokumentasikan `ast.semantic` di `doc-dev/AST-Specification.md`.
6. Tambah `npm run test:semantic`.
7. Tambah golden test untuk diagnostics output.

---

## 9. Contoh Desain Semantic API

### Output compile yang lebih dewasa

```js
const result = Karsa.compile(source, {
  mode: 'check',
  includeAst: true,
  includeSemantic: true
});
```

Return:

```js
{
  success: boolean,
  js: string | null,
  ast: Program | null,
  semantic: {
    symbols: SemanticSymbol[],
    references: Reference[],
    dependencies: DependencyEdge[],
    scopes: ScopeInfo[]
  },
  diagnostics: KarsaDiagnostic[],
  stages: {
    lexer: StageResult,
    parser: StageResult,
    resolver: StageResult,
    analyzer: StageResult,
    compiler: StageResult
  }
}
```

### Symbol model yang perlu distabilkan

```ts
interface SemanticSymbol {
  id: string;
  name: string;
  kind: 'data' | 'tetap' | 'ubah' | 'turunan' | 'fungsi' | 'komponen' | 'parameter';
  loc: SourceLocation;
  scopeId: string;
  isReactive: boolean;
  isWritable: boolean;
  isComputed: boolean;
  readCount: number;
  writeCount: number;
  references: Reference[];
  shadowedSymbolId?: string;
}
```

Catatan penting: untuk public API, jangan expose circular object penuh. Gunakan `id` agar aman untuk JSON.

---

## 10. Risiko Arsitektur

### Risiko 1 — Circular semantic object

Saat ini symbol menyimpan `declarationNode`, references menyimpan node, dan node menyimpan symbol. Ini nyaman internal, tetapi buruk untuk JSON/tooling.

Solusi:

- Internal graph boleh circular.
- Public semantic export harus normalized by ID.

### Risiko 2 — Analyzer lookup by name bisa salah untuk shadowing

Analyzer membuat `_symbolMap` dari nama symbol:

```js
this._symbolMap.set(sym.name, sym);
```

Jika ada shadowing, nama sama bisa overwrite symbol sebelumnya. Ini berisiko untuk validasi lint tertentu.

Solusi:

- Gunakan `symbol.id`.
- Untuk node, gunakan `node.resolved`/`node.targetSymbol`, bukan global lookup by name.
- Public API expose `scopeId` dan `symbolId`.

### Risiko 3 — Resolver terlalu banyak rule policy

Resolver mulai mengeluarkan diagnostics yang bisa dianggap analyzer-level.

Solusi:

- Tetapkan dokumen boundary.
- Resolver menghasilkan fakta.
- Analyzer menghasilkan kebijakan diagnostics.

### Risiko 4 — Compiler besar dan sulit snapshot

Compiler hampir 1000 baris. Saat fitur bertambah, regression risk naik.

Solusi:

- Modularisasi compiler.
- Golden snapshot tests untuk output JS.
- Browser e2e tests untuk runtime behavior.

---

## 11. Definition of Done untuk “KARSA lebih dewasa”

KARSA bisa dianggap naik kelas dari eksperimen ke bahasa kecil yang matang jika memiliki:

1. Semantic model stabil dan terdokumentasi.
2. Diagnostics konsisten lintas tahap.
3. Dependency graph dan cycle detection.
4. Analyzer memanfaatkan symbol/reference metadata.
5. CLI JSON untuk integrasi tooling.
6. Test negative cases yang luas.
7. Snapshot tests compiler.
8. Browser runtime e2e tests.
9. API compile/check/inspect yang stabil.
10. Tooling minimal: LSP atau VS Code extension MVP.

---

## 12. Rekomendasi Strategis Akhir

Untuk 1–2 bulan ke depan, jangan prioritaskan keyword/syntax baru. Pertahankan identitas versi sebagai **v0.3.1 Refinement**, lalu prioritaskan:

```text
stabilization > semantic maturity > diagnostics > tooling API > runtime hardening > syntax baru
```

Urutan kerja paling masuk akal:

1. **[v0.3.1] Refinement lvl.1** — Stabilkan diagnostics schema, `check --json`, resolver metadata tests, dan dokumentasi `ast.semantic`.
2. **[v0.3.1] Refinement lvl.2** — Pakai metadata resolver di analyzer, tambahkan dependency graph, cycle detection, `inspect`, dan `graph`.
3. **[v0.3.1] Refinement lvl.3** — Bangun tooling developer: LSP MVP, VS Code extension MVP, hover, definition, references, live diagnostics.
4. **[v0.3.1] Refinement lvl.4** — Modularisasi compiler/runtime, snapshot tests, browser e2e, sourcemap lebih akurat, runtime error mapping.
5. Baru setelah refinement levels selesai, pertimbangkan syntax atau keyword baru.

Jika roadmap ini diikuti, KARSA akan punya pembeda yang kuat: bukan hanya DSL Indonesia yang bisa compile, tetapi bahasa kecil dengan semantic engine dan tooling yang serius, tanpa harus terburu-buru menaikkan nomor versi.
