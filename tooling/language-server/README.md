# KARSA Language Server MVP

**Status:** `[v0.3.1] Refinement lvl.3A`

Server ini adalah Language Server Protocol MVP tanpa dependency eksternal.

## Fitur Saat Ini

- `initialize`
- `shutdown`
- `exit`
- `textDocument/didOpen`
- `textDocument/didChange`
- `textDocument/didClose`
- `textDocument/publishDiagnostics`
- `textDocument/hover`
- `textDocument/definition`
- `textDocument/references`

Diagnostics, hover, definition, dan references diambil dari:

```js
Karsa.inspect(source)
```

## Menjalankan

```bash
node tooling/language-server/server.js
```

Server berkomunikasi lewat stdio menggunakan framing LSP:

```text
Content-Length: <bytes>\r\n\r\n<json>
```

## Batasan MVP

- Belum ada incremental sync; server memakai full sync.
- Belum ada multi-file workspace symbol resolution.
- `relatedInformation` lintas file belum memakai URI asal yang presisi.
- Belum ada completion/code action/formatting via LSP.

Fitur tersebut masuk tahap lanjutan Refinement lvl.3.
