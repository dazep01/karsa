/**
 * KARSA v0.3.1 — VS Code Extension Shell Test
 * ----------------------------------------------------------------------------
 * Refinement lvl.3C: validasi struktur extension MVP tanpa menjalankan VS Code.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'tooling', 'vscode');

console.log('=== RUNNING VS CODE EXTENSION SHELL TEST ===\n');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(EXT, rel), 'utf-8'));
}

const pkg = readJson('package.json');
assert.strictEqual(pkg.name, 'karsa-vscode');
assert.strictEqual(pkg.version, '0.3.1');
assert.strictEqual(pkg.main, './extension.js');
assert.ok(pkg.activationEvents.includes('onLanguage:karsa'));
assert.ok(pkg.contributes.languages.some(lang => lang.id === 'karsa' && lang.extensions.includes('.ks')));
assert.ok(pkg.contributes.grammars.some(grammar => grammar.language === 'karsa'));
console.log('✓ package.json extension contribution valid');

const grammar = readJson('syntaxes/karsa.tmLanguage.json');
assert.strictEqual(grammar.scopeName, 'source.karsa');
assert.ok(grammar.repository.keywords, 'grammar harus punya keywords');
assert.ok(grammar.repository.comments, 'grammar harus punya comments');
assert.ok(grammar.repository.strings, 'grammar harus punya strings');
console.log('✓ TextMate grammar valid');

const langConfig = readJson('language-configuration/karsa-language-configuration.json');
assert.strictEqual(langConfig.comments.lineComment, '--');
assert.deepStrictEqual(langConfig.comments.blockComment, ['[[', ']]']);
console.log('✓ language configuration valid');

const extensionPath = path.join(EXT, 'extension.js');
assert.ok(fs.existsSync(extensionPath), 'extension.js harus ada');
require('child_process').execFileSync(process.execPath, ['-c', extensionPath]);
console.log('✓ extension.js syntax valid');

console.log('\n✓ VS Code extension shell test lulus.');
