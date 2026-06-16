/**
 * KARSA v0.3.1 — Language Server MVP Smoke Test
 * ----------------------------------------------------------------------------
 * Refinement lvl.3A: memastikan language server bisa initialize dan publish
 * diagnostics untuk dokumen KARSA.
 */

const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

const SERVER = path.resolve(__dirname, '..', 'tooling', 'language-server', 'server.js');

function encode(message) {
  const json = JSON.stringify(message);
  return 'Content-Length: ' + Buffer.byteLength(json, 'utf8') + '\r\n\r\n' + json;
}

function createParser(onMessage) {
  let buffer = Buffer.alloc(0);
  return function onData(chunk) {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = buffer.slice(0, headerEnd).toString('ascii');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      assert.ok(match, 'Response harus punya Content-Length');
      const length = parseInt(match[1], 10);
      const start = headerEnd + 4;
      const end = start + length;
      if (buffer.length < end) return;
      const body = buffer.slice(start, end).toString('utf8');
      buffer = buffer.slice(end);
      onMessage(JSON.parse(body));
    }
  };
}

function waitFor(predicate, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function tick() {
      try {
        const value = predicate();
        if (value) return resolve(value);
      } catch (err) {
        return reject(err);
      }
      if (Date.now() - start > timeoutMs) return reject(new Error('Timeout menunggu LSP message'));
      setTimeout(tick, 20);
    }
    tick();
  });
}

(async function main() {
  console.log('=== RUNNING LANGUAGE SERVER MVP TEST ===\n');

  const child = spawn(process.execPath, [SERVER], {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const messages = [];
  let stderr = '';
  child.stdout.on('data', createParser(msg => messages.push(msg)));
  child.stderr.on('data', chunk => { stderr += chunk.toString(); });

  child.stdin.write(encode({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      processId: process.pid,
      rootUri: null,
      capabilities: {}
    }
  }));

  const init = await waitFor(() => messages.find(m => m.id === 1), 2000);
  assert.ok(init.result, 'initialize harus punya result');
  assert.strictEqual(init.result.serverInfo.name, 'karsa-language-server');
  assert.strictEqual(init.result.capabilities.textDocumentSync, 1);
  console.log('✓ initialize response');

  child.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));

  const uri = 'file:///test.ks';
  child.stdin.write(encode({
    jsonrpc: '2.0',
    method: 'textDocument/didOpen',
    params: {
      textDocument: {
        uri,
        languageId: 'karsa',
        version: 1,
        text: 'berhenti\n'
      }
    }
  }));

  const diag1 = await waitFor(() => messages.find(m =>
    m.method === 'textDocument/publishDiagnostics' &&
    m.params && m.params.uri === uri &&
    m.params.diagnostics &&
    m.params.diagnostics.some(d => d.code === 'E4011')
  ), 3000);
  assert.ok(diag1.params.diagnostics.some(d => d.severity === 1), 'E4011 harus severity Error');
  console.log('✓ publishDiagnostics untuk analyzer error E4011');

  const validSource = 'data nama = "Karsa"\nbuat h1 -> teks: nama\n';
  child.stdin.write(encode({
    jsonrpc: '2.0',
    method: 'textDocument/didChange',
    params: {
      textDocument: { uri, version: 2 },
      contentChanges: [{ text: validSource }]
    }
  }));

  const diag2 = await waitFor(() => {
    const matches = messages.filter(m =>
      m.method === 'textDocument/publishDiagnostics' &&
      m.params && m.params.uri === uri
    );
    const last = matches[matches.length - 1];
    return last && last.params.diagnostics.length === 0 ? last : null;
  }, 3000);
  assert.deepStrictEqual(diag2.params.diagnostics, []);
  console.log('✓ publishDiagnostics kosong setelah dokumen valid');

  child.stdin.write(encode({
    jsonrpc: '2.0',
    id: 3,
    method: 'textDocument/hover',
    params: {
      textDocument: { uri },
      position: { line: 1, character: 19 }
    }
  }));

  const hover = await waitFor(() => messages.find(m => m.id === 3), 2000);
  assert.ok(hover.result, 'hover harus punya result');
  assert.ok(/nama/.test(hover.result.contents.value), 'hover harus memuat nama symbol');
  console.log('✓ hover basic');

  child.stdin.write(encode({
    jsonrpc: '2.0',
    id: 4,
    method: 'textDocument/definition',
    params: {
      textDocument: { uri },
      position: { line: 1, character: 19 }
    }
  }));

  const definition = await waitFor(() => messages.find(m => m.id === 4), 2000);
  assert.ok(definition.result, 'definition harus punya result');
  assert.strictEqual(definition.result.uri, uri);
  assert.strictEqual(definition.result.range.start.line, 0, 'definition harus menunjuk deklarasi line 0');
  console.log('✓ go to definition basic');

  child.stdin.write(encode({
    jsonrpc: '2.0',
    id: 5,
    method: 'textDocument/references',
    params: {
      textDocument: { uri },
      position: { line: 1, character: 19 },
      context: { includeDeclaration: true }
    }
  }));

  const references = await waitFor(() => messages.find(m => m.id === 5), 2000);
  assert.ok(Array.isArray(references.result), 'references result harus array');
  assert.ok(references.result.length >= 2, 'references harus memuat declaration dan reference');
  console.log('✓ find references basic');

  child.stdin.write(encode({ jsonrpc: '2.0', id: 6, method: 'shutdown', params: null }));
  await waitFor(() => messages.find(m => m.id === 6), 2000);
  child.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));

  const exitCode = await new Promise(resolve => child.on('exit', resolve));
  assert.strictEqual(exitCode, 0, 'server harus exit 0 setelah shutdown');
  assert.strictEqual(stderr.trim(), '', 'stderr harus kosong');

  console.log('\n✓ Language server MVP test lulus.');
})().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});
