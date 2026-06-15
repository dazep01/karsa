/**
 * KARSA v0.3.1 — ANALYZER (Tahap 4)
 * ----------------------------------------------------------------------------
 * Melakukan validasi semantik: tipe, reaktivitas, kontrol alur, dan lifecycle.
 *
 * Sesuai Spesifikasi: KARSA-grammar-spec_v0_3_1.md
 *
 * v0.3.1-patch1: Perbaikan bug kritikal
 *   - [C5] Tambah visitPerbaruiStatement + checkWriteToTurunan
 *   - [H4] Tambah visitor: visitGunakanStatement, visitSetelahStatement,
 *          visitTampilkanStatement, visitSembunyikanStatement, visitHapusStatement,
 *          visitKosongkanStatement, visitArahkanStatement, visitAmbilDomStatement,
 *          visitAmbilLuarStatement, visitTambahkanStatement, visitKurangiStatement,
 *          visitSisipkanStatement
 *   - [H6] E6001/E6002/E6003 → E4011/E4012/E4013 (kode analyzer, bukan runtime)
 *   - [H2] Standardisasi format error menggunakan Err.createError
 *   - [M1] Tambah cek inTurunanExpr untuk tambahkan/kurangi/sisipkan
 */

const { BaseVisitor, accept } = require('../utils/visitor');
const Err = require('../parser/error-codes');

function KarsaAnalyzer() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  this._currentAst = null;
  
  // Context stacks
  this.context = {
    inComponent: false,
    inFunction: false,
    loopDepth: 0,
    handlerDepth: 0,
    inTurunanExpr: false
  };
}

KarsaAnalyzer.prototype = Object.create(BaseVisitor.prototype);
KarsaAnalyzer.prototype.constructor = KarsaAnalyzer;

KarsaAnalyzer.prototype.analyze = function(ast) {
  this.errors = [];
  this.warnings = [];
  this._currentAst = ast;
  // [Bug 4 FIX] Build Map sekali untuk lookup O(1)
  this._symbolMap = null;
  if (ast && ast.semantic && ast.semantic.symbols) {
    this._symbolMap = new Map();
    ast.semantic.symbols.forEach(function(sym) {
      this._symbolMap.set(sym.name, sym);
    }.bind(this));
  }
  accept(ast, this);
  return {
    ast: ast,
    errors: this.errors,
    warnings: this.warnings
  };
};

// --- Helpers ---

KarsaAnalyzer.prototype.addError = function(code, pesan, loc, saran) {
  this.errors.push(Err.createError(code, loc, {
    message: pesan,
    suggestion: saran || ''
  }));
};

KarsaAnalyzer.prototype.addWarning = function(code, pesan, loc, saran) {
  this.warnings.push(Err.createError(code, loc, {
    message: pesan,
    suggestion: saran || ''
  }));
};

/**
 * Validasi Tipe Dasar (Section 7.3)
 */
KarsaAnalyzer.prototype.checkTypeHint = function(typeHint, valueNode) {
  if (!typeHint || !valueNode || valueNode.type === 'ErrorNode') return;

  let actualType = '';
  if (valueNode.type === 'Literal') {
    if (typeof valueNode.value === 'number') actualType = 'angka';
    else if (typeof valueNode.value === 'string') actualType = 'teks';
    else if (typeof valueNode.value === 'boolean') actualType = 'benar-salah';
  }
  else if (valueNode.type === 'ObjectLiteral') actualType = 'objek';
  else if (valueNode.type === 'ArrayLiteral') actualType = 'array';
  else if (valueNode.type === 'CallExpression') {
    // Try to infer from callee name
    var callee = valueNode.callee;
    if (callee && callee.type === 'Identifier') {
      var name = callee.name;
      if (name && name.indexOf('ambil') === 0) actualType = 'teks';
      // Otherwise unknown — don't emit warning (too many false positives)
    }
  }
  else if (valueNode.type === 'BinaryExpression') {
    var op = valueNode.operator;
    if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') {
      actualType = 'angka';
    } else {
      // Comparison or logic operators -> boolean
      actualType = 'benar-salah';
    }
  }
  else if (valueNode.type === 'UnaryExpression') {
    if (valueNode.operator === 'bukan') {
      actualType = 'benar-salah';
    } else if (valueNode.operator === '-') {
      actualType = 'angka';
    }
  }
  else if (valueNode.type === 'MemberExpression') {
    // .panjang/.length -> angka, otherwise unknown
    var prop = valueNode.property;
    if (prop && prop.type === 'Identifier' && (prop.name === 'panjang' || prop.name === 'length')) {
      actualType = 'angka';
    }
    // Otherwise unknown — don't emit warning
  }

  // Both expected and actualType use Karsa type names
  if (actualType && typeHint !== actualType) {
    this.addWarning('W4001', 
      `Type hint "${typeHint}" tidak cocok dengan nilai awal bertipe "${actualType}".`, 
      valueNode.loc, 
      `Gunakan nilai yang sesuai atau ubah type hint menjadi yang benar.`);
  }
};

