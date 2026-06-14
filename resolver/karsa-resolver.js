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
 */

const { BaseVisitor, accept } = require('../utils/visitor');

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
  this.currentJalankanCallee = null;  // ← baru
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
    this.errors.push({
      kode: 'E3002',
      pesan: `Simbol "${name}" sudah dideklarasikan dalam scope yang sama.`,
      loc: node.loc,
      saran: `Deklarasi pertama ada di Baris ${existing.declarationNode.loc.start.line}.`
    });
    return null;
  }

  // Shadowing (Tim B)
  const shadowed = this.currentScope.parent 
    ? this.currentScope.parent.lookup(name) 
    : null;

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
    node.isUndefined = true;
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

  // Jika ada argumen, visit mereka (identifier di dalamnya tetap di-resolve)
  if (node.args) {
    node.args.forEach(arg => accept(arg, this));
  }
  if (node.withArgs) {
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

// ─── SimpanStatement (Tim B: write tracking) ──────────────
KarsaResolver.prototype.visitSimpanStatement = function(node) {
  // Catat penulisan jika target berupa identifier (node.target adalah string nama)
  if (typeof node.target === 'string') {
    const symbol = this.currentScope.lookup(node.target);
    if (symbol) {
      symbol.writeCount++;
      node.targetSymbol = symbol;  // untuk Analyzer (proteksi read-only)
    }
  }
  this.genericVisit(node);
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
      this.errors.push({
        kode: 'E5001',
        pesan: 'Event listener "ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen".',
        loc: node.loc
      });
    }
  } else {
    accept(node.target, this);
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
    // Tidak langsung error; Analyzer akan menangani (Tim B)
    node.isUndefined = true;
  } else if (!binding.isReactive) {
    this.warnings.push({
      kode: 'W3001',
      pesan: `Variabel "${node.target}" bukan data reaktif. Watcher mungkin tidak akan pernah terpicu.`,
      loc: node.loc
    });
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
KarsaResolver.prototype.addError = function(kode, pesan, loc) {
  this.errors.push({ kode, pesan, loc });
};

module.exports = KarsaResolver;
