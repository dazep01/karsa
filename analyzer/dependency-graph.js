/**
 * KARSA v0.3.1 — Dependency Graph Utilities
 * ----------------------------------------------------------------------------
 * Refinement lvl.2: membangun dependency graph static sederhana dari metadata
 * resolver, terutama untuk `turunan` dan watcher `saat`.
 */

'use strict';

function locKey(loc) {
  if (!loc || !loc.start) return 'unknown';
  return String(loc.start.line) + ':' + String(loc.start.column);
}

function isAstNode(value) {
  return value && typeof value === 'object' && typeof value.type === 'string';
}

function collectIdentifierReferences(node, out, seen) {
  if (!node || typeof node !== 'object') return out;
  if (!seen) seen = new Set();
  if (seen.has(node)) return out;
  seen.add(node);

  if (node.type === 'Identifier' && node.resolved) {
    out.push({
      name: node.name,
      symbol: node.resolved,
      loc: node.loc || null
    });
    return out;
  }

  Object.keys(node).forEach(function(key) {
    // Hindari circular/internal metadata.
    if (key === 'loc' || key === 'symbol' || key === 'resolved' || key === 'semantic' ||
        key === 'targetSymbol' || key === 'declarationNode' || key === 'shadowedSymbol' ||
        key === 'references' || key === 'scope' || key === 'parent') {
      return;
    }
    var value = node[key];
    if (Array.isArray(value)) {
      value.forEach(function(item) {
        if (isAstNode(item) || (item && typeof item === 'object')) collectIdentifierReferences(item, out, seen);
      });
    } else if (isAstNode(value) || (value && typeof value === 'object' && !value.start && !value.end)) {
      collectIdentifierReferences(value, out, seen);
    }
  });

  return out;
}

function traverseAst(node, visit, seen) {
  if (!node || typeof node !== 'object') return;
  if (!seen) seen = new Set();
  if (seen.has(node)) return;
  seen.add(node);

  if (node.type) visit(node);

  Object.keys(node).forEach(function(key) {
    if (key === 'loc' || key === 'symbol' || key === 'resolved' || key === 'semantic' ||
        key === 'targetSymbol' || key === 'declarationNode' || key === 'shadowedSymbol' ||
        key === 'references' || key === 'scope' || key === 'parent') {
      return;
    }
    var value = node[key];
    if (Array.isArray(value)) value.forEach(function(item) { traverseAst(item, visit, seen); });
    else if (value && typeof value === 'object') traverseAst(value, visit, seen);
  });
}

function buildDependencyGraph(ast) {
  var semantic = ast && ast.semantic ? ast.semantic : null;
  var symbols = semantic && semantic.symbols ? semantic.symbols : [];
  var dependencies = [];

  symbols.forEach(function(sym) {
    if (!sym || sym.kind !== 'turunan' || !sym.declarationNode) return;
    var init = sym.declarationNode.init;
    var refs = collectIdentifierReferences(init, []);
    refs.forEach(function(ref) {
      if (!ref.symbol || !ref.symbol.id || ref.symbol.id === sym.id) return;
      dependencies.push({
        from: sym.name,
        fromSymbolId: sym.id || null,
        to: ref.symbol.name,
        toSymbolId: ref.symbol.id || null,
        kind: 'computed',
        loc: ref.loc
      });
    });
  });

  traverseAst(ast, function(node) {
    if (node.type !== 'SaatStatement') return;
    var targetSymbol = null;
    if (node.target && typeof node.target === 'string') {
      for (var i = 0; i < symbols.length; i++) {
        if (symbols[i].name === node.target) {
          targetSymbol = symbols[i];
          break;
        }
      }
    }
    if (targetSymbol) {
      dependencies.push({
        from: 'watcher@' + locKey(node.loc),
        fromSymbolId: null,
        to: targetSymbol.name,
        toSymbolId: targetSymbol.id || null,
        kind: 'watcher-target',
        loc: node.loc || null
      });
    }

    var bodyRefs = collectIdentifierReferences(node.body, []);
    bodyRefs.forEach(function(ref) {
      if (!ref.symbol) return;
      dependencies.push({
        from: 'watcher@' + locKey(node.loc),
        fromSymbolId: null,
        to: ref.symbol.name,
        toSymbolId: ref.symbol.id || null,
        kind: 'watcher-body-read',
        loc: ref.loc
      });
    });
  });

  var cycles = detectCycles(dependencies);
  return {
    dependencies: dependencies,
    cycles: cycles
  };
}

