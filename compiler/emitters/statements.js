/**
 * KARSA v0.3.1 — Statement Emitters
 * ----------------------------------------------------------------------------
 * Refinement lvl.4F: statement visitor emitters dipisah dari compiler utama.
 */

'use strict';

function install(KarsaCompiler, accept) {
  // ═══════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — DECLARATIONS
  // ═══════════════════════════════════════════════════════════

  KarsaCompiler.prototype.visitDataDeclaration = function(node) {
    const initVal = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = __createReactive(${initVal});`);
  };

  KarsaCompiler.prototype.visitTetapDeclaration = function(node) {
    const initVal = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = ${initVal};`);
  };

  KarsaCompiler.prototype.visitUbahDeclaration = function(node) {
    const initVal = this.lowerExpression(node.init);
    this.emit(`let ${node.name} = ${initVal};`);
  };

  KarsaCompiler.prototype.visitTurunanDeclaration = function(node) {
    const expr = this.lowerExpression(node.init);
    this.emit(`const ${node.name} = __createComputed(() => ${expr});`);
  };

  KarsaCompiler.prototype.visitKomponenDeclaration = function(node) {
    // Component = factory function yang mengembalikan DOM element
    const params = node.params.map(p => p.name).join(', ');
    const componentVar = `__komp_${node.name}`;

    this.emit(`function ${componentVar}(${params}) {`);
    this.indent++;
    this.emit(`// Component: ${node.name}`);
    this.emit(`const __root = document.createElement("div");`);

    // Set currentParent agar child elements di-append ke __root
    const prevParent = this.currentParent;
    this.currentParent = '__root';

    // Visit body (berisi buat, ketika, dll)
    if (node.body) accept(node.body, this);

    this.currentParent = prevParent;

    // Register lifecycle hooks jika ada
    this.emit(`return __root;`);
    this.indent--;
    this.emit(`}`);

    // Expose component factory globally
    this.emit(`window.${node.name} = ${componentVar};`);
  };

  KarsaCompiler.prototype.visitFungsiDeclaration = function(node) {
    const params = node.params.map(p => p.name).join(', ');
    this.emit(`function ${node.name}(${params}) {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit("}");
  };

  // ═══════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — DOM STRUCTURE
  // ═══════════════════════════════════════════════════════════

  KarsaCompiler.prototype.visitBuatStatement = function(node) {
    const varName = this.genVar('el');
    node.compiledVarName = varName; // Simpan untuk child reference

    // Tag alias mapping
    const tagAliases = {
      'tombol': 'button',
      'ruang': 'div',
      'judul': 'h1',
      'subjudul': 'h2',
      'paragraf': 'p',
      'gambar': 'img',
      'tautan': 'a',
      'masukan': 'input',
      'pilihan': 'select',
      'kolom': 'textarea',
      'tabel': 'table',
      'artikel': 'article',
      'kanvas': 'canvas',
      'opsi': 'option',
      'fragmen': 'fragment',
      'wadjud': 'h1',
      'wadah': 'div',
      'kotak': 'div',
      'frm': 'form',
      'frmMasuk': 'form'
    };

    const tag = tagAliases[node.selector.tag] || node.selector.tag;
    this.emit(`const ${varName} = document.createElement("${tag}");`);

    if (node.selector.id) {
      this.emit(`${varName}.id = "${node.selector.id}";`);
    }
    if (node.selector.classes && node.selector.classes.length > 0) {
      this.emit(`${varName}.className = "${node.selector.classes.join(' ')}";`);
    }

    // Attributes dari selector
    if (node.selector.attributes && node.selector.attributes.length > 0) {
      node.selector.attributes.forEach(attr => {
        const attrVal = attr.value ? this.lowerExpression(attr.value) : '""';
        this.emit(`${varName}.setAttribute("${attr.key}", ${attrVal});`);
      });
    }

    // Properti
    if (node.properties) {
      node.properties.forEach(p => {
        const val = this.lowerExpression(p.value);
        if (p.key === 'teks') this.emit(`${varName}.innerText = ${val};`);
        else if (p.key === 'html') this.emit(`${varName}.innerHTML = ${val};`);
        else if (p.key === 'nilai') this.emit(`${varName}.value = ${val};`);
        else this.emit(`${varName}.setAttribute("${p.key}", ${val});`);
      });
    }

    // Simpan parent current untuk append
    const prevParent = this.currentParent;
    this.currentParent = varName;

    if (node.body) accept(node.body, this);
    if (node.action) accept(node.action, this);

    this.currentParent = prevParent;

    if (!this.currentParent) {
      this.emit(`document.body.appendChild(${varName});`);
    } else {
      this.emit(`${this.currentParent}.appendChild(${varName});`);
    }
  };

  KarsaCompiler.prototype.visitTampilkanStatement = function(node) {
    // Handle message kinds: pesan, pesan-error, notifikasi
    if (node.messageKind) {
      const msgVal = this.lowerExpression(node.target);
      if (node.messageKind === 'pesan') {
        this.emit(`alert(${msgVal});`);
      } else if (node.messageKind === 'pesan-error') {
        this.emit(`console.error(${msgVal});`);
      } else if (node.messageKind === 'notifikasi') {
        this.emit(`if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { new Notification(${msgVal}); } else { alert(${msgVal}); };`);
      }
      return;
    }

    // Normal element show/mount
    const target = this.resolveTarget(node.target);
    const mountTarget = node.mountTarget ? this.resolveTarget(node.mountTarget) : null;

    if (mountTarget) {
      this.emit(`__mount(${target}, ${mountTarget});`);
    } else {
      // Show element (remove display:none if hidden)
      this.emit(`{ const __el = ${target}; if (__el) __el.style.display = ''; };`);
    }
  };

  KarsaCompiler.prototype.visitSembunyikanStatement = function(node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el) __el.style.display = 'none'; };`);
  };

  KarsaCompiler.prototype.visitHapusStatement = function(node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el && __el.parentElement) __el.parentElement.removeChild(__el); };`);
  };

  KarsaCompiler.prototype.visitKosongkanStatement = function(node) {
    const target = this.resolveTarget(node.target);
    this.emit(`{ const __el = ${target}; if (__el) __el.innerHTML = ''; };`);
  };

  KarsaCompiler.prototype.visitPerbaruiStatement = function(node) {
    const val = this.lowerExpression(node.value);
    const target = this.resolveTarget(node.target);

    const propertyMap = {
      'teks': 'innerText',
      'html': 'innerHTML',
      'nilai': 'value',
      'kelas': 'className',
      'gaya': 'style.cssText',
      'sumber': 'src',
      'src': 'src',
      'tautan': 'href',
      'href': 'href',
      'tipe': 'type',
      'nama': 'name',
      'ditandai': 'checked',
      'nonaktif': 'disabled',
      'placeholder': 'placeholder',
      'atribut': 'setAttribute'
    };

    const jsProp = propertyMap[node.property];
    if (jsProp) {
      this.emit(`${target}.${jsProp} = ${val};`);
    } else {
      this.emit(`${target}.setAttribute("${node.property}", ${val});`);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — BEHAVIOR & EVENTS
  // ═══════════════════════════════════════════════════════════

  KarsaCompiler.prototype.visitKetikaStatement = function(node) {
    const eventMap = {
      'diklik': 'click',
      'diketik': 'input',
      'disubmit': 'submit',
      'diubah': 'change',
      'ditekan': 'keydown',
      'dilepas': 'keyup',
      'dimuat': 'DOMContentLoaded',
      'difokus': 'focus',
      'diblur': 'blur',
      'ditinggal': 'blur',
      'diarahkan': 'mouseover',
      'ditinggal-kursor': 'mouseout',
      'digulir': 'scroll',
      'diseret': 'dragstart',
      'diubahukuran': 'resize',
      'dipindah': 'drag',
      'dikirim': 'submit',
      'direset': 'reset',
      'dikonteks': 'contextmenu',
      'dilewat': 'paste',
      'masuk': 'mouseenter',
      'keluar': 'mouseleave',
      'aktif': 'focus',
      'nonaktif': 'blur',
      'muat': 'load',
      'salah': 'error',
      'dipasang': '__karsa_mounted',
      'dilepas-dari-dom': '__karsa_unmounted'
    };

    const eventName = eventMap[node.event] || node.event;
    let target = 'document';

    if (node.target) {
      if (node.target.type === 'SelfReference') {
        target = node.target.referencedNode.compiledVarName || 'null';
      } else if (node.target.type === 'Identifier') {
        if (node.target.name === 'halaman') {
          target = 'document';
        } else {
          target = node.target.name;
        }
      } else if (node.target.type === 'Selector') {
        target = this.resolveTarget(node.target);
      } else if (node.target.type === 'Literal') {
        target = `document.querySelector("${node.target.value}")`;
      }
    }

    // Custom events (mounted/unmounted) need MutationObserver
    if (eventName === '__karsa_mounted' || eventName === '__karsa_unmounted') {
      const domEvent = eventName === '__karsa_mounted' ? 'DOMNodeInserted' : 'DOMNodeRemoved';
      this.emit(`${target}.addEventListener("${domEvent}", (event) => {`);
    } else if (eventName === 'DOMContentLoaded') {
      this.emit(`document.addEventListener("DOMContentLoaded", (event) => {`);
    } else {
      this.emit(`${target}.addEventListener("${eventName}", (event) => {`);
    }

    this.indent++;
    if (node.event === 'disubmit') this.emit("event.preventDefault();");

    if (node.body) accept(node.body, this);
    if (node.action) accept(node.action, this);

    this.indent--;
    this.emit("});");
  };

  KarsaCompiler.prototype.visitSaatStatement = function(node) {
    this.emit(`__watch(${node.target}, (nilaiBaru, nilaiLama) => {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit("});");
  };

  KarsaCompiler.prototype.visitLifecycleStatement = function(node) {
    // Lifecycle hooks: dipasang, dilepas, diperbarui
    const lifecycleMap = {
      'dipasang': '__karsa_mounted',
      'dilepas': '__karsa_unmounted',
      'diperbarui': '__karsa_updated'
    };
    const hookName = lifecycleMap[node.kind] || node.kind;

    // Emit as custom event dispatch or callback registration
    this.emit(`// Lifecycle: saat komponen ${node.kind}`);
    if (node.kind === 'dipasang') {
      // mounted — schedule to run after DOM is ready
      this.emit(`if (document.readyState === 'loading') {`);
      this.indent++;
      this.emit(`document.addEventListener('DOMContentLoaded', () => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
      this.indent--;
      this.emit(`} else {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else if (node.kind === 'dilepas') {
      // unmounted — use beforeunload as approximation
      this.emit(`window.addEventListener('beforeunload', () => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
    } else {
      // Generic lifecycle — just emit the body
      accept(node.body, this);
    }
  };

  KarsaCompiler.prototype.visitSetelahStatement = function(node) {
    // "setelah X selesai" — X adalah nama operasi/fungsi async
    // Lower to: X().then(() => { ... }) atau callback setelah pemanggilan
    const target = node.target;

    // [Bug 3 FIX] Cek apakah target adalah fungsi KARSA yang sudah di-resolve.
    // Jika ya, panggil langsung tanpa typeof check (fungsi KARSA selalu lokal).
    // Jika tidak, gunakan typeof check untuk keamanan (external/async).
    const isKarsaFunction = node.targetSymbol && node.targetSymbol.isFunction;
    const callExpr = isKarsaFunction ? `${target}()` : `(typeof ${target} === 'function' ? ${target}() : ${target})`;

    this.emit(`// setelah ${target} selesai`);
    if (node.body) {
      this.emit(`Promise.resolve(${callExpr}).then((__result) => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`});`);
    } else if (node.action) {
      this.emit(`Promise.resolve(${callExpr}).then((__result) => {`);
      this.indent++;
      accept(node.action, this);
      this.indent--;
      this.emit(`});`);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — LOGIC & CONTROL FLOW
  // ═══════════════════════════════════════════════════════════

  KarsaCompiler.prototype.visitJikaStatement = function(node) {
    const cond = this.lowerExpression(node.condition);
    this.emit(`if (${cond}) {`);
    this.indent++;
    accept(node.consequent, this);
    this.indent--;
    if (node.alternate) {
      this.emit("} else {");
      this.indent++;
      accept(node.alternate, this);
      this.indent--;
    }
    this.emit("}");
  };

  KarsaCompiler.prototype.visitUlangiStatement = function(node) {
    const source = this.lowerExpression(node.source);

    if (node.kind === 'kali') {
      // "ulangi N kali:" → for loop
      this.emit(`for (let __i = 0; __i < ${source}; __i++) {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else if (node.kind === 'rentang') {
      // "ulangi item dari A sampai B:" → for range
      const rangeEnd = node.rangeEnd ? this.lowerExpression(node.rangeEnd) : source;
      this.emit(`for (let ${node.iteratorName} = ${source}; ${node.iteratorName} <= ${rangeEnd}; ${node.iteratorName}++) {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit(`}`);
    } else {
      // "ulangi item dari sumber:" → forEach
      this.emit(`${source}.forEach((${node.iteratorName}, indeks) => {`);
      this.indent++;
      accept(node.body, this);
      this.indent--;
      this.emit("});");
    }
  };

  KarsaCompiler.prototype.visitSelamaStatement = function(node) {
    const cond = this.lowerExpression(node.condition);
    this.emit(`while (${cond}) {`);
    this.indent++;
    accept(node.body, this);
    this.indent--;
    this.emit("}");
  };

  KarsaCompiler.prototype.visitBerhentiStatement = function(node) {
    this.emit(`break;`);
  };

  KarsaCompiler.prototype.visitLewatiStatement = function(node) {
    this.emit(`continue;`);
  };

  KarsaCompiler.prototype.visitKembalikanStatement = function(node) {
    if (node.value) {
      const val = this.lowerExpression(node.value);
      this.emit(`return ${val};`);
    } else {
      this.emit(`return;`);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — DATA & REACTIVITY
  // ═══════════════════════════════════════════════════════════

  /**
   * [Bug 1 FIX] Cek apakah target variabel bersifat reaktif (data/turunan)
   * atau biasa (ubah/tetap). Menentukan cara assign yang benar.
   *
   * - Reaktif (data, turunan) → Proxy punya .value → gunakan __setState()
   * - Biasa (ubah) → plain variable → gunakan assignment langsung
   * - Tidak diketahui → fallback ke __setState (aman untuk Proxy)
   */
  KarsaCompiler.prototype._isTargetReactive = function(node) {
    if (node.targetSymbol) {
      return node.targetSymbol.isReactive === true;
    }
    // Fallback: jika tidak ada metadata resolver, anggap reaktif
    // (lebih aman karena __setState bekerja dengan Proxy)
    return true;
  };

  KarsaCompiler.prototype.visitSimpanStatement = function(node) {
    const target = node.target;
    const val = this.lowerExpression(node.value);
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, gunakan __setState
      this.emit(`__setState(${target}, ${val});`);
    } else {
      // ubah → plain variable, assignment langsung
      this.emit(`${target} = ${val};`);
    }
  };

  KarsaCompiler.prototype.visitTambahkanStatement = function(node) {
    const target = node.target;
    const jumlah = this.lowerExpression(node.value);
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, akses via .value
      this.emit(`__setState(${target}, ${target}.value + ${jumlah});`);
    } else {
      // ubah → plain variable, assignment langsung
      this.emit(`${target} = ${target} + ${jumlah};`);
    }
  };

  KarsaCompiler.prototype.visitKurangiStatement = function(node) {
    const target = node.target;
    // Default ke 1 jika tidak ada value (kurangi counter → counter - 1)
    const jumlah = node.value ? this.lowerExpression(node.value) : '1';
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, akses via .value
      this.emit(`__setState(${target}, ${target}.value - ${jumlah});`);
    } else {
      // ubah → plain variable, assignment langsung
      this.emit(`${target} = ${target} - ${jumlah};`);
    }
  };

  KarsaCompiler.prototype.visitSisipkanStatement = function(node) {
    const val = this.lowerExpression(node.value);
    const target = node.target;
    if (this._isTargetReactive(node)) {
      // data/turunan → Proxy, akses via .value
      this.emit(`${target}.value.push(${val});`);
    } else {
      // ubah → plain array, push langsung
      this.emit(`${target}.push(${val});`);
    }
  };

  KarsaCompiler.prototype.visitAmbilDomStatement = function(node) {
    // "ambil nilai/teks/html/dll dari sumber -> simpan ke target"
    const source = this.resolveTarget(node.source);
    const targetVar = node.target; // string nama variabel

    const kindMap = {
      'nilai': 'value',
      'teks': 'innerText',
      'html': 'innerHTML',
      'tinggi': 'offsetHeight',
      'lebar': 'offsetWidth',
      'atribut': null  // khusus — pakai getAttribute
    };

    if (node.kind === 'atribut') {
      const attrName = node.attributeName || '';
      this.emit(`__setState(${targetVar}, ${source}.getAttribute("${attrName}"));`);
    } else {
      const jsProp = kindMap[node.kind] || node.kind;
      this.emit(`__setState(${targetVar}, ${source}.${jsProp});`);
    }
  };

  KarsaCompiler.prototype.visitAmbilLuarStatement = function(node) {
    // "ambil dari URL" → fetch API
    const url = this.lowerExpression(node.url);

    // Build fetch options
    let fetchOptions = '{}';
    if (node.options && node.options.length > 0) {
      const optPairs = node.options.map(opt => {
        const val = this.lowerExpression(opt.value);
        return `"${opt.key}": ${val}`;
      });
      fetchOptions = `{ ${optPairs.join(', ')} }`;
    }

    this.emit(`fetch(${url}, ${fetchOptions})`);
    this.indent++;

    // Process branches (berhasil, gagal, selalu)
    if (node.branches && node.branches.length > 0) {
      node.branches.forEach(branch => {
        if (branch.kind === 'berhasil') {
          this.emit(`.then((__response) => {`);
          this.indent++;
          this.emit(`if (!__response.ok) throw new Error("HTTP " + __response.status);`);
          this.emit(`return __response.json();`);
          this.indent--;
          this.emit(`})`);
          this.emit(`.then((__data) => {`);
          this.indent++;
          if (branch.action) accept(branch.action, this);
          this.indent--;
          this.emit(`})`);
        } else if (branch.kind === 'gagal') {
          this.emit(`.catch((__error) => {`);
          this.indent++;
          this.emit(`console.error("AmbilLuar gagal:", __error);`);
          if (branch.action) accept(branch.action, this);
          this.indent--;
          this.emit(`})`);
        } else if (branch.kind === 'selalu') {
          this.emit(`.finally(() => {`);
          this.indent++;
          if (branch.action) accept(branch.action, this);
          this.indent--;
          this.emit(`})`);
        }
      });
    } else {
      // No branches — just log
      this.emit(`.then(r => r.json())`);
      this.emit(`.catch(e => console.error(e))`);
    }

    this.emit(`;`);
    this.indent--;
  };

  // ═══════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — KOMPONEN & GUNAKAN
  // ═══════════════════════════════════════════════════════════

  KarsaCompiler.prototype.visitGunakanStatement = function(node) {
    // "gunakan NamaKomponen dengan props di target"
    const componentFactory = `__komp_${node.componentName}`;

    // Build props object
    let propsArg = '';
    if (node.props && node.props.length > 0) {
      const propPairs = node.props.map(p => {
        const val = this.lowerExpression(p.value);
        return `"${p.key}": ${val}`;
      });
      propsArg = `{ ${propPairs.join(', ')} }`;
    }

    const instanceVar = this.genVar('komp');
    this.emit(`const ${instanceVar} = ${componentFactory}(${propsArg});`);

    // Mount ke target
    if (node.mountTarget) {
      const mountTarget = this.resolveTarget(node.mountTarget);
      this.emit(`${mountTarget}.appendChild(${instanceVar});`);
    } else if (this.currentParent) {
      this.emit(`${this.currentParent}.appendChild(${instanceVar});`);
    } else {
      this.emit(`document.body.appendChild(${instanceVar});`);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — NAVIGASI
  // ═══════════════════════════════════════════════════════════

  KarsaCompiler.prototype.visitArahkanStatement = function(node) {
    // "arahkan ke URL" → window.location.href
    const url = this.lowerExpression(node.url);
    this.emit(`window.location.href = ${url};`);
  };

  KarsaCompiler.prototype.visitMuatUlangStatement = function(node) {
    this.emit(`window.location.reload();`);
  };

  KarsaCompiler.prototype.visitKembaliStatement = function(node) {
    this.emit(`window.history.back();`);
  };

  // ═══════════════════════════════════════════════════════════
  // VISITOR IMPLEMENTATIONS — INTEROP & RANTAI AKSI
  // ═══════════════════════════════════════════════════════════

  KarsaCompiler.prototype.visitLangsungBlock = function(node) {
    this.emit(node.content);
  };

  KarsaCompiler.prototype.visitPanggilNativeExpression = function(node) {
    const args = node.arguments.map(a => this.lowerExpression(a)).join(', ');
    // [Bug 2 FIX] Gunakan lowerExpression untuk callee, bukan .name langsung
    // Ini mendukung MemberExpression seperti console.log, document.querySelector
    const calleeCode = this.lowerExpression(node.callee);
    const code = `${calleeCode}(${args})`;

    if (this.currentParent) {
        // Jika dipanggil sebagai statement di dalam blok 'buat'
        this.emit(`${code};`);
    } else {
        return code;
    }
  };

  KarsaCompiler.prototype.visitJalankanExpression = function(node) {
    // [Bug 5 FIX] Hapus node.args fallback — sudah deprecated di resolver (C2 fix).
    // Hanya gunakan node.arguments atau node.withArgs.
    const args = (node.arguments || node.withArgs || [])
      .map(a => this.lowerExpression(a));
    const code = `${node.callee}(${args.join(', ')})`;

    // Jika dipakai sebagai statement di dalam blok 'buat' (ada currentParent),
    // emit langsung; jika tidak, kembalikan sebagai ekspresi.
    if (this.currentParent) {
      this.emit(`${code};`);
    } else {
      return code;
    }
  };

  KarsaCompiler.prototype.visitRantaiAksi = function(node) {
    // RantaiAksi: first statement diikuti chain of actions
    // "aksi1 lalu aksi2 lalu aksi3"
    // Lower: jalankan first, lalu chain secara berurutan

    // Visit the first action
    if (node.first) accept(node.first, this);

    // Visit each chained action
    if (node.chain && node.chain.length > 0) {
      node.chain.forEach(chainedAction => {
        accept(chainedAction, this);
      });
    }
  };

}

module.exports = { install };
