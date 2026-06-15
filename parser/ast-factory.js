/**
 * KARSA v0.3.1 — AST Node Factory
 *
 * Fungsi pembuatan node AST yang menjamin:
 * - Setiap node memiliki `type` dan `loc` (TIDAK PERNAH null/undefined)
 * - `loc` mengikuti format SourceLocation { start: Position, end: Position }
 * - Properti anak berupa array, bukan null
 * - ErrorNode digunakan sebagai pengganti null pada posisi anak
 * - Jika loc tidak disediakan, digunakan UNKNOWN_LOC (0:0-0:0)
 *
 * Berdasarkan: AST Specification v1.0.0
 */

/**
 * Lokasi default untuk node yang tidak memiliki informasi posisi.
 * Digunakan sebagai fallback ketika parser tidak menyediakan loc.
 */
var UNKNOWN_LOC = {
  start: { line: 0, column: 0 },
  end: { line: 0, column: 0 }
};

/**
 * Memastikan loc selalu valid. Jika loc null/undefined, kembalikan UNKNOWN_LOC.
 * @param {object|null|undefined} loc
 * @returns {object} SourceLocation yang valid
 */
function ensureLoc(loc) {
  if (!loc) return UNKNOWN_LOC;
  if (!loc.start) return UNKNOWN_LOC;
  return loc;
}

/**
 * Membuat SourceLocation dari token atau dua posisi.
 * @param {object} start - { line, column } atau Token
 * @param {object} end - { line, column } atau Token
 * @returns {object} SourceLocation
 */
function buatLoc(start, end) {
  // Jika keduanya tidak ada, kembalikan UNKNOWN_LOC
  if (!start && !end) return UNKNOWN_LOC;

  var s = start;
  var e = end;
  // Jika start adalah token, ambil posisinya
  if (start && start.baris !== undefined) {
    s = { line: start.baris, column: start.kolom };
  }
  if (end && end.baris !== undefined) {
    e = { line: end.baris, column: end.kolom };
  }
  // Jika end tidak diberikan, gunakan start
  if (!e) {
    e = s;
  }
  // Jika start masih tidak valid, kembalikan UNKNOWN_LOC
  if (!s) return UNKNOWN_LOC;
  return {
    start: { line: s.line, column: s.column },
    end: { line: e.line, column: e.column }
  };
}

/**
 * Membuat lokasi dari token awal dan token akhir.
 */
function locFromTokens(startToken, endToken) {
  return buatLoc(
    { line: startToken.baris, column: startToken.kolom },
    { line: endToken.baris, column: endToken.kolom + (endToken.nilai ? endToken.nilai.length : 1) }
  );
}

/**
 * Menggabungkan dua SourceLocation, mengembalikan rentang terluas.
 */
function gabungLoc(locA, locB) {
  if (!locA) return locB;
  if (!locB) return locA;
  return {
    start: {
      line: Math.min(locA.start.line, locB.start.line),
      column: locA.start.line <= locB.start.line ? locA.start.column : locB.start.column
    },
    end: {
      line: Math.max(locA.end.line, locB.end.line),
      column: locA.end.line >= locB.end.line ? locA.end.column : locB.end.column
    }
  };
}

// ─── Root Node ─────────────────────────────────────────────

function buatProgramNode(body, loc, source) {
  return {
    type: 'Program',
    loc: ensureLoc(loc) || buatLoc({ line: 1, column: 1 }, { line: 1, column: 1 }),
    body: body || [],
    source: source || undefined
  };
}

// ─── Declaration Nodes ─────────────────────────────────────

function buatDataDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'DataDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatTetapDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'TetapDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatUbahDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'UbahDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatTurunanDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'TurunanDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatKomponenDeclaration(name, params, body, loc, docstring, returnType) {
  return {
    type: 'KomponenDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    params: params || [],
    returnType: returnType || undefined,
    body: body
  };
}

function buatFungsiDeclaration(name, params, body, loc, docstring, returnType) {
  return {
    type: 'FungsiDeclaration',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    name: name,
    params: params || [],
    returnType: returnType || undefined,
    body: body
  };
}

