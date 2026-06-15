/**
 * KARSA v0.3.1 — RESOLVER (Merged)
 * ============================================================================
 * Menggabungkan kelebihan Tim A & Tim B:
 *   - Model SemanticSymbol lengkap (B)
 *   - Scope management, deteksi duplikat & shadowing (B)
 *   - Usage tracking: read/write count, references (B)
 *   - Alias properti Indonesia → JS (A)
 *   - Self-reference "ketika" tanpa target (A)
 *   - Penanganan JS Interop (`jalankan`) agar tidak dianggap undefined (A)
 *   - Kode error & warning terpadu
 *
 * v0.3.1-patch1: Perbaikan bug kritikal
 *   - [C2] Fix node.args → node.arguments di visitJalankanExpression
 *   - [C3] Emit E3001 untuk identifier yang tidak dideklarasikan
 *   - [C4] Emit E3003 untuk penulisan ke variabel tetap (const)
 *   - [H1] E5001 → E3005 untuk error "ketika tanpa target"
 *   - [H2] Standardisasi format objek error (code/message/severity/loc/suggestion)
 *   - [H3] Tambah visitor: visitSelamaStatement, visitPerbaruiStatement,
 *          visitGunakanStatement, visitTambahkanStatement, visitKurangiStatement,
 *          visitSisipkanStatement, visitSetelahStatement, visitTampilkanStatement,
 *          visitSembunyikanStatement, visitHapusStatement, visitKosongkanStatement,
 *          visitArahkanStatement, visitAmbilDomStatement, visitAmbilLuarStatement
 *   - [M2] Write tracking untuk tambahkan/kurangi/sisipkan
 *   - [M4] W3001 di saatStatement → W3003 (kode baru untuk non-reaktif watcher)
 */

const { BaseVisitor, accept } = require('../utils/visitor');
const Err = require('../parser/error-codes');

// ============================================================================
// ALIAS PROPERTI (dari Tim A)
// ============================================================================
const ALIAS_PROPERTI = {
  'panjang': 'length',
  'nilai': 'value',
  'teks': 'innerText',
  'html': 'innerHTML',
  'tipe': 'type',
  'nama': 'name',
  'ditandai': 'checked',
  'nonaktif': 'disabled',
  'anak': 'children',
  'induk': 'parentElement',
  'fokus': 'focus',
  'atribut': 'getAttribute'
};

// ============================================================================
// EVENT NAMES yang valid untuk ketika (dari spesifikasi KARSA)
// ============================================================================
const VALID_EVENT_NAMES = new Set([
  'diklik', 'diketik', 'ditekan', 'dilepas', 'dilewat', 'ditinggal',
  'difokus', 'diblur', 'diubah', 'diseret', 'diubahukuran',
  'dipindah', 'dikirim', 'direset', 'digulir', 'dikonteks',
  'masuk', 'keluar', 'aktif', 'nonaktif', 'muat', 'salah'
]);

// ============================================================================
// PROPERTI PERBARUI yang valid
// ============================================================================
const VALID_PERBARUI_PROPERTIES = new Set([
  'teks', 'html', 'kelas', 'src', 'href', 'nilai', 'tipe',
  'nama', 'ditandai', 'nonaktif', 'placeholder', 'gaya', 'atribut'
]);

// ============================================================================
// SEMANTIC SYMBOL (dari Tim B)
// ============================================================================
function SemanticSymbol(name, kind, node, scope, metadata = {}) {
  this.name = name;
  this.kind = kind;          // 'data','tetap','ubah','turunan','fungsi','komponen','parameter'
  this.declarationNode = node;
  this.scope = scope;

  // Properti dari Tim B
  this.isReactive  = metadata.isReactive  || false;
  this.isWritable  = metadata.isWritable  || false;
  this.isComputed  = (kind === 'turunan');
  this.isParameter = (kind === 'parameter');
  this.isComponent = (kind === 'komponen');
  this.isFunction  = (kind === 'fungsi');

  // Shadowing (Tim B)
  this.shadowedSymbol = metadata.shadowedSymbol || null;

  // Usage tracking (Tim B)
  this.references = [];
  this.readCount  = 0;
  this.writeCount = 0;
}

