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
```

---
Dibuat dengan ❤️ oleh KARSA Team.
