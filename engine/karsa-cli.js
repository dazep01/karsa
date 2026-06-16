#!/usr/bin/env node
/**
 * KARSA v0.3.1 — Command Line Interface
 * ----------------------------------------------------------------------------
 * CLI lengkap untuk KARSA DSL: compile, build, watch, format, init, check.
 * 
 * Penggunaan:
 *   karsa <file.ks>                     Compile file dan cetak ke stdout
 *   karsa compile <file.ks> [-o out.js]  Compile file ke stdout/file output
 *   karsa build [dir] [-o outdir]        Build semua .ks dalam direktori
 *   karsa watch [dir] [-o outdir]        Watch & auto-rebuild saat perubahan
 *   karsa format <file.ks> [-w]          Format/beautify kode KARSA
 *   karsa check <file.ks>                Cek sintaks tanpa compile (lint)
 *   karsa init [nama]                    Buat project KARSA baru
 *   karsa version                        Tampilkan versi
 *   karsa help                           Tampilkan bantuan
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Karsa = require('./karsa');

// ---------------------------------------------------------------------------
// Utilitas CLI
// ---------------------------------------------------------------------------

function getVersion() {
  try {
    const pkg = require('../package.json');
    return pkg.version || '0.3.1';
  } catch (e) {
    return Karsa.version || '0.3.1';
  }
}

function printBanner() {
  const v = getVersion();
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   KARSA v' + v + ' — DSL Berbahasa Indonesia  ║');
  console.log('  ║   Reactive UI · No Virtual DOM      ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
}

function printHelp() {
  printBanner();
  console.log('Penggunaan:');
  console.log('  karsa <file.ks>                     Compile & cetak ke stdout');
  console.log('  karsa compile <file.ks> [-o file]   Compile ke stdout atau file');
  console.log('  karsa build [dir] [-o dir]            Build semua .ks dalam direktori');
  console.log('  karsa watch [dir] [-o dir]           Watch & auto-rebuild');
  console.log('  karsa format <file.ks> [-w]          Format/beautify kode KARSA');
  console.log('  karsa check <file.ks>                Cek sintaks tanpa compile');
  console.log('  karsa inspect <file.ks> [--json]     Tampilkan semantic symbols');
  console.log('  karsa graph <file.ks> [--json]       Tampilkan dependency graph');
  console.log('  karsa init [nama]                    Buat project KARSA baru');
  console.log('  karsa version                        Tampilkan versi');
  console.log('  karsa help                           Tampilkan bantuan');
  console.log('');
  console.log('Flag:');
  console.log('  -o, --output <path>     Path output file/direktori');
  console.log('  -w, --write             Tulis langsung ke file (format)');
  console.log('  --recover               Mode recovery (lanjutkan meski ada error)');
  console.log('  --sourcemap             Sertakan source map');
  console.log('  --verbose               Output detail untuk debugging');
  console.log('  --minify                Minify output JavaScript');
  console.log('  --json                  Output JSON untuk command check/inspect');
  console.log('  --quiet                 Kurangi output non-JSON');
  console.log('  --strict-usage          Warning unused untuk fungsi/komponen juga');
  console.log('');
}

/**
 * Parser argumen sederhana.
 * Mengembalikan { command, args, flags }
 */
function parseArgs(argv) {
  const args = [];
  const flags = {};
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      // --flag=value atau --flag
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        flags[arg.substring(2, eqIndex)] = arg.substring(eqIndex + 1);
      } else {
        // Cek apakah flag ini butuh value
        const flagName = arg.substring(2);
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          // Bisa jadi value untuk flag ini
          // Tapi jika flag boolean, jangan konsumsi next
          const booleanFlags = ['recover', 'verbose', 'sourcemap', 'minify', 'write', 'json', 'quiet', 'strict-usage'];
          if (booleanFlags.indexOf(flagName) !== -1) {
            flags[flagName] = true;
          } else {
            flags[flagName] = nextArg;
            i++;
          }
        } else {
          flags[flagName] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short flags
      const nextArg = argv[i + 1];
      switch (arg) {
        case '-o':
          if (nextArg) { flags.output = nextArg; i++; }
          break;
        case '-w':
          flags.write = true;
          break;
        case '-v':
          flags.verbose = true;
          break;
        case '-h':
          flags.help = true;
          break;
        default:
          flags[arg.substring(1)] = true;
      }
    } else {
      args.push(arg);
    }
  }
  
  return { args, flags };
}

