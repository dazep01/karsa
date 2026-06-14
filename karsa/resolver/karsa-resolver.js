/**
 * KARSA v0.3.1 — RESOLVER (Tahap 3)
 * ----------------------------------------------------------------------------
 * Menyelesaikan resolusi nama, scope, alias properti, dan self-reference.
 *
 * Sesuai Spesifikasi: KARSA-grammar-spec_v0_3_1.md
 */

const { BaseVisitor, accept } = require('../utils/visitor');

/**
 * Tabel Alias Properti Indonesia -> JavaScript (Section 10.1)
 */
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

/**
 * Kelas Scope untuk mengelola binding variabel
 */
function Scope(type, parent) {
  this.type = type; // 'global', 'blok', 'komponen', 'iterasi', 'watcher'
  this.parent = parent;
  this.bindings = {};
}

Scope.prototype.define = function(name, metadata) {
  this.bindings[name] = metadata;
};

Scope.prototype.lookup = function(name) {
  if (this.bindings[name]) {
    return this.bindings[name];
  }
  if (this.parent) {
    return this.parent.lookup(name);
  }
  return null;
};

/**
 * Resolver KARSA
 */
function KarsaResolver() {
  BaseVisitor.call(this);
  this.errors = [];
  this.warnings = [];
  this.currentScope = null;
  this.buatStack = []; // Untuk melacak parent BuatStatement (self-reference)
}

KarsaResolver.prototype = Object.create(BaseVisitor.prototype);
KarsaResolver.prototype.constructor = KarsaResolver;

/**
 * Entry point utama Resolver
 */
KarsaResolver.prototype.resolve = function(ast) {
  this.errors = [];
  this.warnings = [];
  this.currentScope = new Scope('global', null);

  // Tahap 1: Gather Global Declarations (Hoisting)
  this.gatherGlobals(ast);

  // Tahap 2: Deep Resolution
  accept(ast, this);

  return {
    ast: ast,
    errors: this.errors,
    warnings: this.warnings
  };
};

/**
 * Tahap 1: Mencari deklarasi top-level (Data, Fungsi, Komponen)
 */
KarsaResolver.prototype.gatherGlobals = function(ast) {
  if (!ast.body) return;
  ast.body.forEach(node => {
    let name = '';
    let type = '';
    let isReactive = false;

    if (node.type === 'DataDeclaration') { name = node.name; type = 'data'; isReactive = true; }
    else if (node.type === 'TetapDeclaration') { name = node.name; type = 'tetap'; }
    else if (node.type === 'UbahDeclaration') { name = node.name; type = 'ubah'; }
    else if (node.type === 'TurunanDeclaration') { name = node.name; type = 'turunan'; isReactive = true; }
    else if (node.type === 'FungsiDeclaration') { name = node.name; type = 'fungsi'; }
    else if (node.type === 'KomponenDeclaration') { name = node.name; type = 'komponen'; }

    if (name) {
      this.currentScope.define(name, {
        referencedNode: node,
        scope: 'global',
        isReactive: isReactive,
        type: type
      });
    }
  });
};

// --- Override Visitor Methods ---

