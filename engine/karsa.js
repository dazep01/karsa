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
            var analyzeResult = analyzer.analyze(ast);
            stages.analyzer = { ran: true, errors: analyzeResult.errors.length, warnings: analyzeResult.warnings.length };
            if (analyzeResult.errors.length > 0) {
              allErrors = allErrors.concat(analyzeResult.errors);
            }
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
            allErrors.push({ kode: 'E0000', pesan: 'Compiler error: ' + e.message });
          }
        }
        
        return {
          success: allErrors.filter(function(e) { return e.severity !== 'warning'; }).length === 0,
          js: javascript,
          errors: allErrors,
          warnings: allErrors.filter(function(e) { return e.severity === 'warning'; }),
          stages: stages,
          ast: ast
        };
      } else {
        try {
          // 1. Lexer
          const lexResult = Lexer.tokenize(source);
          if (lexResult.errors.length > 0) return { success: false, errors: lexResult.errors, stage: 'Lexer' };

          // 2. Parser
          var parseResult;
          try {
            parseResult = Parser.parse(lexResult.tokens);
          } catch (parseErr) {
            return {
              success: false,
              errors: [{ code: 'E0000', severity: 'error', message: 'Parser exception: ' + parseErr.message, suggestion: 'Terjadi kesalahan internal parser.' }],
              stage: 'Parser'
            };
          }
          if (parseResult.errors.length > 0) return { success: false, errors: parseResult.errors, stage: 'Parser' };

          // 3. Resolver
          var resolveResult;
          try {
            const resolver = new Resolver();
            resolveResult = resolver.resolve(parseResult.ast);
          } catch (resolveErr) {
            return {
              success: false,
              errors: [{ code: 'E0000', severity: 'error', message: 'Resolver exception: ' + resolveErr.message, suggestion: 'Terjadi kesalahan internal resolver.' }],
              stage: 'Resolver'
            };
          }
          if (resolveResult.errors.length > 0) return { success: false, errors: resolveResult.errors, stage: 'Resolver' };

          // 4. Analyzer
          var analyzeResult;
          try {
            const analyzer = new Analyzer();
            analyzeResult = analyzer.analyze(resolveResult.ast);
          } catch (analyzeErr) {
            return {
              success: false,
              errors: [{ code: 'E0000', severity: 'error', message: 'Analyzer exception: ' + analyzeErr.message, suggestion: 'Terjadi kesalahan internal analyzer.' }],
              stage: 'Analyzer'
            };
          }
          if (analyzeResult.errors.length > 0) return { success: false, errors: analyzeResult.errors, stage: 'Analyzer' };

          // 5. Compiler
          var javascript;
          try {
            const compiler = new Compiler();
            javascript = compiler.compile(analyzeResult.ast);
          } catch (compileErr) {
            return {
              success: false,
              errors: [{ code: 'E0000', severity: 'error', message: 'Compiler exception: ' + compileErr.message, suggestion: 'Terjadi kesalahan internal compiler.' }],
              stage: 'Compiler'
            };
          }

          return {
            success: true,
            js: javascript,
            warnings: analyzeResult.warnings,
            ast: analyzeResult.ast
          };
        } catch (err) {
          console.error('=== SYSTEM ERROR STACK ===');
          console.error(err.stack);
          console.error('=========================');
          return { 
              success: false, 
              errors: [{ 
                  code: 'E0000',
                  severity: 'error',
                  message: err.message,
                  suggestion: 'Terjadi kesalahan sistem. Lihat stack trace di atas.'
              }], 
              stage: 'System' 
          };
        }
      }
    },

    /**
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