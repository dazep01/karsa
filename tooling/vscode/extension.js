/**
 * KARSA VS Code Extension MVP
 * ----------------------------------------------------------------------------
 * Refinement lvl.3C: extension shell dependency-free yang menghubungkan VS Code
 * ke KARSA language server melalui child_process stdio.
 */

'use strict';

const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let client = null;
let output = null;

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
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      const length = parseInt(match[1], 10);
      const start = headerEnd + 4;
      const end = start + length;
      if (buffer.length < end) return;
      const body = buffer.slice(start, end).toString('utf8');
      buffer = buffer.slice(end);
      try { onMessage(JSON.parse(body)); }
      catch (err) { output && output.appendLine('[parser] ' + err.message); }
    }
  };
}

function positionToLsp(position) {
  return { line: position.line, character: position.character };
}

function rangeFromLsp(range) {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character)
  );
}

function locationFromLsp(location) {
  return new vscode.Location(vscode.Uri.parse(location.uri), rangeFromLsp(location.range));
}

function severityFromLsp(severity) {
  if (severity === 1) return vscode.DiagnosticSeverity.Error;
  if (severity === 2) return vscode.DiagnosticSeverity.Warning;
  if (severity === 3) return vscode.DiagnosticSeverity.Information;
  return vscode.DiagnosticSeverity.Hint;
}

class KarsaLanguageClient {
  constructor(context) {
    this.context = context;
    this.nextId = 1;
    this.pending = new Map();
    this.diagnostics = vscode.languages.createDiagnosticCollection('karsa');
    this.ready = false;
    this.openDocs = new Set();

    const config = vscode.workspace.getConfiguration('karsa');
    const configuredPath = config.get('languageServer.path');
    const candidates = [
      configuredPath,
      path.resolve(context.extensionPath, '..', 'language-server', 'server.js'),
      path.resolve(context.extensionPath, '..', '..', 'tooling', 'language-server', 'server.js')
    ].filter(Boolean);

    this.serverPath = candidates.find(p => fs.existsSync(p));
    if (!this.serverPath) {
      throw new Error('KARSA language server tidak ditemukan. Set karsa.languageServer.path.');
    }

    this.proc = spawn(process.execPath, [this.serverPath], {
      cwd: path.dirname(this.serverPath),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.proc.stdout.on('data', createParser(msg => this.handleMessage(msg)));
    this.proc.stderr.on('data', chunk => output.appendLine('[server] ' + chunk.toString().trim()));
    this.proc.on('exit', code => output.appendLine('[server] exit ' + code));
  }

  start() {
    return this.request('initialize', {
      processId: process.pid,
      rootUri: vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
        ? vscode.workspace.workspaceFolders[0].uri.toString()
        : null,
      capabilities: {}
    }).then(() => {
      this.ready = true;
      this.notify('initialized', {});
      vscode.workspace.textDocuments
        .filter(doc => doc.languageId === 'karsa')
        .forEach(doc => this.didOpen(doc));
    });
  }

  stop() {
    if (!this.proc || this.proc.killed) return Promise.resolve();
    return this.request('shutdown', null)
      .catch(() => null)
      .then(() => {
        this.notify('exit', null);
        this.diagnostics.dispose();
      });
  }

  send(message) {
    if (this.proc && !this.proc.killed) {
      this.proc.stdin.write(encode(message));
    }
  }

  request(method, params) {
    const id = this.nextId++;
    this.send({ jsonrpc: '2.0', id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('LSP request timeout: ' + method));
        }
      }, 5000);
    });
  }

  notify(method, params) {
    this.send({ jsonrpc: '2.0', method, params });
  }

  handleMessage(message) {
    if (message.id !== undefined && this.pending.has(message.id)) {
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
      return;
    }

    if (message.method === 'textDocument/publishDiagnostics') {
      const uri = vscode.Uri.parse(message.params.uri);
      const diagnostics = (message.params.diagnostics || []).map(d => {
        const diag = new vscode.Diagnostic(rangeFromLsp(d.range), d.message, severityFromLsp(d.severity));
        diag.code = d.code;
        diag.source = d.source || 'karsa';
        return diag;
      });
      this.diagnostics.set(uri, diagnostics);
    }
  }

  didOpen(document) {
    if (!this.ready || document.languageId !== 'karsa') return;
    this.openDocs.add(document.uri.toString());
    this.notify('textDocument/didOpen', {
      textDocument: {
        uri: document.uri.toString(),
        languageId: 'karsa',
        version: document.version,
        text: document.getText()
      }
    });
  }

  didChange(document) {
    if (!this.ready || document.languageId !== 'karsa') return;
    this.notify('textDocument/didChange', {
      textDocument: { uri: document.uri.toString(), version: document.version },
      contentChanges: [{ text: document.getText() }]
    });
  }

  didClose(document) {
    if (!this.ready || document.languageId !== 'karsa') return;
    this.openDocs.delete(document.uri.toString());
    this.notify('textDocument/didClose', {
      textDocument: { uri: document.uri.toString() }
    });
  }

  hover(document, position) {
    return this.request('textDocument/hover', {
      textDocument: { uri: document.uri.toString() },
      position: positionToLsp(position)
    }).then(result => {
      if (!result) return null;
      return new vscode.Hover(new vscode.MarkdownString(result.contents.value), rangeFromLsp(result.range));
    });
  }

  definition(document, position) {
    return this.request('textDocument/definition', {
      textDocument: { uri: document.uri.toString() },
      position: positionToLsp(position)
    }).then(result => result ? locationFromLsp(result) : null);
  }

  references(document, position, context) {
    return this.request('textDocument/references', {
      textDocument: { uri: document.uri.toString() },
      position: positionToLsp(position),
      context: { includeDeclaration: context.includeDeclaration }
    }).then(result => (result || []).map(locationFromLsp));
  }
}

function activate(context) {
  output = vscode.window.createOutputChannel('KARSA');
  output.appendLine('Activating KARSA extension...');

  client = new KarsaLanguageClient(context);
  context.subscriptions.push(output);
  context.subscriptions.push(client.diagnostics);

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => client.didOpen(doc)));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => client.didChange(e.document)));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc => client.didClose(doc)));

  context.subscriptions.push(vscode.languages.registerHoverProvider('karsa', {
    provideHover(document, position) { return client.hover(document, position); }
  }));

  context.subscriptions.push(vscode.languages.registerDefinitionProvider('karsa', {
    provideDefinition(document, position) { return client.definition(document, position); }
  }));

  context.subscriptions.push(vscode.languages.registerReferenceProvider('karsa', {
    provideReferences(document, position, context) { return client.references(document, position, context); }
  }));

  return client.start().then(() => {
    output.appendLine('KARSA language server started: ' + client.serverPath);
  }).catch(err => {
    output.appendLine('Failed to start KARSA language server: ' + err.message);
    vscode.window.showErrorMessage('KARSA language server gagal dimulai: ' + err.message);
  });
}

function deactivate() {
  return client ? client.stop() : undefined;
}

module.exports = { activate, deactivate };