// ─── Statement Nodes ───────────────────────────────────────

function buatBlockStatement(body, loc) {
  return {
    type: 'BlockStatement',
    loc: ensureLoc(loc),
    body: body || []
  };
}

function buatBuatStatement(selector, loc, docstring, properties, body, action) {
  var node = {
    type: 'BuatStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    selector: selector
  };
  if (properties && properties.length > 0) {
    node.properties = properties;
  }
  if (body) {
    node.body = body;
  }
  if (action) {
    node.action = action;
  }
  return node;
}

function buatTampilkanStatement(target, loc, docstring, mountTarget, mode, messageKind) {
  var node = {
    type: 'TampilkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target
  };
  if (mountTarget) node.mountTarget = mountTarget;
  if (mode) node.mode = mode;
  if (messageKind) node.messageKind = messageKind;
  return node;
}

function buatSembunyikanStatement(target, loc, docstring) {
  return {
    type: 'SembunyikanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target
  };
}

function buatHapusStatement(target, loc, docstring) {
  return {
    type: 'HapusStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target
  };
}

function buatKosongkanStatement(target, loc, docstring) {
  return {
    type: 'KosongkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target
  };
}

function buatPerbaruiStatement(property, target, value, loc, docstring) {
  return {
    type: 'PerbaruiStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    property: property,
    target: target,
    value: value
  };
}

function buatKetikaStatement(event, loc, docstring, target, body, action) {
  var node = {
    type: 'KetikaStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    event: event
  };
  if (target) node.target = target;
  if (body) node.body = body;
  if (action) node.action = action;
  return node;
}

function buatSaatStatement(target, body, loc, docstring) {
  return {
    type: 'SaatStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target,
    body: body
  };
}

function buatLifecycleStatement(kind, body, loc, docstring) {
  return {
    type: 'LifecycleStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    kind: kind,
    body: body
  };
}

function buatSetelahStatement(target, loc, docstring, body, action) {
  var node = {
    type: 'SetelahStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target
  };
  if (body) node.body = body;
  if (action) node.action = action;
  return node;
}

function buatJikaStatement(condition, consequent, loc, docstring, alternate) {
  var node = {
    type: 'JikaStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    condition: condition,
    consequent: consequent
  };
  if (alternate) node.alternate = alternate;
  return node;
}

function buatUlangiStatement(iteratorName, source, body, kind, loc, docstring, rangeEnd) {
  var node = {
    type: 'UlangiStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    iteratorName: iteratorName,
    source: source,
    body: body,
    kind: kind
  };
  if (rangeEnd !== undefined && rangeEnd !== null) node.rangeEnd = rangeEnd;
  return node;
}

function buatSelamaStatement(condition, body, loc, docstring) {
  return {
    type: 'SelamaStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    condition: condition,
    body: body
  };
}

function buatBerhentiStatement(loc) {
  return { type: 'BerhentiStatement', loc: ensureLoc(loc) };
}

function buatLewatiStatement(loc) {
  return { type: 'LewatiStatement', loc: ensureLoc(loc) };
}

function buatKembalikanStatement(loc, value) {
  var node = { type: 'KembalikanStatement', loc: ensureLoc(loc) };
  if (value) node.value = value;
  return node;
}

function buatSimpanStatement(value, target, kind, loc, docstring) {
  return {
    type: 'SimpanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    value: value,
    target: target,
    kind: kind
  };
}

function buatTambahkanStatement(value, target, loc, docstring) {
  return {
    type: 'TambahkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    value: value,
    target: target
  };
}

function buatKurangiStatement(target, loc, docstring, value) {
  var node = {
    type: 'KurangiStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    target: target
  };
  if (value) node.value = value;
  return node;
}

function buatSisipkanStatement(value, target, loc, docstring) {
  return {
    type: 'SisipkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    value: value,
    target: target
  };
}

function buatAmbilDomStatement(kind, source, target, loc, docstring, attributeName) {
  var node = {
    type: 'AmbilDomStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    kind: kind,
    source: source,
    target: target
  };
  if (attributeName) node.attributeName = attributeName;
  return node;
}

