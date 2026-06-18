/**
 * KARSA v0.3.1 — Expression Lowering
 * ----------------------------------------------------------------------------
 * Refinement lvl.4E: expression lowering dipisah dari compiler utama.
 */

'use strict';

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
      // Handle method calls on reactive arrays/objects
      const callArgs = node.arguments.map(a => lowerExpression(compiler, a)).join(', ');
      const calleeCode = lowerExpression(compiler, node.callee);
      
      // Jika callee adalah MemberExpression dan objeknya adalah array reaktif,
      // kita sudah mengakses .value di MemberExpression, jadi tinggal panggil method
      return `${calleeCode}(${callArgs})`;
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

module.exports = { lowerExpression };
