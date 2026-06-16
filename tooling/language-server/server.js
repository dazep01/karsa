#!/usr/bin/env node
/**
 * KARSA v0.3.1 — Language Server MVP
 * ----------------------------------------------------------------------------
 * Refinement lvl.3A: LSP-compatible JSON-RPC server minimal tanpa dependency.
 * Fitur MVP:
 *   - initialize/shutdown/exit
 *   - textDocument/didOpen
 *   - textDocument/didChange
 *   - textDocument/didClose
 *   - publishDiagnostics berbasis Karsa.inspect()
 *
 * Catatan: server ini sengaja dependency-free agar mudah dipakai di repo utama.
 */

'use strict';

const Karsa = require('../../engine/karsa');

const documents = new Map(); // uri -> text
const semanticCache = new Map(); // uri -> normalized semantic
let buffer = Buffer.alloc(0);
let shutdownRequested = false;

function send(message) {
  const json = JSON.stringify(message);
  const payload = Buffer.from(json, 'utf8');
  const header = Buffer.from('Content-Length: ' + payload.length + '\r\n\r\n', 'ascii');
  process.stdout.write(Buffer.concat([header, payload]));
}

function respond(id, result) {
  send({ jsonrpc: '2.0', id: id, result: result });
}

function respondError(id, code, message) {
  send({ jsonrpc: '2.0', id: id, error: { code: code, message: message } });
}

function notify(method, params) {
  send({ jsonrpc: '2.0', method: method, params: params });
}

function toLspSeverity(severity) {
  // LSP: Error=1, Warning=2, Information=3, Hint=4
  if (severity === 'warning') return 2;
  if (severity === 'info') return 3;
  return 1;
}

function toRange(loc) {
  if (!loc || !loc.start) {
    return {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 1 }
    };
  }

  const startLine = Math.max(0, (loc.start.line || 1) - 1);
  const startChar = Math.max(0, (loc.start.column || 1) - 1);
  const endLine = loc.end && loc.end.line ? Math.max(0, loc.end.line - 1) : startLine;
  const endChar = loc.end && loc.end.column ? Math.max(startChar + 1, loc.end.column - 1) : startChar + 1;

  return {
    start: { line: startLine, character: startChar },
    end: { line: endLine, character: endChar }
  };
}

function toLspDiagnostic(diag) {
  const code = diag.code || diag.kode || 'E0000';
  const severity = diag.severity || (code.charAt(0) === 'W' ? 'warning' : 'error');
  return {
    range: toRange(diag.loc),
    severity: toLspSeverity(severity),
    code: code,
    source: 'karsa',
    message: diag.message || diag.pesan || 'Diagnostic KARSA',
    data: {
      stage: diag.stage || null,
      suggestion: diag.suggestion || diag.saran || ''
    },
    relatedInformation: Array.isArray(diag.relatedInformation)
      ? diag.relatedInformation.map(function(info) {
          return {
            location: {
              uri: '',
              range: toRange(info.loc)
            },
            message: info.message || ''
          };
        })
      : undefined
  };
}

function validate(uri, text) {
  let result;
  try {
    result = Karsa.inspect(text || '', { recover: true });
  } catch (err) {
    result = {
      diagnostics: [{
        code: 'E0000',
        severity: 'error',
        stage: 'system',
        message: 'Language server internal error: ' + err.message,
        suggestion: '',
        loc: null
      }]
    };
  }

  semanticCache.set(uri, result.semantic || { symbols: [], references: [], dependencies: [], cycles: [] });

  const diagnostics = (result.diagnostics || []).map(toLspDiagnostic);
  notify('textDocument/publishDiagnostics', {
    uri: uri,
    diagnostics: diagnostics
  });
}

function clearDiagnostics(uri) {
  semanticCache.delete(uri);
  notify('textDocument/publishDiagnostics', {
    uri: uri,
    diagnostics: []
  });
}

function positionInLoc(position, loc) {
  if (!position || !loc || !loc.start) return false;
  const startLine = Math.max(0, (loc.start.line || 1) - 1);
  const startChar = Math.max(0, (loc.start.column || 1) - 1);
  const endLine = loc.end && loc.end.line ? Math.max(0, loc.end.line - 1) : startLine;
  const endChar = loc.end && loc.end.column ? Math.max(startChar + 1, loc.end.column - 1) : startChar + 1;

  if (position.line < startLine || position.line > endLine) return false;
  if (position.line === startLine && position.character < startChar) return false;
  if (position.line === endLine && position.character > endChar) return false;
  return true;
}

function locationFromLoc(uri, loc) {
  return {
    uri: uri,
    range: toRange(loc)
  };
}