function buatAmbilLuarStatement(url, branches, loc, docstring, options) {
  var node = {
    type: 'AmbilLuarStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    url: url,
    branches: branches || []
  };
  if (options && options.length > 0) node.options = options;
  return node;
}

function buatGunakanStatement(componentName, loc, docstring, props, mountTarget) {
  var node = {
    type: 'GunakanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    componentName: componentName
  };
  if (props && props.length > 0) node.props = props;
  if (mountTarget) node.mountTarget = mountTarget;
  return node;
}

function buatArahkanStatement(url, loc, docstring) {
  return {
    type: 'ArahkanStatement',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    url: url
  };
}

function buatMuatUlangStatement(loc) {
  return { type: 'MuatUlangStatement', loc: ensureLoc(loc) };
}

function buatKembaliStatement(loc) {
  return { type: 'KembaliStatement', loc: ensureLoc(loc) };
}

function buatLangsungBlock(content, loc) {
  return {
    type: 'LangsungBlock',
    loc: ensureLoc(loc),
    content: content
  };
}

function buatJalankanExpression(callee, kind, loc, docstring, arguments_, withArgs) {
  var node = {
    type: 'JalankanExpression',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    callee: callee,
    kind: kind
  };
  if (arguments_ && arguments_.length > 0) node.arguments = arguments_;
  if (withArgs && withArgs.length > 0) node.withArgs = withArgs;
  return node;
}

function buatPanggilNativeExpression(callee, arguments_, loc, docstring) {
  return {
    type: 'PanggilNativeExpression',
    loc: ensureLoc(loc),
    docstring: docstring || undefined,
    callee: callee,
    arguments: arguments_ || []
  };
}

function buatRantaiAksi(first, chain, loc) {
  return {
    type: 'RantaiAksi',
    loc: ensureLoc(loc),
    first: first,
    chain: chain
  };
}

// ─── Expression Nodes ──────────────────────────────────────

function buatLiteral(value, kind, loc) {
  return {
    type: 'Literal',
    loc: ensureLoc(loc),
    value: value,
    kind: kind
  };
}

function buatIdentifier(name, loc) {
  return {
    type: 'Identifier',
    loc: ensureLoc(loc),
    name: name
  };
}

function buatBinaryExpression(operator, left, right, loc) {
  return {
    type: 'BinaryExpression',
    loc: ensureLoc(loc),
    operator: operator,
    left: left,
    right: right
  };
}

function buatUnaryExpression(operator, operand, loc, prefix) {
  return {
    type: 'UnaryExpression',
    loc: ensureLoc(loc),
    operator: operator,
    operand: operand,
    prefix: prefix !== false
  };
}

function buatMemberExpression(object, property, loc) {
  return {
    type: 'MemberExpression',
    loc: ensureLoc(loc),
    object: object,
    property: property
  };
}

function buatCallExpression(callee, arguments_, loc) {
  return {
    type: 'CallExpression',
    loc: ensureLoc(loc),
    callee: callee,
    arguments: arguments_ || []
  };
}

function buatObjectLiteral(properties, loc) {
  return {
    type: 'ObjectLiteral',
    loc: ensureLoc(loc),
    properties: properties || []
  };
}

function buatArrayLiteral(elements, loc) {
  return {
    type: 'ArrayLiteral',
    loc: ensureLoc(loc),
    elements: elements || []
  };
}

// ─── UI & Selector Nodes ───────────────────────────────────

function buatSelector(tag, loc, id, classes, attributes) {
  return {
    type: 'Selector',
    loc: ensureLoc(loc),
    tag: tag,
    id: id || undefined,
    classes: classes || [],
    attributes: attributes || []
  };
}

function buatPropertyNode(key, value, loc, shorthand) {
  return {
    type: 'PropertyNode',
    loc: ensureLoc(loc),
    key: key,
    value: value,
    shorthand: !!shorthand
  };
}

function buatAttributeNode(key, value, loc) {
  return {
    type: 'AttributeNode',
    loc: ensureLoc(loc),
    key: key,
    value: value
  };
}

// ─── Special Nodes ─────────────────────────────────────────

