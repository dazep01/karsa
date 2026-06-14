/**
 * KARSA v0.3.1 — Analyzer Test Suite
 * ----------------------------------------------------------------------------
 * Menguji apakah Analyzer berhasil menangkap pelanggaran semantik.
 */

const KarsaLexer = require('../lexer/karsa-lexer');
const KarsaParser = require('../parser/index');
const KarsaResolver = require('../resolver/karsa-resolver');
const KarsaAnalyzer = require('../analyzer/karsa-analyzer');

const testCases = [
  {
    name: "E6001: Berhenti di luar konteks",
    code: `
data x = 1
berhenti
    `
  },
  {
    name: "E4001: Lifecycle di luar komponen",
    code: `
saat komponen dipasang:
  tampilkan pesan "Halo"
    `
  },
  {
    name: "E4005 & E4006: Masalah Parameter Komponen",
    code: `
komponen Kartu(nama: teks = "Budi", nama: teks):
  buat div -> teks: nama
    `
  },
  {
    name: "W4001: Type Hint Mismatch",
    code: `
data skor: angka = "seratus"
    `
  },
  {
    name: "E4007: Mode Tampilkan Tidak Valid",
    code: `
tampilkan "#app" dengan mode: "hancurkan"
    `
  },
  {
    name: "E6002: Lewati di luar loop",
    code: `
ketika diklik:
  lewati
    `
  }
];

console.log("=== RUNNING ANALYZER TESTS ===\n");

testCases.forEach((test, index) => {
  console.log(`Test #${index + 1}: ${test.name}`);
  
  try {
    const tokens = KarsaLexer.tokenize(test.code).tokens;
    const ast = KarsaParser.parse(tokens).ast;
    
    const resolver = new KarsaResolver();
    resolver.resolve(ast);
    
    const analyzer = new KarsaAnalyzer();
    const result = analyzer.analyze(ast);
    
    const allIssues = [...result.errors, ...result.warnings];
    
    if (allIssues.length > 0) {
      allIssues.forEach(issue => {
        const type = issue.severity === 'warning' ? '⚠ WARNING' : '✗ ERROR';
        console.log(`${type} [${issue.kode}] ${issue.pesan}`);
      });
    } else {
      console.log("✓ No issues detected");
    }
  } catch (e) {
    console.error("  System Crash:", e.message);
  }
  console.log("-" . repeat(50));
});
