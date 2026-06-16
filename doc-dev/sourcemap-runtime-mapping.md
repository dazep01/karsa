# KARSA v0.3.1 Refinement lvl.4G — Sourcemap & Runtime Mapping

Dokumen ini menjelaskan mekanisme source context dan runtime error mapping pada fase hardening.

## Source Context Comments

Compiler menambahkan komentar sebelum top-level statement:

```js
// @karsa-source 2:1 DataDeclaration
```

Format:

```text
@karsa-source <line>:<column> <NodeType>
```

Komentar ini dipakai oleh tooling untuk memetakan baris JavaScript ter-generate ke lokasi source `.ks` terdekat.

## API Mapping

Engine menyediakan:

```js
Karsa.mapGeneratedLine(js, generatedLine)
```

Contoh output:

```js
{
  generatedLine: 105,
  sourceLine: 2,
  sourceColumn: 1,
  nodeType: 'DataDeclaration'
}
```

Untuk runtime error stack sederhana:

```js
Karsa.mapRuntimeError(error, js)
```

Output menambahkan `generatedColumn` bila stack menyediakan kolom.

## Sourcemap Extension

`karsa compile file.ks -o file.js --sourcemap` tetap menghasilkan Source Map v3 minimal, tetapi menambahkan field ekstensi:

```json
{
  "x_karsaMappings": [
    {
      "generatedLine": 105,
      "generatedColumn": 1,
      "sourceLine": 2,
      "sourceColumn": 1,
      "nodeType": "DataDeclaration"
    }
  ]
}
```

## Batasan Saat Ini

- Field `mappings` VLQ standar masih kosong.
- Mapping masih statement-level/top-level, belum expression-level presisi.
- Runtime stack parsing masih best-effort.
- Mapping multi-file/import belum tersedia.
- Komentar source context dapat hilang jika output diminify agresif.

## Rekomendasi Tooling

Untuk tooling internal KARSA saat ini, gunakan prioritas berikut:

1. `x_karsaMappings` dari `.map` bila tersedia.
2. Komentar `@karsa-source` dari output JS.
3. Diagnostics `loc` dari pipeline compile/check/inspect.

Source Map VLQ penuh bisa ditambahkan pada refinement selanjutnya tanpa mengubah kontrak `x_karsaMappings`.