function buatErrorNode(code, message, loc, originalToken) {
  var node = {
    type: 'ErrorNode',
    loc: ensureLoc(loc),
    code: code,
    kode: code,
    message: message,
    pesan: message
  };
  if (originalToken) node.originalToken = originalToken;
  return node;
}

// ─── Shared Types ──────────────────────────────────────────

function buatParameter(name, loc, typeHint, defaultValue) {
  var param = {
    type: 'Parameter',
    loc: ensureLoc(loc),
    name: name
  };
  if (typeHint) param.typeHint = typeHint;
  if (defaultValue) param.defaultValue = defaultValue;
  return param;
}

function buatFetchBranch(kind, action, loc) {
  return {
    type: 'FetchBranch',
    loc: ensureLoc(loc),
    kind: kind,
    action: action
  };
}

function buatFetchOption(key, value, loc) {
  return {
    type: 'FetchOption',
    key: key,
    value: value,
    loc: ensureLoc(loc)
  };
}

module.exports = {
  UNKNOWN_LOC: UNKNOWN_LOC,
  ensureLoc: ensureLoc,
  buatLoc: buatLoc,
  locFromTokens: locFromTokens,
  gabungLoc: gabungLoc,
  buatProgramNode: buatProgramNode,
  buatDataDeclaration: buatDataDeclaration,
  buatTetapDeclaration: buatTetapDeclaration,
  buatUbahDeclaration: buatUbahDeclaration,
  buatTurunanDeclaration: buatTurunanDeclaration,
  buatKomponenDeclaration: buatKomponenDeclaration,
  buatFungsiDeclaration: buatFungsiDeclaration,
  buatBlockStatement: buatBlockStatement,
  buatBuatStatement: buatBuatStatement,
  buatTampilkanStatement: buatTampilkanStatement,
  buatSembunyikanStatement: buatSembunyikanStatement,
  buatHapusStatement: buatHapusStatement,
  buatKosongkanStatement: buatKosongkanStatement,
  buatPerbaruiStatement: buatPerbaruiStatement,
  buatKetikaStatement: buatKetikaStatement,
  buatSaatStatement: buatSaatStatement,
  buatLifecycleStatement: buatLifecycleStatement,
  buatSetelahStatement: buatSetelahStatement,
  buatJikaStatement: buatJikaStatement,
  buatUlangiStatement: buatUlangiStatement,
  buatSelamaStatement: buatSelamaStatement,
  buatBerhentiStatement: buatBerhentiStatement,
  buatLewatiStatement: buatLewatiStatement,
  buatKembalikanStatement: buatKembalikanStatement,
  buatSimpanStatement: buatSimpanStatement,
  buatTambahkanStatement: buatTambahkanStatement,
  buatKurangiStatement: buatKurangiStatement,
  buatSisipkanStatement: buatSisipkanStatement,
  buatAmbilDomStatement: buatAmbilDomStatement,
  buatAmbilLuarStatement: buatAmbilLuarStatement,
  buatGunakanStatement: buatGunakanStatement,
  buatArahkanStatement: buatArahkanStatement,
  buatMuatUlangStatement: buatMuatUlangStatement,
  buatKembaliStatement: buatKembaliStatement,
  buatLangsungBlock: buatLangsungBlock,
  buatJalankanExpression: buatJalankanExpression,
  buatPanggilNativeExpression: buatPanggilNativeExpression,
  buatRantaiAksi: buatRantaiAksi,
  buatLiteral: buatLiteral,
  buatIdentifier: buatIdentifier,
  buatBinaryExpression: buatBinaryExpression,
  buatUnaryExpression: buatUnaryExpression,
  buatMemberExpression: buatMemberExpression,
  buatCallExpression: buatCallExpression,
  buatObjectLiteral: buatObjectLiteral,
  buatArrayLiteral: buatArrayLiteral,
  buatSelector: buatSelector,
  buatPropertyNode: buatPropertyNode,
  buatAttributeNode: buatAttributeNode,
  buatErrorNode: buatErrorNode,
  buatParameter: buatParameter,
  buatFetchBranch: buatFetchBranch,
  buatFetchOption: buatFetchOption
};
