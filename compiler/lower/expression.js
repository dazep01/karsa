/**
 * KARSA v0.3.1 — Expression Lowering
 * ----------------------------------------------------------------------------
 * Refinement lvl.4E: expression lowering dipisah dari compiler utama.
 *
 * v0.3.1-patch2: Fix BUG-3, BUG-4, BUG-5
 *   - Built-in function calls (panjang, tipeData, apakahArray, dll.) 
 *     diturunkan ke JavaScript yang benar
 *   - Mutating array methods pada variabel reaktif (push, pop, splice, dll.)
 *     sekarang memicu reaktivitas dengan spread assignment
 *   - Alias method Indonesia (untukSetiap, sisip, dll.) diterjemahkan
 *     oleh resolver dan ditangani di sini
 */

'use strict';

// Method yang bermutasi array (tidak mengubah reference, jadi Proxy setter tidak terpicu)
const MUTATING_ARRAY_METHODS = new Set([
  'push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill'
]);

function lowerExpression(compiler, node) {
  if (!node) return 'undefined';
  
  switch(node.type) {
    case 'Literal':
      return JSON.stringify(node.value);
    case 'Identifier':
      if (node.resolved && (node.resolved.kind === 'data' || node.resolved.kind === 'turunan')) {
        return `${node.name}.value`;
      }
      return node.name;
    case 'BinaryExpression':
      const ops = { 
        'sama dengan': '===', 
        'tidak sama dengan': '!==', 
        'dan': '&&', 
        'atau': '||',
        'paling sedikit': '>=',   
        'paling banyak': '<=',      
        'lebih dari': '>',       
        'kurang dari': '<',
        'tambah': '+',
        'kurang': '-',
        'kali': '*',
        'bagi': '/',
        'mod': '%',
        'pangkat': '**'
      };
      const op = ops[node.operator] || node.operator;
      return `(${lowerExpression(compiler, node.left)} ${op} ${lowerExpression(compiler, node.right)})`;
    case 'UnaryExpression':
      const unaryOps = {
        'tidak': '!',
        'negatif': '-'
      };
      const uop = unaryOps[node.operator] || node.operator;
      if (node.prefix !== false) {
        return `(${uop}${lowerExpression(compiler, node.operand)})`;
      }
      return `(${lowerExpression(compiler, node.operand)}${uop})`;
    case 'MemberExpression':
      let prop = node.property.name;
      const objCode = lowerExpression(compiler, node.object);
      // Jika objek adalah identifier reaktif (data/turunan), ekspresi sudah menghasilkan .value
      // Jadi kita bisa langsung akses properti method array seperti push, forEach, dll
      return `${objCode}.${prop}`;
    case 'CallExpression':
      return lowerCallExpression(compiler, node);
    case 'ObjectLiteral':
      if (node.properties && node.properties.length > 0) {
        const pairs = node.properties.map(p => {
          const val = lowerExpression(compiler, p.value);
          return `"${p.key}": ${val}`;
        });
        return `{ ${pairs.join(', ')} }`;
      }
      return '{}';
    case 'ArrayLiteral':
      if (node.elements && node.elements.length > 0) {
        const elems = node.elements.map(e => lowerExpression(compiler, e));
        return `[${elems.join(', ')}]`;
      }
      return '[]';
    case 'JalankanExpression':
      return compiler.visitJalankanExpression(node);
    case 'PanggilNativeExpression':
      return compiler.visitPanggilNativeExpression(node);
    case 'Selector':
      return compiler.resolveTarget(node);
    case 'PropertyNode':
      return lowerExpression(compiler, node.value);
    case 'FetchBranch':
    case 'FetchOption':
      return 'undefined';
    case 'ErrorNode':
      return 'undefined';
    default:
      // Unknown node type — emit warning comment
      console.warn(`[KARSA Compiler] Unknown expression type: ${node.type}`);
      return 'undefined';
  }
}

/**
 * Menurunkan CallExpression ke JavaScript.
 * Menangani:
 *   - Fungsi bawaan (builtins): panjang(arr) → arr.value.length, dll.
 *   - Method call pada variabel reaktif: arr.push(x) → arr.value.push(x); arr.value = [...arr.value]
 *   - Method call non-mutating: arr.forEach(...) → arr.value.forEach(...)
 *   - Panggilan fungsi biasa: myFunc(args)
 */
function lowerCallExpression(compiler, node) {
  // ── Kasus 1: Fungsi bawaan (builtin) ──────────────────────────────
  if (node.isBuiltin && node.builtinInfo) {
    return lowerBuiltinCall(compiler, node);
  }

  // ── Kasus 2: Method call pada objek reaktif ───────────────────────
  if (node.callee && node.callee.type === 'MemberExpression') {
    return lowerMethodCall(compiler, node);
  }

  // ── Kasus 3: Panggilan fungsi biasa ───────────────────────────────
  const callArgs = node.arguments.map(a => lowerExpression(compiler, a)).join(', ');
  const calleeCode = lowerExpression(compiler, node.callee);
  return `${calleeCode}(${callArgs})`;
}