// --- Symbol Lookup ---

KarsaAnalyzer.prototype.lookupSymbol = function(name) {
  // [Bug 4 FIX] Lookup O(1) via Map, bukan O(n) linear scan
  if (this._symbolMap) {
    return this._symbolMap.get(name) || null;
  }
  // Fallback jika Map belum dibangun
  if (!this._currentAst || !this._currentAst.semantic || !this._currentAst.semantic.symbols) {
    return null;
  }
  var symbols = this._currentAst.semantic.symbols;
  for (var i = 0; i < symbols.length; i++) {
    if (symbols[i].name === name) {
      return symbols[i];
    }
  }
  return null;
};

/**
 * Cek apakah target adalah data turunan (read-only).
 * Digunakan oleh simpan, tambahkan, kurangi, sisipkan, perbarui.
 */
KarsaAnalyzer.prototype.checkWriteToTurunan = function(node) {
  if (!node.target) return;
  var targetName = (typeof node.target === 'string') ? node.target : (node.target.name || null);
  if (!targetName) return;
  var symbol = this.lookupSymbol(targetName);
  if (symbol && symbol.kind === 'turunan') {
    this.addError('E4004', 
      `Data turunan "${targetName}" bersifat read-only dan tidak boleh diubah.`, 
      node.loc, 
      'Gunakan data (var) biasa jika perlu mengubah nilainya.');
  }
};

/**
 * Cek apakah statement berada di dalam ekspresi turunan (side-effect check).
 */
KarsaAnalyzer.prototype.checkSideEffectInTurunan = function(node) {
  if (this.context.inTurunanExpr) {
    this.addError('E4002', 
      'Ekspresi turunan tidak boleh mengandung aksi side-effect.', 
      node.loc, 
      'Hapus aksi simpan/tambahkan/kurangi/sisipkan dari ekspresi turunan.');
  }
};

// --- Visitor Methods ---

/**
 * Validasi Komponen (Section 8)
 */
KarsaAnalyzer.prototype.visitKomponenDeclaration = function(node) {
  const prevInComponent = this.context.inComponent;
  this.context.inComponent = true;

  // 1. Validasi Parameter (Section 15.3 context)
  const paramNames = new Set();
  let foundDefault = false;

  if (node.params) {
    node.params.forEach(p => {
      // Duplicate check
      if (paramNames.has(p.name)) {
        this.addError('E4005', `Parameter "${p.name}" duplikat dalam komponen "${node.name}".`, p.loc, "Hapus salah satu deklarasi parameter.");
      }
      paramNames.add(p.name);

      // Default param order check
      if (p.defaultValue) {
        foundDefault = true;
      } else if (foundDefault) {
        this.addError('E4006', `Parameter tanpa nilai default tidak boleh diletakkan setelah parameter dengan default.`, p.loc, "Pindahkan parameter dengan default ke akhir daftar.");
      }

      if (p.defaultValue) this.checkTypeHint(p.typeHint, p.defaultValue);
    });
  }

  this.genericVisit(node);
  this.context.inComponent = prevInComponent;
};

/**
 * Validasi Lifecycle Hook (Section 5.4 / 8.5)
 */
