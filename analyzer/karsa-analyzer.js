/**
 * KARSA v0.3.1 — ANALYZER (Tahap 4)
 * ----------------------------------------------------------------------------
 * Melakukan validasi semantik: tipe, reaktivitas, kontrol alur, dan lifecycle.
 *
 * Sesuai Spesifikasi: KARSA-grammar-spec_v0_3_1.md
 */

const { BaseVisitor, accept } = require('../utils/visitor');

function KarsaAnalyzer() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  
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
  accept(ast, this);
  return {
    ast: ast,
    errors: this.errors,
    warnings: this.warnings
  };
};

// --- Helpers ---

KarsaAnalyzer.prototype.addError = function(kode, pesan, loc, saran) {
  this.errors.push({ kode, pesan, loc, saran });
};

KarsaAnalyzer.prototype.addWarning = function(kode, pesan, loc, saran) {
  this.warnings.push({ kode, pesan, loc, saran, severity: 'warning' });
};

/**
 * Validasi Tipe Dasar (Section 7.3)
 */
KarsaAnalyzer.prototype.checkTypeHint = function(typeHint, valueNode) {
  if (!typeHint || !valueNode || valueNode.type === 'ErrorNode') return;

  const mapping = {
    'teks': 'teks',
    'angka': 'angka',
    'benar-salah': 'boolean',
    'objek': 'ObjectLiteral',
    'array': 'ArrayLiteral'
  };

  let actualType = '';
  if (valueNode.type === 'Literal') {
    if (typeof valueNode.value === 'number') actualType = 'angka';
    else if (typeof valueNode.value === 'string') actualType = 'teks';
    else if (typeof valueNode.value === 'boolean') actualType = 'benar-salah';
  }
  else if (valueNode.type === 'ObjectLiteral') actualType = 'objek';
  else if (valueNode.type === 'ArrayLiteral') actualType = 'array';

  const expected = typeHint; // Kita bandingkan langsung dengan alias Karsa
  if (expected && actualType && expected !== actualType) {
    this.addWarning('W4001', 
      `Type hint "${typeHint}" tidak cocok dengan nilai awal bertipe "${actualType}".`, 
      valueNode.loc, 
      `Gunakan nilai yang sesuai atau ubah type hint menjadi yang benar.`);
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
  
  // Turunan tidak boleh berisi aksi (side-effect)
  // Ini divalidasi dengan mengecek apakah ada statement di dalam expression-nya
  // (Parser sudah menjamin Turunan berisi Expression, tapi kita cek isinya)
  
  this.genericVisit(node);
  this.context.inTurunanExpr = prevInTurunan;
};

/**
 * Validasi Reaktivitas & Assignment (Section 7.5)
 */
KarsaAnalyzer.prototype.visitSimpanStatement = function(node) {
  if (this.context.inTurunanExpr) {
    this.addError('E4004', "Ekspresi turunan tidak boleh mengandung aksi simpan (side-effect).", node.loc);
  }

  // Cek apakah target adalah turunan (read-only)
  if (node.target) {
    // Di KarsaParser, SimpanStatement menyimpan target sebagai string nama
    // Kita perlu bantuan dari info resolve di Identifier (jika ada)
    // Namun SimpanStatement biasanya memegang identifier node di value/target
  }

  this.genericVisit(node);
};

// Cek modifikasi ke data reaktif
KarsaAnalyzer.prototype.visitTambahkanStatement = function(node) { this.checkWriteToTurunan(node); this.genericVisit(node); };
KarsaAnalyzer.prototype.visitKurangiStatement = function(node) { this.checkWriteToTurunan(node); this.genericVisit(node); };
KarsaAnalyzer.prototype.visitSisipkanStatement = function(node) { this.checkWriteToTurunan(node); this.genericVisit(node); };

KarsaAnalyzer.prototype.checkWriteToTurunan = function(node) {
  // Logic: Jika target me-resolve ke TurunanDeclaration -> Error
  // (Implementasi ini membutuhkan mapping identifier dari Resolver)
  // Diasumsikan Resolver sudah menaruh info di node.target jika itu identifier
};

/**
 * Validasi Kontrol Alur (Section 6.5)
 */
KarsaAnalyzer.prototype.visitBerhentiStatement = function(node) {
  const isValid = this.context.loopDepth > 0 || this.context.handlerDepth > 0;
  if (!isValid) {
    this.addError('E6001', '"berhenti" tidak valid di sini.', node.loc, '"berhenti" hanya valid di dalam loop atau event handler.');
  }
  if (this.context.inFunction && this.context.loopDepth === 0 && this.context.handlerDepth === 0) {
    this.addError('E6001', '"berhenti" di dalam fungsi (bukan loop/handler) tidak valid.', node.loc, 'Gunakan "kembalikan" untuk keluar dari fungsi.');
  }
};

KarsaAnalyzer.prototype.visitLewatiStatement = function(node) {
  if (this.context.loopDepth === 0) {
    this.addError('E6002', '"lewati" tidak valid di luar loop.', node.loc, 'Gunakan "lewati" hanya di dalam "ulangi" atau "selama".');
  }
};

KarsaAnalyzer.prototype.visitKembalikanStatement = function(node) {
  if (!this.context.inFunction && !this.context.inComponent) {
    // Secara teknis komponen dan fungsi adalah tempat valid untuk kembalikan
    this.addError('E6003', '"kembalikan" tidak valid di luar fungsi atau komponen.', node.loc);
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
 * Validasi Tampilkan (Section 4.4)
 */
KarsaAnalyzer.prototype.visitTampilkanStatement = function(node) {
  const validModes = ["tambahkan", "ganti", "awalan", "sebelum", "sesudah"];
  if (node.mode && validModes.indexOf(node.mode) === -1) {
    this.addError('E4007', `Mode "${node.mode}" tidak dikenal.`, node.loc, `Mode yang valid: ${validModes.join(", ")}.`);
  }
  this.genericVisit(node);
};

/**
 * Validasi Watcher (Section 7.6)
 */
KarsaAnalyzer.prototype.visitSaatStatement = function(node) {
  // Target watcher sudah di-resolve namanya, analyzer bisa cek tipenya jika metadata tersedia
  this.genericVisit(node);
};

module.exports = KarsaAnalyzer;
