const KarsaLexer = require('../lexer/karsa-lexer');
const KarsaParser = require('../parser/index');
const KarsaResolver = require('../resolver/karsa-resolver');
const KarsaAnalyzer = require('../analyzer/karsa-analyzer');
const KarsaCompiler = require('../compiler/karsa-compiler');

const code = `
data hitungan = 0
buat tombol#tambah -> teks: "+"
  ketika diklik:
    tambahkan 1 ke hitungan

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
`;

const tokens = KarsaLexer.tokenize(code).tokens;
const ast = KarsaParser.parse(tokens).ast;
new KarsaResolver().resolve(ast);
new KarsaAnalyzer().analyze(ast);

const compiler = new KarsaCompiler();
const outputJS = compiler.compile(ast);

console.log(outputJS);