KarsaResolver.prototype.visitBlockStatement = function(node) {
  const oldScope = this.currentScope;
  this.currentScope = new Scope('blok', oldScope);
  
  this.genericVisit(node);
  
  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitKomponenDeclaration = function(node) {
  // Komponen Scope
  const oldScope = this.currentScope;
  this.currentScope = new Scope('komponen', oldScope);

  // Daftarkan parameter ke scope komponen
  if (node.params) {
    node.params.forEach(p => {
      this.currentScope.define(p.name, {
        referencedNode: p,
        scope: 'komponen',
        isReactive: true, // Parameter bersifat reaktif terhadap perubahan props
        type: 'parameter'
      });
    });
  }

  // Komponen bertindak sebagai "element root" untuk self-reference jika tidak ada BuatStatement
  this.buatStack.push(node);
  this.genericVisit(node);
  this.buatStack.pop();

  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitFungsiDeclaration = function(node) {
  const oldScope = this.currentScope;
  this.currentScope = new Scope('blok', oldScope);

  if (node.params) {
    node.params.forEach(p => {
      this.currentScope.define(p.name, {
        referencedNode: p,
        scope: 'blok',
        isReactive: false,
        type: 'parameter'
      });
    });
  }

  this.genericVisit(node);
  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitUlangiStatement = function(node) {
  // Resolve source dulu di scope sekarang
  accept(node.source, this);

  // Buat Iterasi Scope
  const oldScope = this.currentScope;
  this.currentScope = new Scope('iterasi', oldScope);

  if (node.iteratorName) {
    this.currentScope.define(node.iteratorName, {
      referencedNode: node,
      scope: 'iterasi',
      isReactive: true,
      type: 'ubah' // Variabel iterasi berubah tiap loop
    });
  }

  // Visit body dalam scope iterasi
  accept(node.body, this);

  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitIdentifier = function(node) {
  // Kecuali jika ini adalah bagian dari deklarasi atau properti
  const binding = this.currentScope.lookup(node.name);
  if (binding) {
    node.resolved = {
      referencedNode: binding.referencedNode,
      scope: binding.scope,
      isReactive: binding.isReactive,
      type: binding.type
    };
  } else {
    // Abaikan jika identifier adalah nama fungsi JS eksternal (jalankan) 
    // atau jika berada dalam context yang tidak butuh resolusi (diatur oleh parent)
    if (!node.isCalleeJS) {
       this.addError('E3001', `Variabel atau fungsi "${node.name}" tidak dikenal.`, node.loc);
    }
  }
};

KarsaResolver.prototype.visitMemberExpression = function(node) {
  // Visit object (kiri)
  accept(node.object, this);

  // Resolusi Alias Properti (Section 10)
  if (node.property.type === 'Identifier') {
    const propName = node.property.name;
    
    // Khusus .indeks dalam scope iterasi
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

KarsaResolver.prototype.visitKetikaStatement = function(node) {
  // Resolusi Self-Reference (v0.3.1)
  if (!node.target) {
    if (this.buatStack.length > 0) {
      const parentNode = this.buatStack[this.buatStack.length - 1];
      node.target = {
        type: 'SelfReference',
        referencedNode: parentNode,
        loc: node.loc
      };
    } else {
      this.addError('E5001', 'Event listener "ketika" tanpa target hanya boleh di dalam blok "buat" atau "komponen".', node.loc);
    }
  } else {
    accept(node.target, this);
  }

  // Ketika body/action diparse, masuk ke "Watcher-like" scope
  const oldScope = this.currentScope;
  this.currentScope = new Scope('watcher', oldScope);
  
  if (node.body) accept(node.body, this);
  if (node.action) accept(node.action, this);

  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitSaatStatement = function(node) {
  // Resolusi target reaktif
  const binding = this.currentScope.lookup(node.target);
  if (!binding) {
    this.addError('E3001', `Data reaktif "${node.target}" tidak ditemukan.`, node.loc);
  } else if (!binding.isReactive) {
    this.warnings.push({
        kode: 'W3001',
        pesan: `Variabel "${node.target}" bukan data reaktif. Watcher mungkin tidak akan pernah terpicu.`,
        loc: node.loc
    });
  }

  // Watcher Scope
  const oldScope = this.currentScope;
  this.currentScope = new Scope('watcher', oldScope);
  this.genericVisit(node);
  this.currentScope = oldScope;
};

KarsaResolver.prototype.visitBuatStatement = function(node) {
  this.buatStack.push(node);
  this.genericVisit(node);
  this.buatStack.pop();
};

KarsaResolver.prototype.visitDataDeclaration = function(node) {
    // Jika bukan global (misal di dalam komponen/fungsi), daftarkan ke scope sekarang
    if (this.currentScope.type !== 'global') {
        this.currentScope.define(node.name, {
            referencedNode: node,
            scope: this.currentScope.type,
            isReactive: true,
            type: 'data'
        });
    }
    this.genericVisit(node);
};

KarsaResolver.prototype.visitTetapDeclaration = function(node) {
    if (this.currentScope.type !== 'global') {
        this.currentScope.define(node.name, {
            referencedNode: node,
            scope: this.currentScope.type,
            isReactive: false,
            type: 'tetap'
        });
    }
    this.genericVisit(node);
};

KarsaResolver.prototype.visitUbahDeclaration = function(node) {
    if (this.currentScope.type !== 'global') {
        this.currentScope.define(node.name, {
            referencedNode: node,
            scope: this.currentScope.type,
            isReactive: false,
            type: 'ubah'
        });
    }
    this.genericVisit(node);
};

KarsaResolver.prototype.visitJalankanExpression = function(node) {
    // Tandai identifier callee agar tidak dianggap error E3001 (JS Interop)
    // Karena 'jalankan' memanggil JS eksternal yang tidak divalidasi resolver
    if (node.calleeNode) {
        // Jika callee berupa identifier atau member expression kompleks
        this.markAsJSExternal(node.calleeNode);
    }
    this.genericVisit(node);
};

KarsaResolver.prototype.markAsJSExternal = function(node) {
    if (node.type === 'Identifier') {
        node.isCalleeJS = true;
    } else if (node.type === 'MemberExpression') {
        this.markAsJSExternal(node.object);
    }
};

KarsaResolver.prototype.addError = function(kode, pesan, loc) {
  this.errors.push({
    kode: kode,
    pesan: pesan,
    loc: loc
  });
};

module.exports = KarsaResolver;