KarsaAnalyzer.prototype.visitLifecycleStatement = function(node) {
  if (!this.context.inComponent) {
    this.addError('E4001', `Lifecycle hook "saat komponen ${node.kind}" hanya valid di dalam komponen.`, node.loc, "Pindahkan blok ini ke dalam definisi komponen.");
  }
  
  if (this.context.loopDepth > 0 || this.context.handlerDepth > 0) {
    this.addWarning('W4002', `Lifecycle hook sebaiknya tidak diletakkan di dalam loop atau handler.`, node.loc);
  }

  this.genericVisit(node);
};

/**
 * Validasi Turunan (Section 7.4)
 */
KarsaAnalyzer.prototype.visitTurunanDeclaration = function(node) {
  const prevInTurunan = this.context.inTurunanExpr;
  this.context.inTurunanExpr = true;
  
  this.genericVisit(node);
  this.context.inTurunanExpr = prevInTurunan;
};

/**
 * Validasi Type Hint pada Deklarasi Data (Section 7.3)
 */
KarsaAnalyzer.prototype.visitDataDeclaration = function(node) {
  if (node.typeHint && node.init) {
    this.checkTypeHint(node.typeHint, node.init);
  }
  this.genericVisit(node);
};

KarsaAnalyzer.prototype.visitTetapDeclaration = function(node) {
  if (node.typeHint && node.init) {
    this.checkTypeHint(node.typeHint, node.init);
  }
  // W4003: tetap tanpa nilai awal
  if (!node.init) {
    this.addWarning('W4003', `Deklarasi "tetap" untuk "${node.name}" tanpa nilai awal.`, node.loc, 'Berikan nilai awal untuk konstanta.');
  }
  this.genericVisit(node);
};

KarsaAnalyzer.prototype.visitUbahDeclaration = function(node) {
  if (node.typeHint && node.init) {
    this.checkTypeHint(node.typeHint, node.init);
  }
  this.genericVisit(node);
};

/**
 * Validasi Reaktivitas & Assignment (Section 7.5)
 */
KarsaAnalyzer.prototype.visitSimpanStatement = function(node) {
  // Cek side-effect dalam turunan
  this.checkSideEffectInTurunan(node);
  // Cek apakah target adalah turunan (read-only)
  this.checkWriteToTurunan(node);

  this.genericVisit(node);
};

// ─── Mutation Statements (C5/M1 FIX) ──────────────────────

KarsaAnalyzer.prototype.visitTambahkanStatement = function(node) {
  this.checkSideEffectInTurunan(node);
  this.checkWriteToTurunan(node);
  this.genericVisit(node);
};

KarsaAnalyzer.prototype.visitKurangiStatement = function(node) {
  this.checkSideEffectInTurunan(node);
  this.checkWriteToTurunan(node);
  this.genericVisit(node);
};

KarsaAnalyzer.prototype.visitSisipkanStatement = function(node) {
  this.checkSideEffectInTurunan(node);
  this.checkWriteToTurunan(node);
  this.genericVisit(node);
};

// ─── PerbaruiStatement (C5 FIX) ────────────────────────────
KarsaAnalyzer.prototype.visitPerbaruiStatement = function(node) {
  // Cek side-effect dalam turunan
  this.checkSideEffectInTurunan(node);
  // Cek apakah target adalah turunan (read-only)
  this.checkWriteToTurunan(node);
  this.genericVisit(node);
};

// ─── GunakanStatement (H4 FIX) ─────────────────────────────
KarsaAnalyzer.prototype.visitGunakanStatement = function(node) {
  if (node.componentName) {
    var symbol = this.lookupSymbol(node.componentName);
    if (symbol && symbol.kind !== 'komponen') {
      this.addError('E4010', `"${node.componentName}" bukan komponen, tidak dapat digunakan dengan "gunakan".`, node.loc, 'Pastikan nama yang direferensikan adalah komponen (PascalCase).');
    }
  }
  this.genericVisit(node);
};

