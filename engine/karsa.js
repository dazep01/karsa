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
      try {
        // 1. Lexer
        const lexResult = Lexer.tokenize(source);
        if (lexResult.errors.length > 0) return { success: false, errors: lexResult.errors, stage: 'Lexer' };

        // 2. Parser
        const parseResult = Parser.parse(lexResult.tokens);
        if (parseResult.errors.length > 0) return { success: false, errors: parseResult.errors, stage: 'Parser' };

        // 3. Resolver
        const resolver = new Resolver();
        const resolveResult = resolver.resolve(parseResult.ast);
        if (resolveResult.errors.length > 0) return { success: false, errors: resolveResult.errors, stage: 'Resolver' };

        // 4. Analyzer
        const analyzer = new Analyzer();
        const analyzeResult = analyzer.analyze(resolveResult.ast);
        if (analyzeResult.errors.length > 0) return { success: false, errors: analyzeResult.errors, stage: 'Analyzer' };

        // 5. Compiler
        const compiler = new Compiler();
        const javascript = compiler.compile(analyzeResult.ast);

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
                kode: 'E0000',
                pesan: err.message,
                saran: 'Terjadi kesalahan sistem. Lihat stack trace di atas.'
            }], 
            stage: 'System' 
        };
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