/**
 * Kumpulkan file .ks secara rekursif dari direktori.
 */
function collectKsFiles(dir) {
  const results = [];
  
  if (!fs.existsSync(dir)) {
    console.error('Error: Direktori tidak ditemukan: ' + dir);
    return results;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Lewati node_modules dan hidden dirs
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results.push(...collectKsFiles(fullPath));
    } else if (entry.name.endsWith('.ks')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Compile satu file KARSA dan kembalikan hasil.
 */
function compileFile(filePath, options) {
  options = options || {};
  
  if (!fs.existsSync(filePath)) {
    console.error('Error: File tidak ditemukan: ' + filePath);
    return null;
  }
  
  const source = fs.readFileSync(filePath, 'utf-8');
  const compileOpts = {
    source: path.basename(filePath)
  };
  if (options.recover) compileOpts.recover = true;
  if (options['strict-usage']) compileOpts.usageWarnings = 'strict';
  if (options.verbose) compileOpts.verbose = true;
  
  const startTime = Date.now();
  const result = Karsa.compile(source, compileOpts);
  const elapsed = Date.now() - startTime;
  
  if (options.verbose) {
    console.error('[verbose] File: ' + filePath);
    console.error('[verbose] Waktu: ' + elapsed + 'ms');
    if (result.warnings && result.warnings.length > 0) {
      console.error('[verbose] Peringatan: ' + result.warnings.length);
    }
  }
  
  return result;
}

/**
 * Cetak error dengan format yang rapi.
 */
function printErrors(result) {
  if (!result.errors || result.errors.length === 0) return;
  
  const errors = result.errors;
  const stage = result.stage || (result.stages ? 'Pipeline' : 'Unknown');
  
  console.error('\n✗ GAGAL di tahap ' + stage + ':');
  
  errors.forEach(function (err) {
    const kode = err.kode || err.code || 'E0000';
    const pesan = err.pesan || err.message || 'Kesalahan tidak diketahui';
    
    let posisi = '';
    if (err.loc) {
      if (typeof err.loc.baris === 'number') {
        posisi = ' (Baris ' + err.loc.baris + ')';
      } else if (err.loc.start && typeof err.loc.start.line === 'number') {
        posisi = ' (Baris ' + err.loc.start.line + ')';
      }
    } else if (typeof err.baris === 'number') {
      posisi = ' (Baris ' + err.baris + ')';
    }
    
    console.error('  [' + kode + '] ' + pesan + posisi);
    
    const saran = err.saran || err.suggestion;
    if (saran) {
      console.error('   💡 Saran: ' + saran);
    }
  });
  
  // Warnings
  const warnings = result.warnings || errors.filter(function(e) { return e.severity === 'warning'; });
  if (warnings && warnings.length > 0) {
    console.error('\n⚠ PERINGATAN:');
    warnings.forEach(function (w) {
      const kode = w.kode || w.code || 'W0000';
      const pesan = w.pesan || w.message || '';
      console.error('  [' + kode + '] ' + pesan);
    });
  }
}


/**
 * Normalisasi diagnostics untuk output JSON publik.
 * Menghindari circular reference dari AST/semantic internal.
 */
function normalizeDiagnostic(diag) {
  if (!diag) return null;
  var normalized = {
    code: diag.code || diag.kode || 'E0000',
    severity: diag.severity || ((diag.code || diag.kode || '').charAt(0) === 'W' ? 'warning' : 'error'),
    stage: (diag.stage || '').toString().toLowerCase() || 'system',
    message: diag.message || diag.pesan || '',
    suggestion: diag.suggestion || diag.saran || '',
    loc: diag.loc || null
  };
  if (Array.isArray(diag.relatedInformation)) {
    normalized.relatedInformation = diag.relatedInformation.map(function(info) {
      return {
        message: info && info.message ? info.message : '',
        loc: info && info.loc ? info.loc : null
      };
    });
  }
  return normalized;
}

function collectDiagnostics(result) {
  var diagnostics = [];
  if (result) {
    if (Array.isArray(result.diagnostics)) diagnostics = diagnostics.concat(result.diagnostics);
    else {
      if (Array.isArray(result.errors)) diagnostics = diagnostics.concat(result.errors);
      if (Array.isArray(result.warnings)) diagnostics = diagnostics.concat(result.warnings);
    }
  }
  return diagnostics
    .map(normalizeDiagnostic)
    .filter(Boolean);
}

function printCheckJson(filePath, result) {
  var diagnostics = collectDiagnostics(result);
  var payload = {
    version: getVersion(),
    command: 'check',
    file: filePath,
    success: !!(result && result.success),
    stage: result ? (result.stage || null) : null,
    diagnostics: diagnostics,
    errors: diagnostics.filter(function(d) { return d.severity !== 'warning'; }),
    warnings: diagnostics.filter(function(d) { return d.severity === 'warning'; })
  };
  console.log(JSON.stringify(payload, null, 2));
}

/**
 * Minify JavaScript sederhana (hapus komentar, whitespace berlebih).
 * Ini minifier dasar tanpa dependensi tambahan.
 */
function simpleMinify(js) {
  return js
    .replace(/\/\/.*$/gm, '')          // Hapus single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')  // Hapus multi-line comments
    .replace(/^\s+/gm, '')             // Hapus leading whitespace per line
    .replace(/\n+/g, '\n')             // Collapse newlines
    .replace(/\n/g, ' ')               // Newline → space
    .replace(/\s+/g, ' ')              // Collapse spaces
    .trim();
}

/**
 * Buat source map sederhana (baris mapping).
 * Format: Mappings antara source KARSA dan output JS.
 */
function generateSourceMap(sourceFilePath, source, generated) {
  // Source map v3 minimal + x_karsaMappings extension.
  // mappings VLQ masih dikosongkan, tetapi compiler menulis komentar
  // `// @karsa-source line:column NodeType` yang dapat dibaca tooling.
  const generatedLines = generated.split('\n');
  const karsaMappings = [];

  generatedLines.forEach(function(line, index) {
    const match = /@karsa-source\s+(\d+):(\d+)\s+([A-Za-z0-9_]+)/.exec(line);
    if (match) {
      karsaMappings.push({
        generatedLine: index + 1,
        generatedColumn: 1,
        sourceLine: parseInt(match[1], 10),
        sourceColumn: parseInt(match[2], 10),
        nodeType: match[3]
      });
    }
  });

  const map = {
    version: 3,
    file: path.basename(sourceFilePath, '.ks') + '.js',
    sources: [path.basename(sourceFilePath)],
    sourcesContent: [source],
    names: [],
    mappings: '',
    x_karsaMappings: karsaMappings
  };
  
  return JSON.stringify(map, null, 2);
}

// ---------------------------------------------------------------------------
// Command Handlers
// ---------------------------------------------------------------------------

/**
 * `karsa version` — Tampilkan versi
 */
function cmdVersion() {
  const v = getVersion();
  console.log('karsa v' + v);
}

/**
 * `karsa help` — Tampilkan bantuan
 */
function cmdHelp() {
  printHelp();
}

/**
 * `karsa compile <file.ks>` atau `karsa <file.ks>` — Compile satu file
 */
function cmdCompile(parsed) {
  const filePath = parsed.args[0];
  if (!filePath) {
    console.error('Error: Tentukan file .ks untuk di-compile.');
    console.error('Penggunaan: karsa compile <file.ks> [-o output.js]');
    process.exit(1);
  }
  
  const absPath = path.resolve(filePath);
  const result = compileFile(absPath, parsed.flags);
  
  if (!result) {
    process.exit(1);
  }
  
  if (!result.success) {
    printErrors(result);
    process.exit(1);
  }
  
  let output = result.js;
  
  // Minify jika diminta
  if (parsed.flags.minify) {
    output = simpleMinify(output);
  }
  
  // Output ke file atau stdout
  if (parsed.flags.output) {
    const outPath = path.resolve(parsed.flags.output);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, 'utf-8');
    
    // Source map
    if (parsed.flags.sourcemap) {
      const source = fs.readFileSync(absPath, 'utf-8');
      const mapContent = generateSourceMap(absPath, source, output);
      const mapPath = outPath + '.map';
      fs.writeFileSync(mapPath, mapContent, 'utf-8');
      // Tambahkan sourceMappingURL ke output
      output += '\n//# sourceMappingURL=' + path.basename(mapPath);
      fs.writeFileSync(outPath, output, 'utf-8');
      console.log('✓ Compiled: ' + filePath + ' → ' + parsed.flags.output + ' (+sourcemap)');
    } else {
      console.log('✓ Compiled: ' + filePath + ' → ' + parsed.flags.output);
    }
  } else {
    console.log(output);
  }
}

/**
 * `karsa build [dir]` — Build semua file .ks dalam direktori
 */
function cmdBuild(parsed) {
  const srcDir = parsed.args[0] || '.';
  const outDir = parsed.flags.output || 'dist';
  const absSrcDir = path.resolve(srcDir);
  const absOutDir = path.resolve(outDir);
  
  const files = collectKsFiles(absSrcDir);
  
  if (files.length === 0) {
    console.log('Tidak ditemukan file .ks di: ' + absSrcDir);
    return;
  }
  
  console.log('Membangun ' + files.length + ' file KARSA...');
  console.log('Sumber: ' + absSrcDir);
  console.log('Output: ' + absOutDir);
  console.log('');
  
  let successCount = 0;
  let errorCount = 0;
  
  files.forEach(function (filePath) {
    // Hitung path relatif untuk menjaga struktur direktori
    const relPath = path.relative(absSrcDir, filePath);
    const outPath = path.join(absOutDir, relPath.replace(/\.ks$/, '.js'));
    
    const result = compileFile(filePath, parsed.flags);
    
    if (!result || !result.success) {
      console.error('✗ GAGAL: ' + relPath);
      if (result) printErrors(result);
      errorCount++;
      return;
    }
    
    let output = result.js;
    if (parsed.flags.minify) {
      output = simpleMinify(output);
    }
    
    // Tulis output
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, 'utf-8');
    
    // Source map
    if (parsed.flags.sourcemap) {
      const source = fs.readFileSync(filePath, 'utf-8');
      const mapContent = generateSourceMap(filePath, source, output);
      const mapPath = outPath + '.map';
      fs.writeFileSync(mapPath, mapContent, 'utf-8');
      output += '\n//# sourceMappingURL=' + path.basename(mapPath);
      fs.writeFileSync(outPath, output, 'utf-8');
    }
    
    console.log('✓ ' + relPath + ' → ' + path.relative(absOutDir, outPath) || outPath);
    successCount++;
  });
  
  console.log('');
  console.log('Selesai: ' + successCount + ' berhasil, ' + errorCount + ' gagal');
  
  if (errorCount > 0) {
    process.exit(1);
  }
}

