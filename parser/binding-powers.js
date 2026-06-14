/**
 * KARSA v0.3.1 — Tabel Binding Power Pratt Parser
 *
 * Spesifikasi binding power berdasarkan RFC-PARSER-001 §6.
 * Semakin tinggi bp, semakin kuat ikatannya (dievaluasi lebih dulu).
 *
 * Format: { left: number, right: number }
 * - Prefix operator: hanya right (left tidak dipakai)
 * - Infix operator: left = bp sisi kiri, right = bp sisi kanan
 * - Asosiatif kiri: left > right
 */

var TT = require('./token-types');

var BINDING_POWERS = {};

// ─── Level 1: atau (disjungsi logika) ──────────────────────
BINDING_POWERS[TT.TK_ATAU] = { left: 2, right: 1 };

// ─── Level 2: dan (konjungsi logika) ───────────────────────
BINDING_POWERS[TT.TK_DAN] = { left: 4, right: 3 };

// ─── Level 4: perbandingan ─────────────────────────────────
BINDING_POWERS[TT.TK_SAMA_DENGAN] = { left: 7, right: 6 };
BINDING_POWERS[TT.TK_TIDAK_SAMA_DENGAN] = { left: 7, right: 6 };
BINDING_POWERS[TT.TK_LEBIH_DARI] = { left: 7, right: 6 };
BINDING_POWERS[TT.TK_KURANG_DARI] = { left: 7, right: 6 };
BINDING_POWERS[TT.TK_PALING_SEDIKIT] = { left: 7, right: 6 };
BINDING_POWERS[TT.TK_PALING_BANYAK] = { left: 7, right: 6 };
BINDING_POWERS[TT.TK_ADA_DI] = { left: 7, right: 6 };
BINDING_POWERS[TT.TK_TIDAK_ADA_DI] = { left: 7, right: 6 };

// ─── Level 5: additive ─────────────────────────────────────
BINDING_POWERS[TT.TK_PLUS] = { left: 9, right: 8 };
BINDING_POWERS[TT.TK_MINUS] = { left: 9, right: 8 };

// ─── Level 6: multiplicative ───────────────────────────────
BINDING_POWERS[TT.TK_BINTANG] = { left: 11, right: 10 };
BINDING_POWERS[TT.TK_GARIS_MIRING] = { left: 11, right: 10 };

// ─── Level 7: unary prefix minus ───────────────────────────
// TK_MINUS sebagai prefix: right = 12 (dipakai di parsePrefix)

// ─── Level 8: postfix (member access, function call) ───────
BINDING_POWERS[TT.TK_TITIK] = { left: 15, right: 14 };
// TK_KURUNG_BUKA sebagai postfix call: { left: 15, right: 14 }

// ─── Level 9: grouping prefix ──────────────────────────────
// TK_KURUNG_BUKA sebagai prefix: right = 16 (dipakai di parsePrefix)

// ─── Level 3: bukan (unary prefix) ─────────────────────────
// TK_BUKAN sebagai prefix: right = 5

/**
 * Prefix binding powers (hanya sisi kanan).
 */
var PREFIX_BP = {};
PREFIX_BP[TT.TK_BUKAN] = 5;
PREFIX_BP[TT.TK_MINUS] = 12;     // unary minus
PREFIX_BP[TT.TK_KURUNG_BUKA] = 16; // grouping

/**
 * Mendapatkan binding power infix/postfix untuk token.
 * @param {string} tokenType - Tipe token
 * @returns {object|null} { left, right } atau null
 */
function getInfixBp(tokenType) {
  return BINDING_POWERS[tokenType] || null;
}

/**
 * Mendapatkan binding power prefix untuk token.
 * @param {string} tokenType - Tipe token
 * @returns {number|null} right bp atau null
 */
function getPrefixBp(tokenType) {
  return PREFIX_BP[tokenType] || null;
}

/**
 * Memeriksa apakah token adalah infix operator.
 */
function isInfixOperator(tokenType) {
  return BINDING_POWERS.hasOwnProperty(tokenType);
}

/**
 * Memeriksa apakah token adalah prefix operator.
 */
function isPrefixOperator(tokenType) {
  return PREFIX_BP.hasOwnProperty(tokenType);
}

/**
 * Mendapatkan string operator dari token KARSA.
 * Digunakan untuk mengisi field `operator` pada BinaryExpression.
 */
function operatorFromToken(tokenType, tokenNilai) {
  switch (tokenType) {
    case TT.TK_PLUS: return '+';
    case TT.TK_MINUS: return '-';
    case TT.TK_BINTANG: return '*';
    case TT.TK_GARIS_MIRING: return '/';
    case TT.TK_DAN: return 'dan';
    case TT.TK_ATAU: return 'atau';
    case TT.TK_SAMA_DENGAN: return 'sama dengan';
    case TT.TK_TIDAK_SAMA_DENGAN: return 'tidak sama dengan';
    case TT.TK_LEBIH_DARI: return 'lebih dari';
    case TT.TK_KURANG_DARI: return 'kurang dari';
    case TT.TK_PALING_SEDIKIT: return 'paling sedikit';
    case TT.TK_PALING_BANYAK: return 'paling banyak';
    case TT.TK_ADA_DI: return 'ada di';
    case TT.TK_TIDAK_ADA_DI: return 'tidak ada di';
    default: return tokenNilai;
  }
}

module.exports = {
  BINDING_POWERS: BINDING_POWERS,
  PREFIX_BP: PREFIX_BP,
  getInfixBp: getInfixBp,
  getPrefixBp: getPrefixBp,
  isInfixOperator: isInfixOperator,
  isPrefixOperator: isPrefixOperator,
  operatorFromToken: operatorFromToken
};