/**
 * Menurunkan panggilan fungsi bawaan (builtin) ke JavaScript.
 * panjang(arr) → arr.value.length  (atau arr.length jika bukan reaktif)
 * tipeData(x) → typeof x
 * apakahArray(x) → Array.isArray(x)
 * dll.
 */
function lowerBuiltinCall(compiler, node) {
  const builtin = node.builtinInfo;
  const args = node.arguments.map(a => lowerExpression(compiler, a));

  // Prefix operator (typeof)
  if (node.isPrefixBuiltin || builtin.prefix) {
    return `${builtin.jsName} ${args[0]}`;
  }

  // Helper functions yang memerlukan runtime helper
  if (builtin.helper) {
    switch (builtin.jsName) {
      case '__karsa_panjang': {
        // panjang(arr) → arr.length (unwrap .value jika reaktif, arg sudah di-lower)
        // arg sudah di-lower oleh lowerExpression, jadi jika reaktif sudah ada .value
        return `${args[0]}.length`;
      }
      case '__karsa_apakahKosong': {
        // apakahKosong(arr) → (Array.isArray(x) ? x.length === 0 : x === null || x === undefined || x === '')
        return `(${args[0]} === null || ${args[0]} === undefined || (Array.isArray(${args[0]}) && ${args[0]}.length === 0) || ${args[0]} === '')`;
      }
      case '__karsa_gabung': {
        // gabung(arr, pemisah) → arr.join(pemisah)
        const separator = args[1] || '","';
        return `${args[0]}.join(${separator})`;
      }
      case '__karsa_saring': {
        // saring(arr, fn) → arr.filter(fn)
        return `${args[0]}.filter(${args[1]})`;
      }
      case '__karsa_pilih': {
        // pilih(arr, fn) → arr.map(fn)
        return `${args[0]}.map(${args[1]})`;
      }
      case '__karsa_urutkan': {
        // urutkan(arr) → [...arr].sort() (salin dulu agar tidak bermutasi)
        return `[...${args[0]}].sort(${args[1] || ''})`;
      }
      case '__karsa_balik': {
        // balik(arr) → [...arr].reverse() (salin dulu agar tidak bermutasi)
        return `[...${args[0]}].reverse()`;
      }
      case '__karsa_temukan': {
        // temukan(arr, fn) → arr.find(fn)
        return `${args[0]}.find(${args[1]})`;
      }
      case '__karsa_apakahAda': {
        // apakahAda(arr, item) → arr.includes(item)
        return `${args[0]}.includes(${args[1]})`;
      }
      default:
        // Fallback: gunakan jsName langsung
        return `${builtin.jsName}(${args.join(', ')})`;
    }
  }

  // Non-helper builtins (langsung ke JS native)
  // keTeks(x) → String(x), keAngka(x) → Number(x), dll.
  return `${builtin.jsName}(${args.join(', ')})`;
}

/**
 * Menurunkan method call pada objek (arr.method(args)).
 * Menangani:
 *   - Mutating methods pada variabel reaktif: picu reaktivitas
 *   - Non-mutating methods: langsung panggil
 */
function lowerMethodCall(compiler, node) {
  const callArgs = node.arguments.map(a => lowerExpression(compiler, a)).join(', ');
  const calleeCode = lowerExpression(compiler, node.callee);
  const methodName = node.callee.property.name; // sudah ditranslasi oleh resolver

  // Cek apakah ini mutating method pada variabel reaktif
  const isMutating = MUTATING_ARRAY_METHODS.has(methodName);
  const objectIsReactive = isObjectReactive(node.callee.object);

  if (isMutating && objectIsReactive) {
    // [BUG-4 FIX] Method yang bermutasi array pada variabel reaktif
    // harus memicu Proxy setter dengan assignment baru.
    // arr.value.push(x) → (arr.value.push(x), arr.value = [...arr.value])
    // Menggunakan comma operator agar ekspresi mengembalikan hasil push
    // sekaligus memicu reaktivitas.
    const objExpr = lowerExpression(compiler, node.callee.object);
    // objExpr sudah mengandung .value karena reaktif
    return `(function() { var __r = ${calleeCode}(${callArgs}); ${objExpr} = [...${objExpr}]; return __r; })()`;
  }

  // Non-mutating atau non-reaktif: panggil biasa
  return `${calleeCode}(${callArgs})`;
}

/**
 * Cek apakah objek ekspresi adalah variabel reaktif (data/turunan).
 * Menggunakan metadata resolver yang dilampirkan ke Identifier node.
 */
function isObjectReactive(objectNode) {
  if (!objectNode) return false;

  // Jika node adalah Identifier, cek metadata resolved
  if (objectNode.type === 'Identifier' && objectNode.resolved) {
    return objectNode.resolved.kind === 'data' || objectNode.resolved.kind === 'turunan';
  }

  // Jika node adalah MemberExpression yang mengakses .value dari reaktif,
  // maka .object dari MemberExpression parent adalah reaktif
  if (objectNode.type === 'MemberExpression') {
    return isObjectReactive(objectNode.object);
  }

  // Default: anggap tidak reaktif
  return false;
}

module.exports = { lowerExpression };