// ============================================================================
// SCOPE (dari Tim B, sedikit penyesuaian)
// ============================================================================
function Scope(type, parent) {
  this.type = type;   // 'global','blok','komponen','iterasi','watcher'
  this.parent = parent;
  this.symbols = new Map();
}

Scope.prototype.define = function(name, symbol) {
  this.symbols.set(name, symbol);
};

Scope.prototype.lookup = function(name) {
  if (this.symbols.has(name)) return this.symbols.get(name);
  if (this.parent) return this.parent.lookup(name);
  return null;
};

// ============================================================================
// RESOLVER ENGINE (utama)
// ============================================================================
function KarsaResolver() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  this.currentScope = null;
  this.buatStack = [];
  this.allSymbols = [];
  this.currentJalankanCallee = null;
}

KarsaResolver.prototype = Object.create(BaseVisitor.prototype);
KarsaResolver.prototype.constructor = KarsaResolver;

// ─── Entry Point ───────────────────────────────────────────
KarsaResolver.prototype.resolve = function(ast) {
  this.errors = [];
  this.warnings = [];
  this.currentScope = new Scope('global', null);
  this.allSymbols = [];

  // Pass 1: Hoisting deklarasi global (menggunakan addSymbol untuk deteksi duplikat)
  this.gatherGlobals(ast);

  // Pass 2: Deep resolution
  accept(ast, this);

  // Tempelkan metadata untuk Analyzer (Tim B)
  ast.semantic = {
    symbols: this.allSymbols,
    globalScope: this.currentScope
  };

  return { ast, errors: this.errors, warnings: this.warnings };
};

// ─── Utility: menambah simbol (dari Tim B) ─────────────────
KarsaResolver.prototype.addSymbol = function(name, kind, node, metadata = {}) {
  // Deteksi duplikat (E3002 - Tim B)
  const existing = this.currentScope.symbols.get(name);
  if (existing) {
    this.errors.push(Err.createError('E3002', node.loc, {
      message: `Simbol "${name}" sudah dideklarasikan dalam scope yang sama.`,
      suggestion: `Deklarasi pertama ada di Baris ${existing.declarationNode.loc.start.line}.`
    }));
    return null;
  }

  // Shadowing (Tim B) → W3002
  const shadowed = this.currentScope.parent 
    ? this.currentScope.parent.lookup(name) 
    : null;

  if (shadowed) {
    this.warnings.push(Err.createError('W3002', node.loc, {
      message: `Variabel "${name}" menyembunyikan variabel dengan nama sama di scope luar.`,
      suggestion: 'Gunakan nama yang berbeda untuk menghindari kebingungan.'
    }));
  }

  const symbol = new SemanticSymbol(name, kind, node, this.currentScope.type, {
    ...metadata,
    shadowedSymbol: shadowed
  });

  this.currentScope.define(name, symbol);
  this.allSymbols.push(symbol);

  // Ikat simbol ke node (untuk akses mudah)
  node.symbol = symbol;
  return symbol;
};

// ─── Global Hoisting (modifikasi dari Tim B) ───────────────
KarsaResolver.prototype.gatherGlobals = function(ast) {
  if (!ast.body) return;
  ast.body.forEach(node => {
    if (node.type === 'DataDeclaration') 
      this.addSymbol(node.name, 'data', node, { isReactive: true, isWritable: true });
    else if (node.type === 'TetapDeclaration') 
      this.addSymbol(node.name, 'tetap', node, { isWritable: false });
    else if (node.type === 'UbahDeclaration') 
      this.addSymbol(node.name, 'ubah', node, { isWritable: true });
    else if (node.type === 'TurunanDeclaration') 
      this.addSymbol(node.name, 'turunan', node, { isReactive: true, isWritable: false });
    else if (node.type === 'FungsiDeclaration') 
      this.addSymbol(node.name, 'fungsi', node, { isWritable: false });
    else if (node.type === 'KomponenDeclaration') 
      this.addSymbol(node.name, 'komponen', node, { isWritable: false });
  });
};