/**
 * `karsa watch [dir]` — Watch & auto-rebuild
 */
function cmdWatch(parsed) {
  const srcDir = parsed.args[0] || '.';
  const outDir = parsed.flags.output || 'dist';
  const absSrcDir = path.resolve(srcDir);
  const absOutDir = path.resolve(outDir);
  
  let chokidar;
  try {
    chokidar = require('chokidar');
  } catch (e) {
    console.error('Error: chokidar diperlukan untuk watch mode.');
    console.error('Jalankan: npm install chokidar');
    console.error('Atau: npm install');
    process.exit(1);
  }
  
  console.log('Memantau perubahan file .ks di: ' + absSrcDir);
  console.log('Output ke: ' + absOutDir);
  console.log('Tekan Ctrl+C untuk berhenti.');
  console.log('');
  
  // Build awal
  console.log('--- Build Awal ---');
  cmdBuild(parsed);
  console.log('');
  console.log('--- Memantau Perubahan ---');
  
  const watcher = chokidar.watch('**/*.ks', {
    cwd: absSrcDir,
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true
  });
  
  watcher.on('change', function (relPath) {
    console.log('\nPerubahan terdeteksi: ' + relPath);
    const filePath = path.join(absSrcDir, relPath);
    const outPath = path.join(absOutDir, relPath.replace(/\.ks$/, '.js'));
    
    const result = compileFile(filePath, parsed.flags);
    
    if (!result || !result.success) {
      console.error('✗ GAGAL: ' + relPath);
      if (result) printErrors(result);
      return;
    }
    
    let output = result.js;
    if (parsed.flags.minify) {
      output = simpleMinify(output);
    }
    
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, 'utf-8');
    console.log('✓ Di-rebuild: ' + relPath);
  });
  
  watcher.on('add', function (relPath) {
    console.log('\nFile baru: ' + relPath);
    const filePath = path.join(absSrcDir, relPath);
    const outPath = path.join(absOutDir, relPath.replace(/\.ks$/, '.js'));
    
    const result = compileFile(filePath, parsed.flags);
    
    if (!result || !result.success) {
      console.error('✗ GAGAL: ' + relPath);
      if (result) printErrors(result);
      return;
    }
    
    let output = result.js;
    if (parsed.flags.minify) {
      output = simpleMinify(output);
    }
    
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output, 'utf-8');
    console.log('✓ Di-compile: ' + relPath);
  });
  
  watcher.on('unlink', function (relPath) {
    console.log('\nFile dihapus: ' + relPath);
    const outPath = path.join(absOutDir, relPath.replace(/\.ks$/, '.js'));
    if (fs.existsSync(outPath)) {
      fs.unlinkSync(outPath);
      console.log('✓ Output dihapus: ' + relPath.replace(/\.ks$/, '.js'));
    }
    // Hapus source map jika ada
    const mapPath = outPath + '.map';
    if (fs.existsSync(mapPath)) {
      fs.unlinkSync(mapPath);
    }
  });
  
  watcher.on('error', function (error) {
    console.error('Watcher error: ' + error);
  });
}

