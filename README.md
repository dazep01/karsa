# KARSA v0.3.1

**KARSA** adalah bahasa pemrograman DSL (Domain Specific Language) berbasis teks berbahasa Indonesia yang dikompilasi menjadi Vanilla JavaScript DOM API murni.

## Filosofi
- **Tanpa Virtual DOM**: Langsung ke DOM API.
- **Tanpa Eval**: Aman dan deterministik.
- **Reaktif**: Proxy-based reactivity.
- **Lokalisasi**: Sintaksis menggunakan bahasa Indonesia yang intuitif.

## Struktur Proyek
- `engine/`: Core orchestrator.
- `lexer/`: Pemecah teks menjadi token.
- `parser/`: Pembangun pohon sintaks (AST).
- `resolver/`: Pengelola lingkup (scope) dan nama.
- `analyzer/`: Validasi logika semantik.
- `compiler/`: Generator kode JavaScript.
- `utils/`: Alat bantu (Visitor pattern).

## Cara Penggunaan
Cukup sertakan `engine/karsa.js` di file HTML Anda dan tulis kode dalam tag `<script type="text/karsa">`.

```html
<script src="engine/karsa.js"></script>
<script type="text/karsa">
  buat h1 -> teks: "Halo Dunia!"
</script>

<!-- atau dari file .ks -->
<script type="text/karsa" src="patch_ke_filemu.ks"></script>
```

<<<<<<< HEAD
## CLI Singkat

Compile file KARSA menjadi JavaScript:

```bash
karsa compile src/App.ks -o dist/App.js
```

Cek file tanpa menulis output JavaScript:

```bash
karsa check src/App.ks
```

Mulai **[v0.3.1] Refinement lvl.1**, `check` juga mendukung output JSON untuk tooling/editor:

```bash
karsa check src/App.ks --json
```

Contoh output:

```json
{
  "version": "0.3.1",
  "command": "check",
  "file": "src/App.ks",
  "success": true,
  "stage": null,
  "diagnostics": [],
  "errors": [],
  "warnings": []
}
```

Jika ada warning seperti unused/write-only symbol, `success` tetap `true` dan warning muncul di `diagnostics` serta `warnings`.

Mulai **[v0.3.1] Refinement lvl.2**, CLI juga menyediakan semantic inspection dan dependency graph:

```bash
karsa inspect src/App.ks --json
karsa graph src/App.ks --json
```

`inspect` menghasilkan symbol table, references, dependencies, dan cycle info dalam bentuk JSON-safe. `graph` berfokus pada dependency graph, terutama untuk `turunan` dan watcher.

Mulai **[v0.3.1] Refinement lvl.3A/lvl.3B**, KARSA juga memiliki Language Server MVP:

```bash
node tooling/language-server/server.js
```

Fitur LSP MVP:

- live diagnostics,
- hover basic,
- go to definition basic,
- find references basic.

Extension shell VS Code MVP tersedia di:

```text
tooling/vscode
```

Extension ini mendaftarkan bahasa `karsa` untuk file `.ks`, menyediakan syntax highlighting dasar, dan menghubungkan VS Code ke language server KARSA.

Playground dan semantic visualizer static tersedia di:

```text
tooling/playground/index.html
```

Visualizer ini menyediakan panel diagnostics, symbols, dependency graph, AST, JSON export, dan compile output.

=======
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
---
Dibuat dengan ❤️ oleh RaaRion.