// ============================================================================
// VISITOR METHODS
// ============================================================================

// ─── Identifier (gabungan) ─────────────────────────────────
KarsaResolver.prototype.visitIdentifier = function(node) {
  // Abaikan jika ini adalah nama callee dari "jalankan"
  if (node.isCalleeJS || 
      (this.currentJalankanCallee && node.name === this.currentJalankanCallee)) {
    return;
  }

  const symbol = this.currentScope.lookup(node.name);
  if (symbol) {
    node.resolved = symbol;
    node.semantic = { symbol };
    symbol.readCount++;
    symbol.references.push(node);
  } else {
    // [C3 FIX] Emit E3001 untuk identifier yang tidak dideklarasikan
    node.isUndefined = true;
    this.errors.push(Err.createError('E3001', node.loc, {
      message: `Identifier "${node.name}" tidak dideklarasikan.`,
      suggestion: 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.'
    }));
  }
};

// ─── MemberExpression (dari Tim A: alias properti) ─────────
KarsaResolver.prototype.visitMemberExpression = function(node) {
  // Visit object (kiri)
  accept(node.object, this);

  // Resolusi alias properti (Tim A)
  if (node.property.type === 'Identifier') {
    const propName = node.property.name;

    // Khusus .indeks dalam scope iterasi (virtual)
    if (propName === 'indeks') {
      node.property.isVirtual = true;
    }

    if (ALIAS_PROPERTI[propName]) {
      node.property.originalName = propName;
      node.property.name = ALIAS_PROPERTI[propName];
      node.isTranslatedAlias = true;
    }
  }
};

// ─── JalankanExpression (Tim A: JS Interop) ───────────────
KarsaResolver.prototype.visitJalankanExpression = function(node) {
  // Simpan nama fungsi yang dipanggil (callee)
  const prevCallee = this.currentJalankanCallee;
  this.currentJalankanCallee = node.callee; // node.callee adalah string

  // [C2 FIX] node.args → node.arguments (sesuai AST factory)
  if (node.arguments && node.arguments.length > 0) {
    node.arguments.forEach(arg => accept(arg, this));
  }
  if (node.withArgs && node.withArgs.length > 0) {
    node.withArgs.forEach(arg => accept(arg, this));
  }

  // Kembalikan ke nilai sebelumnya (null jika tidak ada nested jalankan)
  this.currentJalankanCallee = prevCallee;
};

KarsaResolver.prototype.markAsJSExternal = function(node) {
  if (node.type === 'Identifier') {
    node.isCalleeJS = true;
  } else if (node.type === 'MemberExpression') {
    this.markAsJSExternal(node.object);
  }
};

// ─── Write-Tracking Helper ────────────────────────────────
/**
 * Melacak penulisan ke variabel dan memvalidasi isWritable.
 * Digunakan oleh simpan, tambahkan, kurangi, sisipkan, perbarui.
 */
KarsaResolver.prototype._trackWrite = function(targetName, node) {
  if (!targetName) return;
  const symbol = this.currentScope.lookup(targetName);
  if (symbol) {
    symbol.writeCount++;
    node.targetSymbol = symbol;  // untuk Analyzer (proteksi read-only)

    // [C4 FIX] Emit E3003 jika menulis ke variabel tetap (const)
    if (!symbol.isWritable) {
      this.errors.push(Err.createError('E3003', node.loc, {
        message: `Variabel tetap "${targetName}" tidak dapat diubah setelah inisialisasi.`,
        suggestion: 'Gunakan "ubah" jika variabel perlu diubah, bukan "tetap".'
      }));
    }
  }
};

// ─── SimpanStatement (Tim B: write tracking) ──────────────
KarsaResolver.prototype.visitSimpanStatement = function(node) {
  // Catat penulisan jika target berupa identifier (node.target adalah string nama)
  if (typeof node.target === 'string') {
    this._trackWrite(node.target, node);
  } else if (node.target && node.target.type === 'Identifier') {
    this._trackWrite(node.target.name, node);
  }
  this.genericVisit(node);
};