/**
 * `karsa format <file.ks>` — Format/beautify kode KARSA
 */
function cmdFormat(parsed) {
  const filePath = parsed.args[0];
  if (!filePath) {
    console.error('Error: Tentukan file .ks untuk diformat.');
    console.error('Penggunaan: karsa format <file.ks> [-w]');
    process.exit(1);
  }
  
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error('Error: File tidak ditemukan: ' + absPath);
    process.exit(1);
  }
  
  const source = fs.readFileSync(absPath, 'utf-8');
  const formatted = formatKarsa(source);
  
  if (parsed.flags.write || parsed.flags.w) {
    // Tulis kembali ke file yang sama
    if (source === formatted) {
      console.log('File sudah terformat dengan benar: ' + filePath);
    } else {
      fs.writeFileSync(absPath, formatted, 'utf-8');
      console.log('✓ Diformat: ' + filePath);
    }
  } else {
    // Cetak ke stdout
    console.log(formatted);
  }
}

/**
 * `karsa check <file.ks>` — Cek sintaks tanpa compile
 */
function cmdCheck(parsed) {
  const filePath = parsed.args[0];
  if (!filePath) {
    if (parsed.flags.json) {
      console.log(JSON.stringify({
        version: getVersion(),
        command: 'check',
        success: false,
        diagnostics: [{
          code: 'E0000',
          kode: 'E0000',
          severity: 'error',
          stage: 'System',
          message: 'Tentukan file .ks untuk dicek.',
          pesan: 'Tentukan file .ks untuk dicek.',
          suggestion: 'Penggunaan: karsa check <file.ks> [--json]',
          saran: 'Penggunaan: karsa check <file.ks> [--json]',
          loc: null
        }],
        errors: [],
        warnings: []
      }, null, 2));
    } else {
      console.error('Error: Tentukan file .ks untuk dicek.');
      console.error('Penggunaan: karsa check <file.ks> [--json]');
    }
    process.exit(1);
  }
  
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    const missingResult = {
      success: false,
      stage: 'System',
      errors: [{
        code: 'E0000',
        kode: 'E0000',
        severity: 'error',
        stage: 'System',
        message: 'File tidak ditemukan: ' + absPath,
        pesan: 'File tidak ditemukan: ' + absPath,
        suggestion: 'Periksa path file .ks yang diberikan.',
        saran: 'Periksa path file .ks yang diberikan.',
        loc: null
      }]
    };
    if (parsed.flags.json) {
      printCheckJson(filePath, missingResult);
    } else {
      printErrors(missingResult);
    }
    process.exit(1);
  }

  const result = compileFile(absPath, parsed.flags);
  
  if (!result) {
    if (parsed.flags.json) {
      printCheckJson(filePath, { success: false, errors: [{ code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System', message: 'File tidak ditemukan atau gagal dibaca.', pesan: 'File tidak ditemukan atau gagal dibaca.', suggestion: 'Periksa path file dan pastikan file ada.', saran: 'Periksa path file dan pastikan file ada.', loc: null }] });
    }
    process.exit(1);
  }

  if (parsed.flags.json) {
    printCheckJson(filePath, result);
    process.exit(result.success ? 0 : 1);
  }
  
  if (result.success) {
    if (!parsed.flags.quiet) console.log('✓ Tidak ditemukan error: ' + filePath);
    if (result.warnings && result.warnings.length > 0) {
      if (!parsed.flags.quiet) console.log('⚠ ' + result.warnings.length + ' peringatan:');
      result.warnings.forEach(function (w) {
        const kode = w.kode || w.code || 'W0000';
        const pesan = w.pesan || w.message || '';
        if (!parsed.flags.quiet) console.log('  [' + kode + '] ' + pesan);
      });
    }
  } else {
    printErrors(result);
    process.exit(1);
  }
}


/**
 * Baca file source untuk command tooling.
 */
function readSourceForTooling(filePath, command, jsonMode) {
  if (!filePath) {
    var missingArg = {
      success: false,
      diagnostics: [{
        code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System',
        message: 'Tentukan file .ks untuk command ' + command + '.',
        pesan: 'Tentukan file .ks untuk command ' + command + '.',
        suggestion: 'Penggunaan: karsa ' + command + ' <file.ks> [--json]',
        saran: 'Penggunaan: karsa ' + command + ' <file.ks> [--json]',
        loc: null
      }]
    };
    if (jsonMode) console.log(JSON.stringify(missingArg, null, 2));
    else console.error('Error: Tentukan file .ks untuk command ' + command + '.');
    return null;
  }

  var absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    var notFound = {
      success: false,
      diagnostics: [{
        code: 'E0000', kode: 'E0000', severity: 'error', stage: 'System',
        message: 'File tidak ditemukan: ' + absPath,
        pesan: 'File tidak ditemukan: ' + absPath,
        suggestion: 'Periksa path file .ks yang diberikan.',
        saran: 'Periksa path file .ks yang diberikan.',
        loc: null
      }]
    };
    if (jsonMode) console.log(JSON.stringify(notFound, null, 2));
    else console.error('Error: File tidak ditemukan: ' + absPath);
    return null;
  }

  return {
    file: filePath,
    absPath: absPath,
    source: fs.readFileSync(absPath, 'utf-8')
  };
}

function cmdInspect(parsed) {
  var input = readSourceForTooling(parsed.args[0], 'inspect', parsed.flags.json);
  if (!input) process.exit(1);

  var options = {};
  if (parsed.flags['strict-usage']) options.usageWarnings = 'strict';
  var result = Karsa.inspect(input.source, options);
  var diagnostics = (result.diagnostics || []).map(normalizeDiagnostic);
  var payload = {
    version: getVersion(),
    command: 'inspect',
    file: input.file,
    success: !!result.success,
    diagnostics: diagnostics,
    semantic: result.semantic || { symbols: [], references: [], dependencies: [], cycles: [] }
  };

  if (parsed.flags.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('KARSA Inspect: ' + input.file);
    console.log('Symbols: ' + payload.semantic.symbols.length);
    payload.semantic.symbols.forEach(function(sym) {
      console.log('  [' + sym.kind + '] ' + sym.name + ' #' + sym.id + ' read=' + sym.readCount + ' write=' + sym.writeCount);
    });
    if (diagnostics.length > 0 && !parsed.flags.quiet) {
      console.log('Diagnostics: ' + diagnostics.length);
    }
  }
  process.exit(payload.success ? 0 : 1);
}

function cmdGraph(parsed) {
  var input = readSourceForTooling(parsed.args[0], 'graph', parsed.flags.json);
  if (!input) process.exit(1);

  var options = {};
  if (parsed.flags['strict-usage']) options.usageWarnings = 'strict';
  var result = Karsa.graph(input.source, options);
  var diagnostics = (result.diagnostics || []).map(normalizeDiagnostic);
  var payload = {
    version: getVersion(),
    command: 'graph',
    file: input.file,
    success: !!result.success,
    diagnostics: diagnostics,
    symbols: result.symbols || [],
    dependencies: result.dependencies || [],
    cycles: result.cycles || []
  };

  if (parsed.flags.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('KARSA Dependency Graph: ' + input.file);
    if (payload.dependencies.length === 0) console.log('  (tidak ada dependency)');
    payload.dependencies.forEach(function(dep) {
      console.log('  ' + dep.from + ' --[' + dep.kind + ']--> ' + dep.to);
    });
    if (payload.cycles.length > 0) {
      console.log('Cycles: ' + payload.cycles.length);
    }
  }
  process.exit(payload.success ? 0 : 1);
}

/**
 * `karsa init [nama]` — Buat project KARSA baru
 */
function cmdInit(parsed) {
  const nama = parsed.args[0] || 'karsa-app';
  const targetDir = path.resolve(nama);
  
  // Cek apakah direktori sudah ada
  if (fs.existsSync(targetDir)) {
    console.error('Error: Direktori sudah ada: ' + targetDir);
    process.exit(1);
  }
  
  console.log('Membuat project KARSA: ' + nama);
  
  // Buat struktur direktori
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'dist'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'public'), { recursive: true });
  
  // Buat package.json
  const pkgJson = {
    name: nama,
    version: '1.0.0',
    description: 'Aplikasi KARSA',
    scripts: {
      'dev': 'karsa watch src -o dist',
      'build': 'karsa build src -o dist',
      'format': 'karsa format src/App.ks -w'
    },
    dependencies: {
      karsa: '^0.3.1'
    }
  };
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(pkgJson, null, 2),
    'utf-8'
  );
  
  // Buat file .ks awal
  const appKs = [
    '--! ' + nama + ' — Aplikasi KARSA',
    '',
    'data judul = "Halo, KARSA!"',
    '',
    'buat div.app',
    '  buat h1#judul-utama -> teks: judul',
    '  buat p.deskripsi -> teks: "Selamat datang di aplikasi KARSA pertamamu!"',
    '',
    'saat judul berubah:',
    '    perbarui teks "#judul-utama" -> judul',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(targetDir, 'src', 'App.ks'), appKs, 'utf-8');
  
  // Buat HTML loader
  const htmlContent = [
    '<!DOCTYPE html>',
    '<html lang="id">',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>' + nama + '</title>',
    '  <style>',
    '    body { font-family: sans-serif; margin: 2rem; }',
    '    .app { max-width: 600px; margin: 0 auto; }',
    '    h1 { color: #2c3e50; }',
    '    .deskripsi { color: #7f8c8d; }',
    '  </style>',
    '</head>',
    '<body>',
    '  <script src="../dist/App.js"></script>',
    '</body>',
    '</html>'
  ].join('\n');
  fs.writeFileSync(path.join(targetDir, 'public', 'index.html'), htmlContent, 'utf-8');
  
  // Buat README
  const readme = [
    '# ' + nama,
    '',
    'Aplikasi dibangun dengan [KARSA](https://github.com/dazep01/karsa) DSL.',
    '',
    '## Pengembangan',
    '',
    '```bash',
    'npm install',
    'npm run dev      # watch mode',
    'npm run build    # build produksi',
    '```',
    '',
    '## Struktur',
    '',
    '```',
    nama + '/',
    '├── src/           # Kode sumber KARSA (.ks)',
    '│   └── App.ks',
    '├── dist/          # Output JavaScript (.js)',
    '├── public/        # HTML & aset statis',
    '│   └── index.html',
    '└── package.json',
    '```',
    ''
  ].join('\n');
  fs.writeFileSync(path.join(targetDir, 'README.md'), readme, 'utf-8');
  
  // Buat .gitignore
  const gitignore = [
    'node_modules/',
    'dist/',
    '*.log',
    '.DS_Store'
  ].join('\n');
  fs.writeFileSync(path.join(targetDir, '.gitignore'), gitignore, 'utf-8');
  
  console.log('');
  console.log('✓ Project dibuat: ' + targetDir);
  console.log('');
  console.log('Langkah selanjutnya:');
  console.log('  cd ' + nama);
  console.log('  npm install');
  console.log('  npm run dev');
  console.log('');
}

