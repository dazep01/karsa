# PARSER ARCHITECTURE

Versi: 1.0

## Pipeline
Source -> Lexer -> Token -> Parser -> AST -> Resolver -> Analyzer -> Compiler

## Root Node
Program

## Node Categories
Declarations:
- VariableDeclaration
- FunctionDeclaration
- ComponentDeclaration

Statements:
- IfStatement
- ForEachStatement
- AssignmentStatement
- EventStatement
- WatchStatement

Expressions:
- Identifier
- Literal
- BinaryExpression
- CallExpression
- MemberExpression

UI:
- ElementNode
- AttributeNode
- ComponentUsageNode

## Mandatory Node Shape
Semua node wajib memiliki type dan loc.

## Expression Parsing
Gunakan Pratt Parser.

## Error Recovery
Synchronize pada NEWLINE, DEDENT, EOF.

## Definition of Done
- Grammar v0.3.1 ter-parse
- AST stabil
- Error recovery berjalan
- Semua node punya location
- Test suite lulus
