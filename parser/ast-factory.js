/**
 * KARSA v0.3.1 — AST Node Factory
 *
 * Fungsi pembuatan node AST yang menjamin:
 * - Setiap node memiliki `type` dan `loc`
 * - `loc` mengikuti format SourceLocation { start: Position, end: Position }
 * - Properti anak berupa array, bukan null
 * - ErrorNode digunakan sebagai pengganti null pada posisi anak
 *
 * Berdasarkan: AST Specification v1.0.0
 */

/**
 * Membuat SourceLocation dari token atau dua posisi.
 * @param {object} start - { line, column } atau Token
 * @param {object} end - { line, column } atau Token
 * @returns {object} SourceLocation
 */
function buatLoc(start, end) {
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
    loc: loc || buatLoc({ line: 1, column: 1 }, { line: 1, column: 1 }),
    body: body || [],
    source: source || undefined
  };
}

// ─── Declaration Nodes ─────────────────────────────────────

function buatDataDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'DataDeclaration',
    loc: loc,
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatTetapDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'TetapDeclaration',
    loc: loc,
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatUbahDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'UbahDeclaration',
    loc: loc,
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatTurunanDeclaration(name, typeHint, init, loc, docstring) {
  return {
    type: 'TurunanDeclaration',
    loc: loc,
    docstring: docstring || undefined,
    name: name,
    typeHint: typeHint || undefined,
    init: init
  };
}

function buatKomponenDeclaration(name, params, body, loc, docstring, returnType) {
  return {
    type: 'KomponenDeclaration',
    loc: loc,
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
    loc: loc,
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
    loc: loc,
    body: body || []
  };
}

function buatBuatStatement(selector, loc, docstring, properties, body, action) {
  var node = {
    type: 'BuatStatement',
    loc: loc,
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
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    target: target
  };
}

function buatHapusStatement(target, loc, docstring) {
  return {
    type: 'HapusStatement',
    loc: loc,
    docstring: docstring || undefined,
    target: target
  };
}

function buatKosongkanStatement(target, loc, docstring) {
  return {
    type: 'KosongkanStatement',
    loc: loc,
    docstring: docstring || undefined,
    target: target
  };
}

function buatPerbaruiStatement(property, target, value, loc, docstring) {
  return {
    type: 'PerbaruiStatement',
    loc: loc,
    docstring: docstring || undefined,
    property: property,
    target: target,
    value: value
  };
}

function buatKetikaStatement(event, loc, docstring, target, body, action) {
  var node = {
    type: 'KetikaStatement',
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    target: target,
    body: body
  };
}

function buatLifecycleStatement(kind, body, loc, docstring) {
  return {
    type: 'LifecycleStatement',
    loc: loc,
    docstring: docstring || undefined,
    kind: kind,
    body: body
  };
}

function buatSetelahStatement(target, loc, docstring, body, action) {
  var node = {
    type: 'SetelahStatement',
    loc: loc,
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
    loc: loc,
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
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    condition: condition,
    body: body
  };
}

function buatBerhentiStatement(loc) {
  return { type: 'BerhentiStatement', loc: loc };
}

function buatLewatiStatement(loc) {
  return { type: 'LewatiStatement', loc: loc };
}

function buatKembalikanStatement(loc, value) {
  var node = { type: 'KembalikanStatement', loc: loc };
  if (value) node.value = value;
  return node;
}

function buatSimpanStatement(value, target, kind, loc, docstring) {
  return {
    type: 'SimpanStatement',
    loc: loc,
    docstring: docstring || undefined,
    value: value,
    target: target,
    kind: kind
  };
}

function buatTambahkanStatement(value, target, loc, docstring) {
  return {
    type: 'TambahkanStatement',
    loc: loc,
    docstring: docstring || undefined,
    value: value,
    target: target
  };
}

function buatKurangiStatement(target, loc, docstring, value) {
  var node = {
    type: 'KurangiStatement',
    loc: loc,
    docstring: docstring || undefined,
    target: target
  };
  if (value) node.value = value;
  return node;
}