// ─── Mutation Statements: Write Tracking (M2 FIX) ─────────
KarsaResolver.prototype.visitTambahkanStatement = function(node) {
  if (typeof node.target === 'string') {
    this._trackWrite(node.target, node);
  } else if (node.target && node.target.type === 'Identifier') {
    this._trackWrite(node.target.name, node);
  }
  this.genericVisit(node);
};

KarsaResolver.prototype.visitKurangiStatement = function(node) {
  if (typeof node.target === 'string') {
    this._trackWrite(node.target, node);
  } else if (node.target && node.target.type === 'Identifier') {
    this._trackWrite(node.target.name, node);
  }
  this.genericVisit(node);
};

KarsaResolver.prototype.visitSisipkanStatement = function(node) {
  if (typeof node.target === 'string') {
    this._trackWrite(node.target, node);
  } else if (node.target && node.target.type === 'Identifier') {
    this._trackWrite(node.target.name, node);
  }
  this.genericVisit(node);
};

// ─── PerbaruiStatement (H3 FIX: visitor baru) ──────────────
KarsaResolver.prototype.visitPerbaruiStatement = function(node) {
  // Resolve target jika berupa identifier
  if (node.target) {
    if (typeof node.target === 'string') {
      this._trackWrite(node.target, node);
    } else {
      accept(node.target, this);
      // Jika target adalah identifier, lacak penulisan
      if (node.target.type === 'Identifier' && node.target.name) {
        this._trackWrite(node.target.name, node);
      }
    }
  }

  // Resolve value expression
  if (node.value) accept(node.value, this);

  // Validasi properti perbarui
  if (node.property && typeof node.property === 'string') {
    if (!VALID_PERBARUI_PROPERTIES.has(node.property)) {
      this.warnings.push(Err.createError('E4008', node.loc, {
        message: `Properti perbarui "${node.property}" mungkin tidak didukung.`,
        suggestion: 'Gunakan properti yang didukung: teks, html, kelas, src, href, nilai, dll.'
      }));
    }
  }
};

// ─── GunakanStatement (H3 FIX: visitor baru) ───────────────
KarsaResolver.prototype.visitGunakanStatement = function(node) {
  // Validasi bahwa nama komponen terdaftar
  if (node.componentName) {
    const symbol = this.currentScope.lookup(node.componentName);
    if (!symbol) {
      // [E3004] Komponen tidak dideklarasikan
      this.errors.push(Err.createError('E3004', node.loc, {
        message: `Komponen "${node.componentName}" digunakan sebelum dideklarasi.`,
        suggestion: 'Pindahkan deklarasi komponen sebelum penggunaannya.'
      }));
    } else if (symbol.kind !== 'komponen') {
      // [E4010] gunakan untuk non-komponen
      this.errors.push(Err.createError('E4010', node.loc, {
        message: `"${node.componentName}" bukan komponen, tidak dapat digunakan dengan "gunakan".`,
        suggestion: 'Pastikan nama yang direferensikan adalah komponen (PascalCase).'
      }));
    }
  }

  // Resolve props jika ada
  if (node.props) {
    node.props.forEach(prop => {
      if (prop.value) accept(prop.value, this);
    });
  }

  this.genericVisit(node);
};

// ─── TampilkanStatement (H3 FIX) ───────────────────────────
KarsaResolver.prototype.visitTampilkanStatement = function(node) {
  if (node.target) accept(node.target, this);
  this.genericVisit(node);
};

// ─── SembunyikanStatement (H3 FIX) ─────────────────────────
KarsaResolver.prototype.visitSembunyikanStatement = function(node) {
  if (node.target) accept(node.target, this);
  this.genericVisit(node);
};

// ─── HapusStatement (H3 FIX) ───────────────────────────────
KarsaResolver.prototype.visitHapusStatement = function(node) {
  if (node.target) accept(node.target, this);
  this.genericVisit(node);
};

// ─── KosongkanStatement (H3 FIX) ───────────────────────────
KarsaResolver.prototype.visitKosongkanStatement = function(node) {
  if (node.target) accept(node.target, this);
  this.genericVisit(node);
};