function symbolAtPosition(uri, position) {
  const semantic = semanticCache.get(uri);
  if (!semantic) return null;

  // Prefer references karena lokasinya biasanya lebih presisi dari declaration loc.
  for (let i = 0; i < (semantic.references || []).length; i++) {
    const ref = semantic.references[i];
    if (positionInLoc(position, ref.loc)) {
      const sym = (semantic.symbols || []).find(s => s.id === ref.symbolId);
      if (sym) return sym;
    }
  }

  for (let i = 0; i < (semantic.symbols || []).length; i++) {
    const sym = semantic.symbols[i];
    if (positionInLoc(position, sym.loc)) return sym;
  }

  return null;
}

function handleHover(id, params) {
  const uri = params.textDocument && params.textDocument.uri;
  const position = params.position;
  const sym = symbolAtPosition(uri, position);
  if (!sym) return respond(id, null);

  const flags = [];
  if (sym.isReactive) flags.push('reactive');
  if (sym.isWritable) flags.push('writable');
  if (sym.isComputed) flags.push('computed');
  if (sym.isFunction) flags.push('function');
  if (sym.isComponent) flags.push('component');

  const lines = [
    '**' + sym.name + '**',
    '',
    '`' + sym.kind + '`' + (flags.length ? ' — ' + flags.join(', ') : ''),
    '',
    '- scope: `' + (sym.scope || 'unknown') + '`',
    '- reads: `' + sym.readCount + '`',
    '- writes: `' + sym.writeCount + '`'
  ];

  respond(id, {
    contents: {
      kind: 'markdown',
      value: lines.join('\n')
    },
    range: toRange(sym.loc)
  });
}

function handleDefinition(id, params) {
  const uri = params.textDocument && params.textDocument.uri;
  const position = params.position;
  const sym = symbolAtPosition(uri, position);
  if (!sym || !sym.loc) return respond(id, null);
  respond(id, locationFromLoc(uri, sym.loc));
}

function handleReferences(id, params) {
  const uri = params.textDocument && params.textDocument.uri;
  const position = params.position;
  const includeDeclaration = !params.context || params.context.includeDeclaration !== false;
  const semantic = semanticCache.get(uri);
  const sym = symbolAtPosition(uri, position);
  if (!semantic || !sym) return respond(id, []);

  const locations = [];
  if (includeDeclaration && sym.loc) locations.push(locationFromLoc(uri, sym.loc));
  (semantic.references || []).forEach(function(ref) {
    if (ref.symbolId === sym.id && ref.loc) locations.push(locationFromLoc(uri, ref.loc));
  });
  respond(id, locations);
}


function handleInitialize(id) {
  respond(id, {
    capabilities: {
      textDocumentSync: 1, // Full sync
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true
    },
    serverInfo: {
      name: 'karsa-language-server',
      version: Karsa.version || '0.3.1'
    }
  });
}

function handleMessage(message) {
  const method = message.method;
  const id = message.id;
  const params = message.params || {};

  try {
    switch (method) {
      case 'initialize':
        handleInitialize(id);
        break;

      case 'initialized':
        break;

      case 'shutdown':
        shutdownRequested = true;
        respond(id, null);
        break;

      case 'exit':
        process.exit(shutdownRequested ? 0 : 1);
        break;

      case 'textDocument/didOpen': {
        const doc = params.textDocument || {};
        documents.set(doc.uri, doc.text || '');
        validate(doc.uri, doc.text || '');
        break;
      }

      case 'textDocument/didChange': {
        const doc = params.textDocument || {};
        const changes = params.contentChanges || [];
        const latest = changes.length > 0 ? changes[changes.length - 1].text : '';
        documents.set(doc.uri, latest);
        validate(doc.uri, latest);
        break;
      }

      case 'textDocument/didClose': {
        const doc = params.textDocument || {};
        documents.delete(doc.uri);
        clearDiagnostics(doc.uri);
        break;
      }

      case 'textDocument/hover':
        handleHover(id, params);
        break;

      case 'textDocument/definition':
        handleDefinition(id, params);
        break;

      case 'textDocument/references':
        handleReferences(id, params);
        break;

      default:
        if (id !== undefined) respondError(id, -32601, 'Method not found: ' + method);
    }
  } catch (err) {
    if (id !== undefined) respondError(id, -32603, err.message);
  }
}

function parseBuffer() {
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;

    const header = buffer.slice(0, headerEnd).toString('ascii');
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const length = parseInt(match[1], 10);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + length;
    if (buffer.length < messageEnd) return;

    const body = buffer.slice(messageStart, messageEnd).toString('utf8');
    buffer = buffer.slice(messageEnd);

    try {
      handleMessage(JSON.parse(body));
    } catch (err) {
      // Tidak ada id yang aman untuk response; abaikan tapi laporkan ke stderr.
      console.error('[karsa-ls] Invalid message:', err.message);
    }
  }
}

process.stdin.on('data', function(chunk) {
  buffer = Buffer.concat([buffer, chunk]);
  parseBuffer();
});

process.stdin.on('end', function() {
  process.exit(0);
});
