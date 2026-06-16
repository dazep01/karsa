# KARSA v0.3.1 Refinement lvl.1 — Diagnostics Schema

Dokumen ini mendefinisikan bentuk diagnostics publik untuk integrasi CLI, editor, language server, playground, dan tooling lain.

## Tujuan

- Menyamakan bentuk error/warning lintas tahap pipeline.
- Membuat `karsa check --json` aman dikonsumsi tooling.
- Menjaga kompatibilitas dengan field lama (`kode`, `pesan`, `saran`) sambil memperkenalkan field standar (`code`, `message`, `suggestion`).

## Bentuk Diagnostic Publik

```ts
interface KarsaDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  stage: 'lexer' | 'parser' | 'resolver' | 'analyzer' | 'compiler' | 'runtime' | 'system';
  message: string;
  suggestion?: string;
  loc?: SourceLocation | null;
  relatedInformation?: Array<{
    message: string;
    loc?: SourceLocation | null;
  }>;
}
```

## Source Location

```ts
interface SourceLocation {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}
```

## Output `karsa check --json`

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

Jika ada warning:

```json
{
  "version": "0.3.1",
  "command": "check",
  "file": "src/App.ks",
  "success": true,
  "stage": null,
  "diagnostics": [
    {
      "code": "W4101",
      "severity": "warning",
      "stage": "analyzer",
      "message": "Simbol \"x\" dideklarasikan tetapi tidak pernah digunakan.",
      "suggestion": "Hapus deklarasi jika tidak diperlukan, atau gunakan simbol tersebut.",
      "loc": {
        "start": { "line": 1, "column": 1 },
        "end": { "line": 1, "column": 11 }
      }
    }
  ],
  "errors": [],
  "warnings": [
    {
      "code": "W4101",
      "severity": "warning",
      "stage": "analyzer",
      "message": "Simbol \"x\" dideklarasikan tetapi tidak pernah digunakan.",
      "suggestion": "Hapus deklarasi jika tidak diperlukan, atau gunakan simbol tersebut.",
      "loc": {
        "start": { "line": 1, "column": 1 },
        "end": { "line": 1, "column": 11 }
      }
    }
  ]
}
```

## Kode Baru Refinement lvl.1

| Code | Severity | Stage | Arti |
|---|---|---|---|
| `W4101` | warning | analyzer | Symbol dideklarasikan tetapi tidak pernah digunakan |
| `W4102` | warning | analyzer | Symbol ditulis tetapi tidak pernah dibaca |

## Catatan Kompatibilitas

Objek internal masih mempertahankan alias:

```ts
{
  code: string;
  kode: string;
  message: string;
  pesan: string;
  suggestion: string;
  saran: string;
}
```

Tooling baru sebaiknya memakai field standar:

- `code`,
- `message`,
- `suggestion`,
- `severity`,
- `stage`,
- `loc`.

Field Indonesia (`kode`, `pesan`, `saran`) tetap tersedia untuk kompatibilitas mundur.
