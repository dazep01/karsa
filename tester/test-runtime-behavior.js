/**
 * KARSA v0.3.1 — Runtime Behavior Test Suite
 * ----------------------------------------------------------------------------
 * Refinement lvl.4B: behavior tests sebelum modularisasi compiler/runtime.
 * Menggunakan fake DOM minimal dependency-free di Node.js.
 */

const assert = require('assert');
const vm = require('vm');
const Karsa = require('../engine/karsa');

class FakeElement {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase();
    this.nodeName = this.tagName;
    this.ownerDocument = document;
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.style = { display: '', cssText: '' };
    this.attributes = {};
    this._id = '';
    this.className = '';
    this.innerText = '';
    this.innerHTML = '';
    this.value = '';
  }

  set id(value) {
    this._id = String(value || '');
    if (this._id) this.ownerDocument._byId.set(this._id, this);
  }

  get id() { return this._id; }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    child.parentElement = null;
    return child;
  }

  setAttribute(key, value) {
    this.attributes[key] = String(value);
    if (key === 'id') this.id = value;
    if (key === 'class') this.className = String(value);
  }

  getAttribute(key) {
    return this.attributes[key] || null;
  }

  addEventListener(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(cb);
  }

  dispatchEvent(event) {
    const evt = typeof event === 'string' ? { type: event } : event;
    if (!evt.preventDefault) evt.preventDefault = function() {};
    (this.listeners.get(evt.type) || []).forEach(cb => cb(evt));
  }
}

class FakeDocument {
  constructor() {
    this._byId = new Map();
    this.listeners = new Map();
    this.body = new FakeElement('body', this);
    this.readyState = 'complete';
  }

  createElement(tag) {
    return new FakeElement(tag, this);
  }

  querySelector(selector) {
    if (!selector) return null;
    if (selector === 'body') return this.body;
    if (selector[0] === '#') return this._byId.get(selector.slice(1)) || null;

    const idMatch = /#([A-Za-z_][A-Za-z0-9_-]*)/.exec(selector);
    if (idMatch) return this._byId.get(idMatch[1]) || null;

    const classMatch = /\.([A-Za-z_][A-Za-z0-9_-]*)/.exec(selector);
    if (classMatch) {
      return this._walk(this.body).find(el => (el.className || '').split(/\s+/).includes(classMatch[1])) || null;
    }

    const tag = selector.toUpperCase();
    return this._walk(this.body).find(el => el.tagName === tag) || null;
  }

  _walk(root) {
    const out = [];
    function visit(node) {
      out.push(node);
      node.children.forEach(visit);
    }
    visit(root);
    return out;
  }

  addEventListener(type, cb) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(cb);
  }

  dispatchEvent(event) {
    const evt = typeof event === 'string' ? { type: event } : event;
    (this.listeners.get(evt.type) || []).forEach(cb => cb(evt));
  }
}

function runKarsa(source) {
  const result = Karsa.compile(source);
  assert.strictEqual(result.success, true, 'compile harus sukses: ' + JSON.stringify(result.errors || result.diagnostics || []));
  const document = new FakeDocument();
  const sandbox = {
    document,
    window: { addEventListener() {} },
    console,
    alert() {},
    Notification: undefined,
    fetch: undefined,
    location: { href: '' }
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(result.js, sandbox, { filename: 'karsa-runtime-test.js' });
  return { result, sandbox, document };
}

console.log('=== RUNNING RUNTIME BEHAVIOR TESTS ===\n');

// ---------------------------------------------------------------------------
// Test 1: DOM creation and initial reactive text lowering
// ---------------------------------------------------------------------------
{
  const { document } = runKarsa(`
data hitungan = 0
buat p#angka -> teks: hitungan
`);
  const angka = document.querySelector('#angka');
  assert.ok(angka, 'p#angka harus dibuat');
  assert.strictEqual(angka.innerText, 0, 'innerText awal harus membaca hitungan.value');
  console.log('✓ DOM creation dan initial reactive text');
}

// ---------------------------------------------------------------------------
// Test 2: event click + watcher update DOM
// ---------------------------------------------------------------------------
{
  const { document } = runKarsa(`
data hitungan = 0

buat p#angka -> teks: hitungan
buat tombol#tambah -> teks: "+"

ketika tombol#tambah diklik:
  tambahkan 1 ke hitungan

saat hitungan berubah:
  perbarui teks "#angka" -> hitungan
`);
  const angka = document.querySelector('#angka');
  const tombol = document.querySelector('tombol#tambah') || document.querySelector('#tambah');
  assert.ok(tombol, 'tombol#tambah harus ada');
  assert.strictEqual(angka.innerText, 0);
  tombol.dispatchEvent({ type: 'click' });
  assert.strictEqual(angka.innerText, 1, 'watcher harus memperbarui DOM setelah click');
  console.log('✓ event click dan watcher update DOM');
}

// ---------------------------------------------------------------------------
// Test 3: show/hide/clear/remove behavior
// ---------------------------------------------------------------------------
{
  const { document } = runKarsa(`
buat div#box -> teks: "Isi"
sembunyikan "#box"
tampilkan "#box"
kosongkan "#box"
`);
  const box = document.querySelector('#box');
  assert.ok(box, 'box harus ada');
  assert.strictEqual(box.style.display, '', 'tampilkan harus reset display');
  assert.strictEqual(box.innerHTML, '', 'kosongkan harus clear innerHTML');
  console.log('✓ show/hide/clear behavior');
}

// ---------------------------------------------------------------------------
// Test 4: mini todo app behavior — add item count via event + watcher
// ---------------------------------------------------------------------------
{
  const { document } = runKarsa(`
data jumlahTodo = 0

buat div#todoApp
  buat p#jumlah -> teks: jumlahTodo
  buat tombol#addTodo -> teks: "Tambah Todo"

ketika tombol#addTodo diklik:
  tambahkan 1 ke jumlahTodo

saat jumlahTodo berubah:
  perbarui teks "#jumlah" -> jumlahTodo
`);
  const jumlah = document.querySelector('#jumlah');
  const addTodo = document.querySelector('#addTodo');
  assert.ok(jumlah, 'p#jumlah harus ada');
  assert.ok(addTodo, 'tombol#addTodo harus ada');
  assert.strictEqual(jumlah.innerText, 0);
  addTodo.dispatchEvent({ type: 'click' });
  addTodo.dispatchEvent({ type: 'click' });
  assert.strictEqual(jumlah.innerText, 2, 'jumlah todo harus bertambah setelah dua click');
  console.log('✓ mini todo app add count behavior');
}

// ---------------------------------------------------------------------------
// Test 5: runtime helper cleanup tersedia dan callable
// ---------------------------------------------------------------------------
{
  const { sandbox } = runKarsa(`
data x = 1
`);
  assert.strictEqual(typeof sandbox.__createReactive, 'function', '__createReactive harus tersedia');
  assert.strictEqual(typeof sandbox.__cleanup, 'function', '__cleanup harus tersedia');
  const reactive = sandbox.__createReactive(1);
  assert.doesNotThrow(() => sandbox.__cleanup(reactive), '__cleanup harus callable tanpa throw');
  console.log('✓ runtime helper cleanup tersedia dan callable');
}

console.log('\n✓ Semua runtime behavior tests lulus.');