function detectCycles(edges) {
  var graph = new Map();
  edges.forEach(function(edge) {
    // Cycle detection hanya untuk symbol-to-symbol computed dependencies.
    if (edge.kind !== 'computed' || !edge.fromSymbolId || !edge.toSymbolId) return;
    if (!graph.has(edge.fromSymbolId)) graph.set(edge.fromSymbolId, []);
    graph.get(edge.fromSymbolId).push(edge.toSymbolId);
  });

  var visited = new Set();
  var active = new Set();
  var stack = [];
  var cycles = [];
  var seenCycleKeys = new Set();

  function dfs(node) {
    visited.add(node);
    active.add(node);
    stack.push(node);

    var nexts = graph.get(node) || [];
    for (var i = 0; i < nexts.length; i++) {
      var next = nexts[i];
      if (!visited.has(next)) {
        dfs(next);
      } else if (active.has(next)) {
        var startIndex = stack.indexOf(next);
        var cycle = stack.slice(startIndex).concat([next]);
        var key = cycle.join('>');
        if (!seenCycleKeys.has(key)) {
          seenCycleKeys.add(key);
          cycles.push({ symbolIds: cycle });
        }
      }
    }

    stack.pop();
    active.delete(node);
  }

  Array.from(graph.keys()).forEach(function(node) {
    if (!visited.has(node)) dfs(node);
  });

  return cycles;
}

function normalizeSemantic(ast) {
  var semantic = ast && ast.semantic ? ast.semantic : null;
  var symbols = semantic && semantic.symbols ? semantic.symbols : [];
  var deps = semantic && semantic.dependencies ? semantic.dependencies : [];
  var cycles = semantic && semantic.dependencyCycles ? semantic.dependencyCycles : [];

  var publicSymbols = symbols.map(function(sym) {
    return {
      id: sym.id || null,
      name: sym.name,
      kind: sym.kind,
      loc: sym.declarationNode && sym.declarationNode.loc ? sym.declarationNode.loc : null,
      scope: sym.scope || null,
      scopeId: sym.scopeId || null,
      isReactive: !!sym.isReactive,
      isWritable: !!sym.isWritable,
      isComputed: !!sym.isComputed,
      isParameter: !!sym.isParameter,
      isComponent: !!sym.isComponent,
      isFunction: !!sym.isFunction,
      readCount: sym.readCount || 0,
      writeCount: sym.writeCount || 0,
      shadowedSymbolId: sym.shadowedSymbol ? (sym.shadowedSymbol.id || null) : null
    };
  });

  var references = [];
  symbols.forEach(function(sym) {
    (sym.references || []).forEach(function(ref) {
      references.push({
        symbolId: sym.id || null,
        name: sym.name,
        loc: ref.loc || null
      });
    });
  });

  return {
    symbols: publicSymbols,
    references: references,
    dependencies: deps.map(function(dep) {
      return {
        from: dep.from,
        fromSymbolId: dep.fromSymbolId || null,
        to: dep.to,
        toSymbolId: dep.toSymbolId || null,
        kind: dep.kind,
        loc: dep.loc || null
      };
    }),
    cycles: cycles.map(function(cycle) {
      return { symbolIds: cycle.symbolIds ? cycle.symbolIds.slice() : [] };
    })
  };
}

module.exports = {
  collectIdentifierReferences: collectIdentifierReferences,
  buildDependencyGraph: buildDependencyGraph,
  detectCycles: detectCycles,
  normalizeSemantic: normalizeSemantic
};
