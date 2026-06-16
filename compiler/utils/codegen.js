/**
 * KARSA v0.3.1 — Compiler Codegen Utilities
 * ----------------------------------------------------------------------------
 * Refinement lvl.4D: utilitas codegen dasar dipisah dari compiler utama.
 */

'use strict';

function emit(ctx, code) {
  const spacing = '  '.repeat(ctx.indent || 0);
  ctx.output.push(spacing + code);
}

function genVar(ctx, prefix) {
  prefix = prefix || 'v';
  ctx.varCounter = (ctx.varCounter || 0) + 1;
  return `__${prefix}_${ctx.varCounter}`;
}

function escapeString(value) {
  return JSON.stringify(String(value));
}

module.exports = {
  emit,
  genVar,
  escapeString
};
