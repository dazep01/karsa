# PARSER CHARTER

Versi: 1.0

## Tujuan
Dokumen normatif untuk seluruh implementasi parser KARSA.

SOURCE OF TRUTH:
1. KARSA-grammar-spec_v0.3.1.md
2. parser-charter.md
3. parser-architecture.md
4. RFC-PARSER-001.md
5. AST Specification.md

PRINSIP:
- Parser hanya Token -> AST
- Parser tidak melakukan semantic validation
- AST adalah produk utama parser
- AST independen dari JavaScript
- Recursive Descent + Pratt Parser
- Error tolerant
- Semua node memiliki location metadata
- Test-first development
- Grammar mengikuti spec, bukan implementasi parser

OWNERSHIP:
Lexer: Source -> Token
Parser: Token -> AST
Resolver: AST -> Symbol Table
Analyzer: Semantic Validation
Compiler: AST -> JavaScript
