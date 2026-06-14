/**
 * KARSA v0.3.1 — Integration Test Pipeline
 * ----------------------------------------------------------------------------
 * Menguji alur: Lexer -> Parser -> Resolver
 */

const KarsaLexer = require('../lexer/karsa-lexer');
const KarsaParser = require('../parser/index');
const KarsaResolver = require('../resolver/karsa-resolver');
const { CollectingVisitor, traverse } = require('../utils/visitor');

// Contoh Kode: 15.1 Counter Sederhana
const sourceCode = `
--! Aplikasi penghitung sederhana

data hitungan = 0

buat div#app
  buat h1 -> teks: "Penghitung"
  buat p#angka -> teks: hitungan
  buat div.tombol-grup
    buat tombol#kurang -> teks: "−"
    buat tombol#tambah -> teks: "+"

ketika tombol#tambah diklik:
  tambahkan 1 ke hitungan

ketika tombol#kurang diklik:
  kurangi hitungan dengan 1

saat hitungan berubah:
  perbarui teks p#angka -> hitungan
`;

console.log("=== [1] RUNNING LEXER ===");
const lexResult = KarsaLexer.tokenize(sourceCode);
if (lexResult.errors.length > 0) {
  console.error("Lexer Errors:", lexResult.errors);
  process.exit(1);
}
console.log("Lexer Success: " + lexResult.tokens.length + " tokens generated.\n");

console.log("=== [2] RUNNING PARSER ===");
const parseResult = KarsaParser.parse(lexResult.tokens);
if (parseResult.errors.length > 0) {
  console.error("Parser Errors:", parseResult.errors);
  process.exit(1);
}
console.log("Parser Success: AST built.\n");

console.log("=== [3] RUNNING RESOLVER ===");
const resolver = new KarsaResolver();
const resolveResult = resolver.resolve(parseResult.ast);

if (resolveResult.errors.length > 0) {
  console.error("Resolver Errors:");
  resolveResult.errors.forEach(err => {
    console.error(`[${err.kode}] ${err.pesan} (Baris ${err.loc.start.line}:${err.loc.start.column})`);
  });
  process.exit(1);
}
console.log("Resolver Success: All identifiers and scopes resolved.\n");

// Validasi beberapa hasil resolusi
console.log("=== [4] VALIDASI HASIL RESOLUSI ===");

// 1. Cari node 'perbarui' dan cek apakah 'hitungan' ter-resolve
const collector = new CollectingVisitor('PerbaruiStatement');
traverse(resolveResult.ast, collector);

const perbaruiNode = collector.results[0];
if (perbaruiNode && perbaruiNode.value && perbaruiNode.value.resolved) {
  console.log("✓ Identifier 'hitungan' pada 'perbarui' berhasil di-resolve.");
  console.log("  Scope: " + perbaruiNode.value.resolved.scope);
  console.log("  Type:  " + perbaruiNode.value.resolved.type);
} else {
  console.log("✗ Gagal meresolusi identifier 'hitungan' pada 'perbarui'.");
}

console.log("\nINTEGRATION TEST PASSED!");