// ─── TampilkanStatement (H4 FIX) ───────────────────────────
KarsaAnalyzer.prototype.visitTampilkanStatement = function(node) {
  const validModes = ["tambahkan", "ganti", "awalan", "sebelum", "sesudah"];
  if (node.mode && validModes.indexOf(node.mode) === -1) {
    this.addError('E4007', `Mode "${node.mode}" tidak dikenal.`, node.loc, `Mode yang valid: ${validModes.join(", ")}.`);
  }
  this.genericVisit(node);
};

// ─── SembunyikanStatement (H4 FIX) ─────────────────────────
KarsaAnalyzer.prototype.visitSembunyikanStatement = function(node) {
  this.genericVisit(node);
};

// ─── HapusStatement (H4 FIX) ───────────────────────────────
KarsaAnalyzer.prototype.visitHapusStatement = function(node) {
  this.genericVisit(node);
};

// ─── KosongkanStatement (H4 FIX) ───────────────────────────
KarsaAnalyzer.prototype.visitKosongkanStatement = function(node) {
  this.genericVisit(node);
};

// ─── ArahkanStatement (H4 FIX) ─────────────────────────────
KarsaAnalyzer.prototype.visitArahkanStatement = function(node) {
  this.genericVisit(node);
};

// ─── SetelahStatement (H4 FIX) ─────────────────────────────
KarsaAnalyzer.prototype.visitSetelahStatement = function(node) {
  this.genericVisit(node);
};

// ─── AmbilDomStatement (H4 FIX) ────────────────────────────
KarsaAnalyzer.prototype.visitAmbilDomStatement = function(node) {
  this.genericVisit(node);
};

// ─── AmbilLuarStatement (H4 FIX) ───────────────────────────
KarsaAnalyzer.prototype.visitAmbilLuarStatement = function(node) {
  this.genericVisit(node);
};

/**
 * Validasi Kontrol Alur (Section 6.5)
 * [H6 FIX] E6xxx → E4xxx baru
 */
KarsaAnalyzer.prototype.visitBerhentiStatement = function(node) {
  const isValid = this.context.loopDepth > 0 || this.context.handlerDepth > 0;
  if (!isValid) {
    this.addError('E4011', '"berhenti" tidak valid di luar loop atau event handler.', node.loc, '"berhenti" hanya valid di dalam loop atau event handler.');
  }
  if (this.context.inFunction && this.context.loopDepth === 0 && this.context.handlerDepth === 0) {
    this.addError('E4011', '"berhenti" di dalam fungsi (bukan loop/handler) tidak valid.', node.loc, 'Gunakan "kembalikan" untuk keluar dari fungsi.');
  }
};

KarsaAnalyzer.prototype.visitLewatiStatement = function(node) {
  if (this.context.loopDepth === 0) {
    this.addError('E4012', '"lewati" tidak valid di luar loop.', node.loc, 'Gunakan "lewati" hanya di dalam "ulangi" atau "selama".');
  }
};

KarsaAnalyzer.prototype.visitKembalikanStatement = function(node) {
  if (!this.context.inFunction && !this.context.inComponent) {
    this.addError('E4013', '"kembalikan" tidak valid di luar fungsi atau komponen.', node.loc, 'Gunakan "kembalikan" hanya di dalam fungsi atau komponen.');
  }
};

/**
 * Validasi Konteks Loop & Handler
 */
KarsaAnalyzer.prototype.visitUlangiStatement = function(node) {
  this.context.loopDepth++;
  this.genericVisit(node);
  this.context.loopDepth--;
};

KarsaAnalyzer.prototype.visitSelamaStatement = function(node) {
  this.context.loopDepth++;
  this.genericVisit(node);
  this.context.loopDepth--;
};

KarsaAnalyzer.prototype.visitKetikaStatement = function(node) {
  this.context.handlerDepth++;
  this.genericVisit(node);
  this.context.handlerDepth--;
};

KarsaAnalyzer.prototype.visitFungsiDeclaration = function(node) {
  const prevInFunc = this.context.inFunction;
  this.context.inFunction = true;
  this.genericVisit(node);
  this.context.inFunction = prevInFunc;
};

/**
 * Validasi Watcher (Section 7.6)
 */
KarsaAnalyzer.prototype.visitSaatStatement = function(node) {
  this.genericVisit(node);
};

module.exports = KarsaAnalyzer;