// ─── ArahkanStatement (H3 FIX) ─────────────────────────────
KarsaResolver.prototype.visitArahkanStatement = function(node) {
  if (node.url) accept(node.url, this);
  this.genericVisit(node);
};

// ─── SetelahStatement (H3 FIX) ─────────────────────────────
KarsaResolver.prototype.visitSetelahStatement = function(node) {
  // Setelah (after-render hook) — body bisa berisi statement biasa
  this.genericVisit(node);
};

// ─── AmbilDomStatement (H3 FIX) ────────────────────────────
KarsaResolver.prototype.visitAmbilDomStatement = function(node) {
  if (node.source) accept(node.source, this);
  this.genericVisit(node);
};

// ─── AmbilLuarStatement (H3 FIX) ───────────────────────────
KarsaResolver.prototype.visitAmbilLuarStatement = function(node) {
  if (node.url) accept(node.url, this);

  // Buat scope untuk callback
  const prevScope = this.currentScope;
  this.currentScope = new Scope('blok', prevScope);

  if (node.saveTarget) {
    this.addSymbol(node.saveTarget, 'ubah', node, { isWritable: true });
  }

  this.genericVisit(node);
  this.currentScope = prevScope;
};

// ─── SelamaStatement (H3 FIX: scope untuk loop body) ───────
KarsaResolver.prototype.visitSelamaStatement = function(node) {
  // Resolve kondisi di scope sekarang
  if (node.condition) accept(node.condition, this);

  const prevScope = this.currentScope;
  this.currentScope = new Scope('blok', prevScope);
  if (node.body) accept(node.body, this);
  this.currentScope = prevScope;
};

// ─── Scope: Blok, Fungsi, Komponen, Ulangi (Tim B, disempurnakan) ──
KarsaResolver.prototype.visitBlockStatement = function(node) {
  const prevScope = this.currentScope;
  this.currentScope = new Scope('blok', prevScope);
  this.genericVisit(node);
  this.currentScope = prevScope;
};

KarsaResolver.prototype.visitFungsiDeclaration = function(node) {
  const prevScope = this.currentScope;
  this.currentScope = new Scope('blok', prevScope);

  if (node.params) {
    node.params.forEach(p => 
      this.addSymbol(p.name, 'parameter', p, { isReactive: false, isWritable: true })
    );
  }

  this.genericVisit(node);
  this.currentScope = prevScope;
};

KarsaResolver.prototype.visitKomponenDeclaration = function(node) {
  const prevScope = this.currentScope;
  this.currentScope = new Scope('komponen', prevScope);

  if (node.params) {
    node.params.forEach(p => 
      this.addSymbol(p.name, 'parameter', p, { isReactive: true, isWritable: true })
    );
  }

  // Komponen juga berperan sebagai elemen untuk self-reference "ketika"
  this.buatStack.push(node);
  this.genericVisit(node);
  this.buatStack.pop();

  this.currentScope = prevScope;
};

KarsaResolver.prototype.visitUlangiStatement = function(node) {
  // Resolve source di scope sekarang (Tim B sudah benar)
  accept(node.source, this);

  const prevScope = this.currentScope;
  this.currentScope = new Scope('iterasi', prevScope);

  if (node.iteratorName) {
    this.addSymbol(node.iteratorName, 'ubah', node, { isWritable: false });
  }

  accept(node.body, this);
  this.currentScope = prevScope;
};

// ─── BuatStatement (Tim A: untuk self-reference "ketika") ──
KarsaResolver.prototype.visitBuatStatement = function(node) {
  this.buatStack.push(node);
  this.genericVisit(node);
  this.buatStack.pop();
};

