#!/usr/bin/env node
/**
 * KARSA v0.3.1 — Auto-Build Standalone Bundle
 * ----------------------------------------------------------------------------
 * Menggabungkan seluruh modul KARSA menjadi satu file standalone
 * (engine/karsa.standalone.js) yang bisa digunakan langsung di browser
 * tanpa memerlukan Node.js module system.
 * 
 * Penggunaan:
 *   node scripts/build-standalone.js
 * 
 * Strategi: Menggunakan pendekatan "concat + IIFE scope isolation".
 * Setiap modul yang sudah punya IIFE sendiri (Lexer, Engine) langsung
 * digabung. Modul yang pakai CommonJS (Parser sub-modul, Resolver,
 * Analyzer, Compiler) dibungkus dalam IIFE besar per-bagian dengan
 * require() yang di-override untuk merujuk ke global scope.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BUILD_TIME = new Date().toISOString();
const VERSION = '0.3.1';
const ROOT_DIR = path.resolve(__dirname, '..');

function readModule(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) {
    console.error('  ⚠ File tidak ditemukan: ' + absPath);
    return '';
  }
  return fs.readFileSync(absPath, 'utf-8');
}

function buildStandalone() {
  console.log('Membangun karsa.standalone.js v' + VERSION + '...');
  console.log('');
  
  const parts = [];
  
  // ===== HEADER =====
  parts.push('/**');
  parts.push(' * ============================================================================');
  parts.push(' *  KARSA v' + VERSION + ' — STANDALONE BUNDLE');
  parts.push(' * --------------------------------------------------------------------------');
  parts.push(' *  Di-generate oleh scripts/build-standalone.js');
  parts.push(' *  Build time: ' + BUILD_TIME);
  parts.push(' *');
  parts.push(' *  Seluruh modul KARSA dalam satu file untuk penggunaan di browser.');
  parts.push(' *  Tanpa memerlukan Node.js, module bundler, atau dependensi lainnya.');
  parts.push(' *');
  parts.push(' *  Penggunaan:');
  parts.push(' *    <script src="karsa.standalone.js"></script>');
  parts.push(' *    <script>Karsa.run(source);</script>');
  parts.push(' * ============================================================================');
  parts.push(' */');
  parts.push('');
  
  // ===== LEXER =====
  // Lexer sudah dalam IIFE — langsung concat
  console.log('  [1/12] Lexer...');
  parts.push('// ============================================================');
  parts.push('// LEXER (Tahap 1) — KarsaLexer');
  parts.push('// ============================================================');
  parts.push(readModule('lexer/karsa-lexer.js'));
  parts.push('');
  
  // ===== VISITOR UTILITY =====
  // Visitor pakai CommonJS — perlu dibungkus IIFE
  console.log('  [2/12] Visitor utility...');
  parts.push('// ============================================================');
  parts.push('// VISITOR UTILITY — KarsaVisitor');
  parts.push('// ============================================================');
  const visitorCode = readModule('utils/visitor.js');
  // visitor.js memerlukan token-types (TT) tapi TT tidak pernah digunakan di dalamnya
  // Berikan stub kosong untuk require ini
  const visitorCodeFixed = visitorCode.replace(
    "var TT = require('../parser/token-types');",
    "var TT = {};"
  );
  parts.push(makeBrowserIIFE(visitorCodeFixed, 'KarsaVisitor', {}));
  parts.push('');
  
  // ===== PARSER =====
  // Parser paling kompleks: punya 8 sub-modul + index.js
  // Strategi: Satu IIFE besar yang mendaftarkan semua sub-modul
  // ke registry internal, lalu index.js resolve dari situ.
  console.log('  [3/12] Parser (8 sub-modul + index)...');
  parts.push('// ============================================================');
  parts.push('// PARSER (Tahap 2) — KarsaParser');
  parts.push('// ============================================================');
  parts.push(buildParserBundle());
  parts.push('');
  
  // ===== RESOLVER =====
  console.log('  [4/12] Resolver...');
  parts.push('// ============================================================');
  parts.push('// RESOLVER (Tahap 3) — KarsaResolver');
  parts.push('// ============================================================');
  const resolverCode = readModule('resolver/karsa-resolver.js');
  parts.push(makeBrowserIIFE(resolverCode, 'KarsaResolver', {
    '../utils/visitor': 'KarsaVisitor',
    '../parser/error-codes': 'KarsaParser.ErrorCodes'
  }));
  parts.push('');
  
  // ===== DEPENDENCY GRAPH UTILITY =====
  console.log('  [5/12] Dependency graph utility...');
  parts.push('// ============================================================');
  parts.push('// DEPENDENCY GRAPH UTILITY — KarsaDependencyGraph');
  parts.push('// ============================================================');
  const depGraphCode = readModule('analyzer/dependency-graph.js');
  parts.push(makeBrowserIIFE(depGraphCode, 'KarsaDependencyGraph', {}));
  parts.push('');
  
  // ===== ANALYZER =====
  console.log('  [6/12] Analyzer...');
  parts.push('// ============================================================');
  parts.push('// ANALYZER (Tahap 4) — KarsaAnalyzer');
  parts.push('// ============================================================');
  const analyzerCode = readModule('analyzer/karsa-analyzer.js');
  parts.push(makeBrowserIIFE(analyzerCode, 'KarsaAnalyzer', {
    '../utils/visitor': 'KarsaVisitor',
    '../parser/error-codes': 'KarsaParser.ErrorCodes',
    './dependency-graph': 'KarsaDependencyGraph'
  }));
  parts.push('');
  
  // ===== COMPILER UTILITIES =====
  console.log('  [7/12] Compiler runtime emitter...');
  parts.push('// ============================================================');
  parts.push('// COMPILER RUNTIME EMITTER — KarsaRuntimeEmitter');
  parts.push('// ============================================================');
  const runtimeEmitterCode = readModule('compiler/emitters/runtime.js');
  parts.push(makeBrowserIIFE(runtimeEmitterCode, 'KarsaRuntimeEmitter', {}));
  parts.push('');

  console.log('  [8/12] Compiler codegen utils...');
  parts.push('// ============================================================');
  parts.push('// COMPILER CODEGEN UTILS — KarsaCodegen');
  parts.push('// ============================================================');
  const codegenCode = readModule('compiler/utils/codegen.js');
  parts.push(makeBrowserIIFE(codegenCode, 'KarsaCodegen', {}));
  parts.push('');

  console.log('  [9/12] Expression lowering...');
  parts.push('// ============================================================');
  parts.push('// EXPRESSION LOWERING — KarsaExpressionLowering');
  parts.push('// ============================================================');
  const expressionLoweringCode = readModule('compiler/lower/expression.js');
  parts.push(makeBrowserIIFE(expressionLoweringCode, 'KarsaExpressionLowering', {}));
  parts.push('');

  console.log('  [10/12] Statement emitters...');
  parts.push('// ============================================================');
  parts.push('// STATEMENT EMITTERS — KarsaStatementEmitters');
  parts.push('// ============================================================');
  const statementEmittersCode = readModule('compiler/emitters/statements.js');
  parts.push(makeBrowserIIFE(statementEmittersCode, 'KarsaStatementEmitters', {}));
  parts.push('');

  // ===== COMPILER =====
  console.log('  [11/12] Compiler...');
  parts.push('// ============================================================');
  parts.push('// COMPILER (Tahap 5) — KarsaCompiler');
  parts.push('// ============================================================');
  const compilerCode = readModule('compiler/karsa-compiler.js');
  parts.push(makeBrowserIIFE(compilerCode, 'KarsaCompiler', {
    '../utils/visitor': 'KarsaVisitor',
    './emitters/runtime': 'KarsaRuntimeEmitter',
    './utils/codegen': 'KarsaCodegen',
    './lower/expression': 'KarsaExpressionLowering',
    './emitters/statements': 'KarsaStatementEmitters'
  }));
  parts.push('');
  
  // ===== ENGINE =====
  // Engine sudah dalam IIFE — langsung concat
  console.log('  [12/12] Engine (main)...');
  parts.push('// ============================================================');
  parts.push('// ENGINE (Main Entry Point) — Karsa');
  parts.push('// ============================================================');
  parts.push(readModule('engine/karsa.js'));
  parts.push('');
  
  // Tulis output
  const outputPath = path.join(ROOT_DIR, 'engine', 'karsa.standalone.js');
  const content = parts.join('\n');
  fs.writeFileSync(outputPath, content, 'utf-8');
  
  const lineCount = content.split('\n').length;
  const sizeKB = Math.round(Buffer.byteLength(content, 'utf-8') / 1024);
  
  console.log('');
  console.log('✓ Standalone bundle berhasil dibuat!');
  console.log('  File: ' + outputPath);
  console.log('  Baris: ' + lineCount);
  console.log('  Ukuran: ' + sizeKB + ' KB');
}