function buatSisipkanStatement(value, target, loc, docstring) {
  return {
    type: 'SisipkanStatement',
    loc: loc,
    docstring: docstring || undefined,
    value: value,
    target: target
  };
}

function buatAmbilDomStatement(kind, source, target, loc, docstring, attributeName) {
  var node = {
    type: 'AmbilDomStatement',
    loc: loc,
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
    loc: loc,
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
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    url: url
  };
}

function buatMuatUlangStatement(loc) {
  return { type: 'MuatUlangStatement', loc: loc };
}

function buatKembaliStatement(loc) {
  return { type: 'KembaliStatement', loc: loc };
}

function buatLangsungBlock(content, loc) {
  return {
    type: 'LangsungBlock',
    loc: loc,
    content: content
  };
}

function buatJalankanExpression(callee, kind, loc, docstring, arguments_, withArgs) {
  var node = {
    type: 'JalankanExpression',
    loc: loc,
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
    loc: loc,
    docstring: docstring || undefined,
    callee: callee,
    arguments: arguments_ || []
  };
}

function buatRantaiAksi(first, chain, loc) {
  return {
    type: 'RantaiAksi',
    loc: loc,
    first: first,
    chain: chain
  };
}

// ─── Expression Nodes ──────────────────────────────────────

function buatLiteral(value, kind, loc) {
  return {
    type: 'Literal',
    loc: loc,
    value: value,
    kind: kind
  };
}

function buatIdentifier(name, loc) {
  return {
    type: 'Identifier',
    loc: loc,
    name: name
  };
}

function buatBinaryExpression(operator, left, right, loc) {
  return {
    type: 'BinaryExpression',
    loc: loc,
    operator: operator,
    left: left,
    right: right
  };
}

function buatUnaryExpression(operator, operand, loc, prefix) {
  return {
    type: 'UnaryExpression',
    loc: loc,
    operator: operator,
    operand: operand,
    prefix: prefix !== false
  };
}

function buatMemberExpression(object, property, loc) {
  return {
    type: 'MemberExpression',
    loc: loc,
    object: object,
    property: property
  };
}

function buatCallExpression(callee, arguments_, loc) {
  return {
    type: 'CallExpression',
    loc: loc,
    callee: callee,
    arguments: arguments_ || []
  };
}

function buatObjectLiteral(properties, loc) {
  return {
    type: 'ObjectLiteral',
    loc: loc,
    properties: properties || []
  };
}

function buatArrayLiteral(elements, loc) {
  return {
    type: 'ArrayLiteral',
    loc: loc,
    elements: elements || []
  };
}

// ─── UI & Selector Nodes ───────────────────────────────────

function buatSelector(tag, loc, id, classes, attributes) {
  return {
    type: 'Selector',
    loc: loc,
    tag: tag,
    id: id || undefined,
    classes: classes || [],
    attributes: attributes || []
  };
}

function buatPropertyNode(key, value, loc, shorthand) {
  return {
    type: 'PropertyNode',
    loc: loc,
    key: key,
    value: value,
    shorthand: !!shorthand
  };
}

function buatAttributeNode(key, value, loc) {
  return {
    type: 'AttributeNode',
    loc: loc,
    key: key,
    value: value
  };
}

// ─── Special Nodes ─────────────────────────────────────────

function buatErrorNode(code, message, loc, originalToken) {
  var node = {
    type: 'ErrorNode',
    loc: loc,
    code: code,
    message: message
  };
  if (originalToken) node.originalToken = originalToken;
  return node;
}

// ─── Shared Types ──────────────────────────────────────────

function buatParameter(name, loc, typeHint, defaultValue) {
  var param = {
    type: 'Parameter',
    loc: loc,
    name: name
  };
  if (typeHint) param.typeHint = typeHint;
  if (defaultValue) param.defaultValue = defaultValue;
  return param;
}

function buatFetchBranch(kind, action, loc) {
  return {
    type: 'FetchBranch',
    loc: loc,
    kind: kind,
    action: action
  };
}

function buatFetchOption(key, value, loc) {
  return {
    type: 'FetchOption',
    key: key,
    value: value,
    loc: loc
  };
}

module.exports = {
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