// ─── KetikaStatement (Tim A: self-reference) ──────────────
KarsaResolver.prototype.visitKetikaStatement = function(node) {
  // Tangani target kosong (self-reference)
  if (!node.target) {
    if (this.buatStack.length > 0) {
      const parentNode = this.buatStack[this.buatStack.length - 1];
      node.target = {
        type: 'SelfReference',
        referencedNode: parentNode,
        loc: node.loc
      };
    } else {
      // [H1 FIX] E5001 → E3005 (kode error resolver, bukan compiler)
      this.errors.push(Err.createError('E3005', node.loc, {
        message: 'Event listener "ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen".',
        suggestion: 'Tambahkan target pada "ketika" atau letakkan di dalam blok "buat"/"komponen".'
      }));
    }
  } else {
    accept(node.target, this);
  }

  // Validasi event name jika tersedia
  if (node.event && typeof node.event === 'string' && !VALID_EVENT_NAMES.has(node.event)) {
    this.warnings.push(Err.createError('E4009', node.loc, {
      message: `Event name "${node.event}" mungkin tidak dikenali.`,
      suggestion: 'Gunakan nama event yang valid: diklik, diketik, ditekan, dll.'
    }));
  }

  // Watcher-like scope (Tim A)
  const prevScope = this.currentScope;
  this.currentScope = new Scope('watcher', prevScope);
  if (node.body) accept(node.body, this);
  if (node.action) accept(node.action, this);
  this.currentScope = prevScope;
};

// ─── SaatStatement (Tim B, dilengkapi) ────────────────────
KarsaResolver.prototype.visitSaatStatement = function(node) {
  // Resolve target reaktif
  const binding = this.currentScope.lookup(node.target);
  if (!binding) {
    // Emit E3001 untuk watcher target yang tidak dideklarasikan
    node.isUndefined = true;
    this.errors.push(Err.createError('E3001', node.loc, {
      message: `Identifier "${node.target}" tidak dideklarasikan.`,
      suggestion: 'Periksa ejaan identifier atau deklarasikan variabel terlebih dahulu.'
    }));
  } else if (!binding.isReactive) {
    // [M4 FIX] W3001 → W3003 (kode baru khusus: watcher target non-reaktif)
    this.warnings.push(Err.createError('W3003', node.loc, {
      message: `Variabel "${node.target}" bukan data reaktif. Watcher mungkin tidak akan pernah terpicu.`,
      suggestion: 'Gunakan "data" (var) reaktif sebagai target watcher.'
    }));
  }

  const prevScope = this.currentScope;
  this.currentScope = new Scope('watcher', prevScope);
  this.genericVisit(node);
  this.currentScope = prevScope;
};

// ─── Deklarasi Lokal (Tim B, pengecekan agar tidak duplikasi global) ──
KarsaResolver.prototype.visitDataDeclaration = function(node) {
  if (!this.currentScope.symbols.has(node.name)) {
    this.addSymbol(node.name, 'data', node, { isReactive: true, isWritable: true });
  }
  this.genericVisit(node);
};

KarsaResolver.prototype.visitTetapDeclaration = function(node) {
  if (!this.currentScope.symbols.has(node.name)) {
    this.addSymbol(node.name, 'tetap', node, { isWritable: false });
  }
  // [W4003] Warning: tetap tanpa nilai awal
  if (!node.init) {
    this.warnings.push(Err.createError('W4003', node.loc, {
      message: `Deklarasi "tetap" untuk "${node.name}" tanpa nilai awal.`,
      suggestion: 'Berikan nilai awal untuk konstanta.'
    }));
  }
  this.genericVisit(node);
};

KarsaResolver.prototype.visitUbahDeclaration = function(node) {
  if (!this.currentScope.symbols.has(node.name)) {
    this.addSymbol(node.name, 'ubah', node, { isWritable: true });
  }
  this.genericVisit(node);
};

KarsaResolver.prototype.visitTurunanDeclaration = function(node) {
  if (!this.currentScope.symbols.has(node.name)) {
    this.addSymbol(node.name, 'turunan', node, { isReactive: true, isWritable: false });
  }
  this.genericVisit(node);
};

// ─── Error Helper ──────────────────────────────────────────
KarsaResolver.prototype.addError = function(code, message, loc, suggestion) {
  this.errors.push(Err.createError(code, loc, {
    message: message,
    suggestion: suggestion || ''
  }));
};

KarsaResolver.prototype.addWarning = function(code, message, loc, suggestion) {
  this.warnings.push(Err.createError(code, loc, {
    message: message,
    suggestion: suggestion || ''
  }));
};

module.exports = KarsaResolver;