// ---------------------------------------------------------------------------
// KARSA Formatter / Beautifier
// ---------------------------------------------------------------------------

/**
 * Format kode sumber KARSA agar lebih rapi dan konsisten.
 * 
 * Aturan:
 * - Indentasi 2 spasi (konsisten)
 * - Spasi sekitar operator perbandingan/penugasan
 * - Baris baru antar blok logis (deklarasi data, buat, saat, dll)
 * - Komentar di atas pernyataan terkait
 * - Tidak ada trailing whitespace
 * - Baris baru di akhir file
 */
function formatKarsa(source) {
  if (!source || source.trim().length === 0) return source;
  
  const lines = source.split('\n');
  const result = [];
  let prevIndent = 0;
  let prevWasBlank = false;
  let inLangsung = false;
  let langsungDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Jika dalam blok langsung, jangan format (JS pass-through)
    if (inLangsung) {
      if (trimmed === '' && langsungDepth === 0) {
        // Akhir blok langsung
        inLangsung = false;
        result.push('');
        prevWasBlank = true;
        continue;
      }
      // Deteksi indentasi untuk menentukan akhir blok
      const currentIndent = line.search(/\S/);
      if (currentIndent <= prevIndent && trimmed !== '' && langsungDepth > 0) {
        langsungDepth--;
        if (langsungDepth === 0) {
          inLangsung = false;
        }
      }
      // Dalam blok langsung, pertahankan apa adanya tapi rapihkan trailing ws
      result.push(line.replace(/\s+$/, ''));
      prevIndent = currentIndent >= 0 ? currentIndent : prevIndent;
      prevWasBlank = false;
      continue;
    }
    
    // Deteksi awal blok langsung
    if (/^langsung\s*:/.test(trimmed)) {
      inLangsung = true;
      langsungDepth = 1;
      const indent = line.search(/\S/);
      const baseIndent = indent >= 0 ? indent : 0;
      result.push(' '.repeat(baseIndent) + trimmed);
      prevIndent = baseIndent;
      prevWasBlank = false;
      continue;
    }
    
    // Skip baris kosong berlebihan (max 1 baris kosong berturut)
    if (trimmed === '') {
      if (!prevWasBlank) {
        result.push('');
        prevWasBlank = true;
      }
      continue;
    }
    
    prevWasBlank = false;
    
    // Hitung indentasi saat ini
    const leadingSpaces = line.match(/^(\s*)/)[1].length;
    const normalizedIndent = Math.round(leadingSpaces / 2) * 2; // Pastikan kelipatan 2
    
    // Normalisasi spasi sekitar operator — dengan hati-hati pada konteks KARSA
    let formatted = trimmed;
    
    // Spasi sekitar '->' (panah KARSA)
    formatted = formatted.replace(/\s*->\s*/g, ' -> ');
    
    // Spasi sekitar '=' untuk penugasan data/turunan
    // Hanya untuk baris yang punya '=' (data x = 5, turunan y = ...)
    // Tidak boleh menambah spasi berlebih jika sudah ada spasi
    formatted = formatted.replace(/(\S)\s*=\s*(\S)/g, '$1 = $2');
    
    // Spasi setelah koma
    formatted = formatted.replace(/,\s*/g, ', ');
    
    // Hapus trailing whitespace
    formatted = formatted.replace(/\s+$/, '');
    
    // Gabungkan indentasi normalisasi konten yang diformat
    result.push(' '.repeat(normalizedIndent) + formatted);
    prevIndent = normalizedIndent;
  }
  
  // Pastikan baris baru di akhir
  let output = result.join('\n');
  if (!output.endsWith('\n')) {
    output += '\n';
  }
  
  return output;
}