/**
 * Bungkus kode CommonJS menjadi IIFE yang mengekspor ke global[name].
 * 
 * @param {string} code - Kode sumber modul
 * @param {string} globalName - Nama variabel global (e.g. 'KarsaResolver')
 * @param {object} deps - Mapping require path → global name
 *                         e.g. { '../utils/visitor': 'KarsaVisitor' }
 */
function makeBrowserIIFE(code, globalName, deps) {
  const lines = [
    '(function(root) {',
    '  "use strict";',
    ''
  ];
  
  // Buat fungsi require yang di-override
  if (Object.keys(deps).length > 0) {
    lines.push('  function require(name) {');
    for (const [reqPath, globalRef] of Object.entries(deps)) {
      lines.push('    if (name === "' + reqPath + '") return root.' + globalRef + ';');
    }
    lines.push('    return undefined;');
    lines.push('  }');
    lines.push('');
  }
  
  // Tambahkan module stub
  lines.push('  var module = { exports: {} };');
  lines.push('');
  
  // Indent kode sumber
  const indentedCode = code.split('\n').map(function(line) {
    return '  ' + line;
  }).join('\n');
  lines.push(indentedCode);
  lines.push('');
  
  // Ekspor ke global
  lines.push('  root.' + globalName + ' = module.exports;');
  lines.push('})(typeof self !== "undefined" ? self : this);');
  
  return lines.join('\n');
}

