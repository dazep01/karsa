/**
 * KARSA v0.3.1 — Visitor Pattern
 *
 * Implementasi visitor untuk traversing AST KARSA.
 * Berdasarkan: RFC-PARSER-001 §8
 */

var TT = require('../parser/token-types');

/**
 * Dispatch otomatis ke metode visit yang sesuai berdasarkan node.type.
 *
 * @param {object} node - Node AST
 * @param {object} visitor - Objek visitor dengan metode visit*
 * @returns {*} Hasil dari metode visit
 */
function accept(node, visitor) {
  if (!node || !node.type) return undefined;

  var methodName = 'visit' + node.type;

  if (typeof visitor[methodName] === 'function') {
    return visitor[methodName](node);
  }

  // Fallback: genericVisit
  if (typeof visitor.genericVisit === 'function') {
    return visitor.genericVisit(node);
  }

  return undefined;
}

/**
 * Melakukan traversing depth-first ke semua anak node.
 *
 * @param {object} node - Node AST
 * @param {object} visitor - Objek visitor
 */
function traverse(node, visitor) {
  if (!node) return;

  // Hanya dispatch ke metode visit; genericVisit yang menangani traversing anak
  accept(node, visitor);
}

/**
 * Mendapatkan nama properti anak untuk setiap tipe node.
 */
function getChildKeys(nodeType) {
  switch (nodeType) {
    case 'Program': return ['body'];
    case 'BlockStatement': return ['body'];
    case 'BuatStatement': return ['selector', 'properties', 'body', 'action'];
    case 'TampilkanStatement': return ['target', 'mountTarget'];
    case 'SembunyikanStatement': return ['target'];
    case 'HapusStatement': return ['target'];
    case 'KosongkanStatement': return ['target'];
    case 'PerbaruiStatement': return ['target', 'value'];
    case 'KetikaStatement': return ['target', 'body', 'action'];
    case 'SaatStatement': return ['body'];
    case 'LifecycleStatement': return ['body'];
    case 'SetelahStatement': return ['body', 'action'];
    case 'JikaStatement': return ['condition', 'consequent', 'alternate'];
    case 'UlangiStatement': return ['source', 'body', 'rangeEnd'];
    case 'SelamaStatement': return ['condition', 'body'];
    case 'KembalikanStatement': return ['value'];
    case 'SimpanStatement': return ['value'];
    case 'TambahkanStatement': return ['value'];
    case 'KurangiStatement': return ['value'];
    case 'SisipkanStatement': return ['value'];
    case 'AmbilDomStatement': return ['source'];
    case 'AmbilLuarStatement': return ['url', 'options', 'branches'];
    case 'KomponenDeclaration': return ['params', 'body'];
    case 'FungsiDeclaration': return ['params', 'body'];
    case 'GunakanStatement': return ['props', 'mountTarget'];
    case 'JalankanExpression': return ['arguments', 'withArgs'];
    case 'RantaiAksi': return ['first', 'chain'];
    case 'BinaryExpression': return ['left', 'right'];
    case 'UnaryExpression': return ['operand'];
    case 'MemberExpression': return ['object', 'property'];
    case 'CallExpression': return ['callee', 'arguments'];
    case 'PanggilNativeExpression': return ['callee', 'arguments'];
    case 'ObjectLiteral': return ['properties'];
    case 'ArrayLiteral': return ['elements'];
    case 'Selector': return ['attributes'];
    case 'PropertyNode': return ['value'];
    case 'AttributeNode': return ['value'];
    case 'Parameter': return ['defaultValue'];
    case 'SelfReference': return [];
    case 'DataDeclaration': return ['init'];
    case 'TetapDeclaration': return ['init'];
    case 'UbahDeclaration': return ['init'];
    case 'TurunanDeclaration': return ['init'];
    case 'ArahkanStatement': return ['url'];
    case 'FetchBranch': return ['action'];
    case 'FetchOption': return ['value'];
    default: return [];
  }
}

/**
 * Base Visitor: implementasi default yang melakukan traversing depth-first.
 * Visitor kustom bisa meng-extend ini dan meng-override metode tertentu.
 */
function BaseVisitor() {}

