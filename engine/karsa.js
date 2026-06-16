/**
 * KARSA v0.3.1 — MAIN ENGINE
 * ----------------------------------------------------------------------------
 * Unified entry point untuk KARSA. Menghubungkan seluruh tahap pipeline.
 * Dapat digunakan di lingkungan Node.js maupun Browser.
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Environment: Node.js / CommonJS
    const Lexer = require('../lexer/karsa-lexer');
    const Parser = require('../parser/index');
    const Resolver = require('../resolver/karsa-resolver');
    const Analyzer = require('../analyzer/karsa-analyzer');
    const Compiler = require('../compiler/karsa-compiler');
    module.exports = factory(Lexer, Parser, Resolver, Analyzer, Compiler);
  } else {
    // Environment: Browser (Requires Lexer, Parser, etc. to be loaded)
    root.Karsa = factory(
      root.KarsaLexer, 
      root.KarsaParser, 
      root.KarsaResolver, 
      root.KarsaAnalyzer, 
      root.KarsaCompiler
    );
  }
}(typeof self !== 'undefined' ? self : this, function (Lexer, Parser, Resolver, Analyzer, Compiler) {
  'use strict';

  const Karsa = {
    version: '0.3.1',

    /**
     * Memproses kode sumber Karsa menjadi JavaScript
     */
    compile: function (source, options = {}) {
      if (options.recover) {
        var allErrors = [];
<<<<<<< HEAD
        var allWarnings = [];
=======
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
        var stages = {};
        var ast = null;
        
        // 1. Lexer
        var lexResult = Lexer.tokenize(source);
        stages.lexer = { ran: true, errors: lexResult.errors.length };
        if (lexResult.errors.length > 0) {
          allErrors = allErrors.concat(lexResult.errors);
        }
        
        // 2. Parser - only if we have tokens
        var parseResult = null;
        if (lexResult.tokens && lexResult.tokens.length > 0) {
          parseResult = Parser.parse(lexResult.tokens);
          stages.parser = { ran: true, errors: parseResult.errors.length };
          if (parseResult.errors.length > 0) {
            allErrors = allErrors.concat(parseResult.errors);
          }
          ast = parseResult.ast;
        } else {
          stages.parser = { ran: false, reason: 'lexer failed' };
        }
        
        // 3. Resolver
        if (ast && parseResult && parseResult.errors.length === 0) {
          var resolver = new Resolver();
          var resolveResult = resolver.resolve(ast);
          stages.resolver = { ran: true, errors: resolveResult.errors.length };
          if (resolveResult.errors.length > 0) {
            allErrors = allErrors.concat(resolveResult.errors);
          }
<<<<<<< HEAD
          if (resolveResult.warnings && resolveResult.warnings.length > 0) {
            allWarnings = allWarnings.concat(resolveResult.warnings);
          }
=======
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
          ast = resolveResult.ast;
        } else if (ast) {
          // Try resolver even with parse errors if AST exists
          try {
            var resolver = new Resolver();
            var resolveResult = resolver.resolve(ast);
            stages.resolver = { ran: true, errors: resolveResult.errors.length };
            if (resolveResult.errors.length > 0) {
              allErrors = allErrors.concat(resolveResult.errors);
            }
<<<<<<< HEAD
            if (resolveResult.warnings && resolveResult.warnings.length > 0) {
              allWarnings = allWarnings.concat(resolveResult.warnings);
            }
=======
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
            ast = resolveResult.ast;
          } catch(e) {
            stages.resolver = { ran: false, error: e.message };
          }
        } else {
          stages.resolver = { ran: false, reason: 'no AST' };
        }
        
        // 4. Analyzer
        if (ast) {
          try {
            var analyzer = new Analyzer();
<<<<<<< HEAD
            var analyzeResult = analyzer.analyze(ast, options);
=======
            var analyzeResult = analyzer.analyze(ast);
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
            stages.analyzer = { ran: true, errors: analyzeResult.errors.length, warnings: analyzeResult.warnings.length };
            if (analyzeResult.errors.length > 0) {
              allErrors = allErrors.concat(analyzeResult.errors);
            }
<<<<<<< HEAD
            if (analyzeResult.warnings && analyzeResult.warnings.length > 0) {
              allWarnings = allWarnings.concat(analyzeResult.warnings);
            }
=======
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
            ast = analyzeResult.ast;
          } catch(e) {
            stages.analyzer = { ran: false, error: e.message };
          }
        }
        
        // 5. Compiler - only if no critical errors
        var javascript = null;
        if (ast && allErrors.filter(function(e) { return e.severity !== 'warning'; }).length === 0) {
          try {
            var compiler = new Compiler();
            javascript = compiler.compile(ast);
            stages.compiler = { ran: true };
          } catch(e) {
            stages.compiler = { ran: false, error: e.message };
            allErrors.push({ kode: 'E0000', code: 'E0000', pesan: 'Compiler error: ' + e.message, message: 'Compiler error: ' + e.message, severity: 'error', saran: '', suggestion: '' });
          }
        }
        
        return {
          success: allErrors.filter(function(e) { return e.severity !== 'warning'; }).length === 0,
          js: javascript,
          errors: allErrors,
<<<<<<< HEAD
          warnings: allWarnings.concat(allErrors.filter(function(e) { return e.severity === 'warning'; })),
          diagnostics: allErrors.concat(allWarnings),
          stages: stages,
          ast: ast,
          semantic: ast ? ast.semantic : null
=======
          warnings: allErrors.filter(function(e) { return e.severity === 'warning'; }),
          stages: stages,
          ast: ast
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
        };
      } else {
        try {
          // 1. Lexer
          const lexResult = Lexer.tokenize(source);
<<<<<<< HEAD
          if (lexResult.errors.length > 0) return { success: false, errors: lexResult.errors, diagnostics: lexResult.errors, stage: 'Lexer' };
=======
          if (lexResult.errors.length > 0) return { success: false, errors: lexResult.errors, stage: 'Lexer' };
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37

          // 2. Parser
          var parseResult;
          try {
            parseResult = Parser.parse(lexResult.tokens);
          } catch (parseErr) {
<<<<<<< HEAD
            var parserException = { code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'Parser exception: ' + parseErr.message, pesan: 'Parser exception: ' + parseErr.message, suggestion: 'Terjadi kesalahan internal parser.', saran: 'Terjadi kesalahan internal parser.', loc: null };
            return {
              success: false,
              errors: [parserException],
              diagnostics: [parserException],
              stage: 'Parser'
            };
          }
          if (parseResult.errors.length > 0) return { success: false, errors: parseResult.errors, diagnostics: parseResult.errors, stage: 'Parser' };
=======
            return {
              success: false,
              errors: [{ code: 'E0000', kode: 'E0000', severity: 'error', message: 'Parser exception: ' + parseErr.message, pesan: 'Parser exception: ' + parseErr.message, suggestion: 'Terjadi kesalahan internal parser.', saran: 'Terjadi kesalahan internal parser.' }],
              stage: 'Parser'
            };
          }
          if (parseResult.errors.length > 0) return { success: false, errors: parseResult.errors, stage: 'Parser' };
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37

          // 3. Resolver
          var resolveResult;
          try {
            const resolver = new Resolver();
            resolveResult = resolver.resolve(parseResult.ast);
          } catch (resolveErr) {
<<<<<<< HEAD
            var resolverException = { code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'Resolver exception: ' + resolveErr.message, pesan: 'Resolver exception: ' + resolveErr.message, suggestion: 'Terjadi kesalahan internal resolver.', saran: 'Terjadi kesalahan internal resolver.', loc: null };
            return {
              success: false,
              errors: [resolverException],
              diagnostics: [resolverException],
              stage: 'Resolver'
            };
          }
          if (resolveResult.errors.length > 0) return { success: false, errors: resolveResult.errors, warnings: resolveResult.warnings || [], diagnostics: resolveResult.errors.concat(resolveResult.warnings || []), stage: 'Resolver' };
=======
            return {
              success: false,
              errors: [{ code: 'E0000', kode: 'E0000', severity: 'error', message: 'Resolver exception: ' + resolveErr.message, pesan: 'Resolver exception: ' + resolveErr.message, suggestion: 'Terjadi kesalahan internal resolver.', saran: 'Terjadi kesalahan internal resolver.' }],
              stage: 'Resolver'
            };
          }
          if (resolveResult.errors.length > 0) return { success: false, errors: resolveResult.errors, stage: 'Resolver' };
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37

          // 4. Analyzer
          var analyzeResult;
          try {
            const analyzer = new Analyzer();
<<<<<<< HEAD
            analyzeResult = analyzer.analyze(resolveResult.ast, options);
          } catch (analyzeErr) {
            var analyzerException = { code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'Analyzer exception: ' + analyzeErr.message, pesan: 'Analyzer exception: ' + analyzeErr.message, suggestion: 'Terjadi kesalahan internal analyzer.', saran: 'Terjadi kesalahan internal analyzer.', loc: null };
            return {
              success: false,
              errors: [analyzerException],
              diagnostics: [analyzerException],
              stage: 'Analyzer'
            };
          }
          if (analyzeResult.errors.length > 0) return { success: false, errors: analyzeResult.errors, warnings: (resolveResult.warnings || []).concat(analyzeResult.warnings || []), diagnostics: analyzeResult.errors.concat(resolveResult.warnings || [], analyzeResult.warnings || []), stage: 'Analyzer' };
=======
            analyzeResult = analyzer.analyze(resolveResult.ast);
          } catch (analyzeErr) {
            return {
              success: false,
              errors: [{ code: 'E0000', kode: 'E0000', severity: 'error', message: 'Analyzer exception: ' + analyzeErr.message, pesan: 'Analyzer exception: ' + analyzeErr.message, suggestion: 'Terjadi kesalahan internal analyzer.', saran: 'Terjadi kesalahan internal analyzer.' }],
              stage: 'Analyzer'
            };
          }
          if (analyzeResult.errors.length > 0) return { success: false, errors: analyzeResult.errors, stage: 'Analyzer' };
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37

          // 5. Compiler
          var javascript;
          try {
            const compiler = new Compiler();
            javascript = compiler.compile(analyzeResult.ast);
          } catch (compileErr) {
<<<<<<< HEAD
            var compilerException = { code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'Compiler exception: ' + compileErr.message, pesan: 'Compiler exception: ' + compileErr.message, suggestion: 'Terjadi kesalahan internal compiler.', saran: 'Terjadi kesalahan internal compiler.', loc: null };
            return {
              success: false,
              errors: [compilerException],
              diagnostics: [compilerException],
=======
            return {
              success: false,
              errors: [{ code: 'E0000', kode: 'E0000', severity: 'error', message: 'Compiler exception: ' + compileErr.message, pesan: 'Compiler exception: ' + compileErr.message, suggestion: 'Terjadi kesalahan internal compiler.', saran: 'Terjadi kesalahan internal compiler.' }],
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
              stage: 'Compiler'
            };
          }

          return {
            success: true,
            js: javascript,
<<<<<<< HEAD
            warnings: (resolveResult.warnings || []).concat(analyzeResult.warnings || []),
            diagnostics: (resolveResult.warnings || []).concat(analyzeResult.warnings || []),
            ast: analyzeResult.ast,
            semantic: analyzeResult.ast ? analyzeResult.ast.semantic : null
=======
            warnings: analyzeResult.warnings,
            ast: analyzeResult.ast
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
          };
        } catch (err) {
          console.error('=== SYSTEM ERROR STACK ===');
          console.error(err.stack);
          console.error('=========================');
<<<<<<< HEAD
          var systemException = { 
                  code: 'E0000',
                  kode: 'E0000',
                  severity: 'error',
                  stage: 'System',
                  message: err.message,
                  pesan: err.message,
                  suggestion: 'Terjadi kesalahan sistem. Lihat stack trace di atas.',
                  saran: 'Terjadi kesalahan sistem. Lihat stack trace di atas.',
                  loc: null
              };
          return { 
              success: false, 
              errors: [systemException],
              diagnostics: [systemException], 
=======
          return { 
              success: false, 
              errors: [{ 
                  code: 'E0000',
                  kode: 'E0000',
                  severity: 'error',
                  message: err.message,
                  pesan: err.message,
                  suggestion: 'Terjadi kesalahan sistem. Lihat stack trace di atas.',
                  saran: 'Terjadi kesalahan sistem. Lihat stack trace di atas.'
              }], 
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
              stage: 'System' 
          };
        }
      }
    },

    /**
<<<<<<< HEAD
     * Memetakan baris JavaScript ter-generate ke lokasi source KARSA terdekat.
     * Menggunakan komentar `// @karsa-source line:column NodeType` dari compiler.
     */
    mapGeneratedLine: function(js, generatedLine) {
      const lines = String(js || '').split('\n');
      const targetLine = Math.max(1, generatedLine || 1);
      let nearest = null;
      for (let i = 0; i < Math.min(targetLine, lines.length); i++) {
        const match = /@karsa-source\s+(\d+):(\d+)\s+([A-Za-z0-9_]+)/.exec(lines[i]);
        if (match) {
          nearest = {
            generatedLine: i + 1,
            sourceLine: parseInt(match[1], 10),
            sourceColumn: parseInt(match[2], 10),
            nodeType: match[3]
          };
        }
      }
      return nearest;
    },

    /**
     * Memetakan runtime error stack sederhana ke lokasi source KARSA jika ada.
     */
    mapRuntimeError: function(error, js) {
      const stack = error && error.stack ? String(error.stack) : '';
      const match = /:(\d+):(\d+)\)?\s*$/.exec(stack.split('\n')[1] || '') || /:(\d+):(\d+)/.exec(stack);
      if (!match) return null;
      const generatedLine = parseInt(match[1], 10);
      const generatedColumn = parseInt(match[2], 10);
      const mapped = this.mapGeneratedLine(js, generatedLine);
      return mapped ? { ...mapped, generatedColumn } : null;
    },

    /**
     * Menginspeksi source KARSA dan mengembalikan semantic model JSON-safe.
     * Refinement lvl.2 tooling API.
     */
    inspect: function(source, options = {}) {
      const result = this.compile(source, { ...options, recover: true });
      const semantic = result.ast && result.ast.semantic ? result.ast.semantic : null;
      return {
        success: result.success,
        diagnostics: result.diagnostics || result.errors || [],
        stages: result.stages || null,
        semantic: semantic && semantic.normalized ? semantic.normalized : {
          symbols: [],
          references: [],
          dependencies: [],
          cycles: []
        }
      };
    },

    /**
     * Mengembalikan dependency graph semantic JSON-safe.
     * Refinement lvl.2 tooling API.
     */
    graph: function(source, options = {}) {
      const inspected = this.inspect(source, options);
      return {
        success: inspected.success,
        diagnostics: inspected.diagnostics,
        dependencies: inspected.semantic.dependencies || [],
        cycles: inspected.semantic.cycles || [],
        symbols: inspected.semantic.symbols || []
      };
    },

    /**
=======
>>>>>>> a767ce64c4b94e2b89d39b76d5aa9551ef1d5e37
     * Menjalankan kode Karsa langsung di browser
     */
    run: function (source) {
      const result = this.compile(source);
      if (result.success) {
        // Gunakan script element untuk eksekusi yang lebih bersih daripada eval
        const script = document.createElement('script');
        script.textContent = result.js;
        document.head.appendChild(script);
      } else {
        console.error(`[KARSA ${result.stage} Error]`, result.errors);
      }
    },

    /**
     * Inisialisasi otomatis untuk tag <script type="text/karsa">
     */
    init: function () {
      if (typeof document !== 'undefined') {
        const scripts = document.querySelectorAll('script[type="text/karsa"]');
        scripts.forEach(script => {
          if (script.src) {
            // Jika ada src, fetch file .ks nya
            fetch(script.src)
              .then(response => response.text())
              .then(code => this.run(code))
              .catch(err => console.error("Gagal memuat file Karsa:", err));
          } else if (script.textContent) {
            // Jika inline
            this.run(script.textContent);
          }
        });
      }
    }
  };

  // Jalankan init otomatis jika di browser
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => Karsa.init());
  }

  return Karsa;
}));