/**
 * Bangun Parser sebagai satu IIFE besar yang menggabungkan semua sub-modul.
 * 
 * Parser punya struktur:
 *   parser/index.js → require('./karsa-parser'), require('../utils/visitor'), dll
 *   parser/karsa-parser.js → require('./statement-parser'), require('./expression-parser'), ...
 *   parser/statement-parser.js → require('./expression-parser'), ...
 *   dll.
 * 
 * Strategi: Buat registry __mods, daftarkan setiap sub-modul,
 * override require untuk resolve dari registry.
 */
function buildParserBundle() {
  const SUBMODULES = [
    'parser/token-types.js',
    'parser/binding-powers.js',
    'parser/error-codes.js',
    'parser/ast-factory.js',
    'parser/selector-parser.js',
    'parser/expression-parser.js',
    'parser/statement-parser.js',
    'parser/karsa-parser.js'
  ];
  
  const lines = [
    '(function(root) {',
    '  "use strict";',
    '',
    '  // Registry modul internal parser',
    '  var __mods = {};',
    '',
    '  // Fungsi require internal yang resolve dari registry + globals',
    '  function require(name) {',
    '    // Cross-module references (ke modul lain di luar parser)',
    '    if (name === "../utils/visitor" || name === "./visitor") return root.KarsaVisitor;',
    '    if (name === "../lexer/karsa-lexer") return root.KarsaLexer;',
    '    // Internal references — normalize path',
    '    var resolved = name;',
    '    if (name.indexOf("./") === 0) resolved = name.substring(2);',
    '    if (name.indexOf("../parser/") === 0) resolved = name.substring(10);',
    '    if (__mods[resolved]) return __mods[resolved];',
    '    return {};',
    '  }',
    ''
  ];
  
  // Daftarkan setiap sub-modul
  SUBMODULES.forEach(function(subFile) {
    const code = readModule(subFile);
    const modName = path.basename(subFile, '.js');
    
    lines.push('  // --- ' + subFile + ' ---');
    lines.push('  (function() {');
    lines.push('    var module = { exports: {} };');
    lines.push('    ' + code.split('\n').join('\n    '));
    lines.push('    __mods["' + modName + '"] = module.exports;');
    lines.push('  })();');
    lines.push('');
  });
  
  // Index.js (entry point)
  const indexCode = readModule('parser/index.js');
  lines.push('  // --- parser/index.js (entry point) ---');
  lines.push('  (function() {');
  lines.push('    var module = { exports: {} };');
  lines.push('    ' + indexCode.split('\n').join('\n    '));
  lines.push('    root.KarsaParser = module.exports;');
  lines.push('  })();');
  lines.push('');
  lines.push('})(typeof self !== "undefined" ? self : this);');
  
  return lines.join('\n');
}

// Jalankan
buildStandalone();
