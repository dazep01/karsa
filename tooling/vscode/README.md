# KARSA VS Code Extension MVP

**Status:** `[v0.3.1] Refinement lvl.3C`

Extension shell ini menghubungkan VS Code ke KARSA language server dependency-free yang ada di:

```text
tooling/language-server/server.js
```

## Fitur MVP

- Registrasi bahasa `karsa` untuk file `.ks`.
- Syntax highlighting dasar.
- Live diagnostics via language server.
- Hover basic.
- Go to definition basic.
- Find references basic.

## Menjalankan dalam Development Host

1. Buka folder repo KARSA di VS Code.
2. Buka folder `tooling/vscode` sebagai extension project, atau jalankan Extension Development Host dari root dengan path extension ini.
3. Pastikan `node` tersedia.
4. Buka file `.ks`.

Jika language server tidak ditemukan otomatis, set konfigurasi:

```json
{
  "karsa.languageServer.path": "/path/to/karsa/tooling/language-server/server.js"
}
```

## Batasan MVP

- Belum dipackage sebagai `.vsix`.
- Belum ada completion/code actions.
- Belum ada formatter LSP.
- Resolusi symbol masih single-document.