BaseVisitor.prototype.genericVisit = function (node) {
  var childKeys = getChildKeys(node.type);
  for (var i = 0; i < childKeys.length; i++) {
    var key = childKeys[i];
    var child = node[key];
    if (Array.isArray(child)) {
      for (var j = 0; j < child.length; j++) {
        if (child[j] && typeof child[j] === 'object' && child[j].type) {
          accept(child[j], this);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      accept(child, this);
    }
  }
};

// Buat metode visit untuk setiap tipe node yang meneruskan ke genericVisit
var nodeTypes = [
  'Program', 'BlockStatement',
  'DataDeclaration', 'TetapDeclaration', 'UbahDeclaration', 'TurunanDeclaration',
  'KomponenDeclaration', 'FungsiDeclaration',
  'BuatStatement', 'TampilkanStatement', 'SembunyikanStatement',
  'HapusStatement', 'KosongkanStatement', 'PerbaruiStatement',
  'KetikaStatement', 'SaatStatement', 'LifecycleStatement', 'SetelahStatement',
  'JikaStatement', 'UlangiStatement', 'SelamaStatement',
  'BerhentiStatement', 'LewatiStatement', 'KembalikanStatement',
  'SimpanStatement', 'TambahkanStatement', 'KurangiStatement', 'SisipkanStatement',
  'AmbilDomStatement', 'AmbilLuarStatement',
  'GunakanStatement', 'ArahkanStatement', 'MuatUlangStatement', 'KembaliStatement',
  'LangsungBlock', 'JalankanExpression', 'PanggilNativeExpression',
  'RantaiAksi',
  'Literal', 'Identifier', 'BinaryExpression', 'UnaryExpression',
  'MemberExpression', 'CallExpression', 'ObjectLiteral', 'ArrayLiteral',
  'Selector', 'PropertyNode', 'AttributeNode', 'Parameter',
  'FetchBranch', 'FetchOption',
  'SelfReference',
  'ErrorNode'
];

nodeTypes.forEach(function (type) {
  BaseVisitor.prototype['visit' + type] = function (node) {
    return this.genericVisit(node);
  };
});

/**
 * CollectingVisitor: mengumpulkan semua node bertipe tertentu.
 */
function CollectingVisitor(targetType) {
  this.targetType = targetType;
  this.results = [];
}

CollectingVisitor.prototype = Object.create(BaseVisitor.prototype);
CollectingVisitor.prototype.constructor = CollectingVisitor;

CollectingVisitor.prototype.genericVisit = function (node) {
  if (node.type === this.targetType) {
    this.results.push(node);
  }
  // Jangan traverse lagi — BaseVisitor.prototype.genericVisit sudah dipanggil
  // oleh metode visit* yang mewarisi dari BaseVisitor
  var childKeys = getChildKeys(node.type);
  for (var i = 0; i < childKeys.length; i++) {
    var key = childKeys[i];
    var child = node[key];
    if (Array.isArray(child)) {
      for (var j = 0; j < child.length; j++) {
        if (child[j] && typeof child[j] === 'object' && child[j].type) {
          accept(child[j], this);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      accept(child, this);
    }
  }
};

/**
 * Format AST menjadi string yang bisa dibaca.
 */
function formatAST(node, indent) {
  if (!indent) indent = 0;
  if (!node) return 'null';

  var pad = '';
  for (var i = 0; i < indent; i++) pad += '  ';

  if (typeof node !== 'object') return String(node);

  var result = pad + node.type;
  if (node.loc) {
    result += ' @' + node.loc.start.line + ':' + node.loc.start.column;
  }

  var childKeys = getChildKeys(node.type);
  var scalarProps = [];

  // Tampilkan properti skalar
  for (var key in node) {
    if (node.hasOwnProperty(key) &&
        key !== 'type' && key !== 'loc' && key !== 'docstring' &&
        childKeys.indexOf(key) === -1 &&
        typeof node[key] !== 'object') {
      scalarProps.push(key + ': ' + JSON.stringify(node[key]));
    }
  }

  if (scalarProps.length > 0) {
    result += ' (' + scalarProps.join(', ') + ')';
  }

  result += '\n';

  // Tampilkan anak-anak
  for (var c = 0; c < childKeys.length; c++) {
    var ckey = childKeys[c];
    var child = node[ckey];
    if (Array.isArray(child)) {
      for (var j = 0; j < child.length; j++) {
        result += formatAST(child[j], indent + 1);
      }
    } else if (child && typeof child === 'object') {
      result += formatAST(child, indent + 1);
    }
  }

  return result;
}

module.exports = {
  accept: accept,
  traverse: traverse,
  getChildKeys: getChildKeys,
  BaseVisitor: BaseVisitor,
  CollectingVisitor: CollectingVisitor,
  formatAST: formatAST,
  nodeTypes: nodeTypes
};