// ---------------------------------------------------------------------------
// Main Router
// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  
  if (argv.length === 0) {
    printHelp();
    process.exit(0);
  }
  
  const parsed = parseArgs(argv);
  
  // Deteksi command
  const firstArg = parsed.args[0];
  let command = '';
  let cmdArgs = [];
  
  // Jika argumen pertama adalah command yang dikenal
  const commands = ['compile', 'build', 'watch', 'format', 'check', 'inspect', 'graph', 'init', 'version', 'help'];
  if (commands.indexOf(firstArg) !== -1) {
    command = firstArg;
    cmdArgs = parsed.args.slice(1);
  } else if (firstArg && firstArg.endsWith('.ks')) {
    // Shortcut: karsa file.ks → compile
    command = 'compile';
    cmdArgs = parsed.args;
  } else if (parsed.flags.help || parsed.flags.h) {
    command = 'help';
  } else {
    // Unknown, treat as help
    console.error('Error: Perintah tidak dikenal: ' + firstArg);
    console.error('');
    printHelp();
    process.exit(1);
  }
  
  // Re-parse args tanpa command prefix
  parsed.args = cmdArgs;
  
  switch (command) {
    case 'version':
      cmdVersion();
      break;
    case 'help':
      cmdHelp();
      break;
    case 'compile':
      cmdCompile(parsed);
      break;
    case 'build':
      cmdBuild(parsed);
      break;
    case 'watch':
      cmdWatch(parsed);
      break;
    case 'format':
      cmdFormat(parsed);
      break;
    case 'check':
      cmdCheck(parsed);
      break;
    case 'inspect':
      cmdInspect(parsed);
      break;
    case 'graph':
      cmdGraph(parsed);
      break;
    case 'init':
      cmdInit(parsed);
      break;
    default:
      printHelp();
      process.exit(1);
  }
}

// Jalankan
main();
