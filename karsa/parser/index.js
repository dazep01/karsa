/**
 * KARSA v0.3.1 — Parser Public API
 *
 * Entry point publik untuk modul parser KARSA.
 * Berdasarkan: RFC-PARSER-001 §3
 */

var KarsaParser = require('./karsa-parser');
var Visitor = require('../utils/visitor');
var AST = require('./ast-factory');
var Err = require('./error-codes');
var TT = require('./token-types');

/**
 * Mem-parse token stream menjadi AST.
 *
 * @param {Array} tokens - Array token dari Lexer
 * @returns {object} ParseResult { ast: ProgramNode, errors: ParseError[] }
 */
function parse(tokens) {
  var parser = new KarsaParser(tokens);
  return parser.parse();
}

/**
 * Membuat instance parser baru.
 *
 * @param {Array} tokens - Array token dari Lexer
 * @returns {KarsaParser} Instance parser
 */
function createParser(tokens) {
  return new KarsaParser(tokens);
}

// Re-ekspor untuk akses langsung
module.exports = {
  parse: parse,
  createParser: createParser,
  KarsaParser: KarsaParser,
  Visitor: Visitor,
  AST: AST,
  ErrorCodes: Err,
  TokenTypes: TT,

  // Shorthand
  formatAST: Visitor.formatAST,
  formatError: Err.formatError,
  BaseVisitor: Visitor.BaseVisitor,
  CollectingVisitor: Visitor.CollectingVisitor
};
