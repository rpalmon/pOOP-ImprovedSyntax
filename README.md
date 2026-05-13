"# pOOP-ImprovedSyntax" 


## Grammar

```
program     ::= classDef* stmt*

classDef    ::= `class` IDENTIFIER (`extends` IDENTIFIER)?
                `{` field* init methodDef* `}`

field       ::= type IDENTIFIER `;`

init        ::= `init` `(` params `)` `{` stmt* `}`

methodDef   ::= `method` IDENTIFIER `(` params `)` type `{` stmt* `}`

params      ::= (type IDENTIFIER (`,` type IDENTIFIER)*)?

type        ::= `Int` | `Boolean` | `Void` | IDENTIFIER

stmt        ::= `let` IDENTIFIER `=` exp `;`
              | type IDENTIFIER `;`
              | IDENTIFIER `=` exp `;`
              | exp `;`
              | `return` exp? `;`
              | `println` `(` exp `)` `;`
              | `if` `(` exp `)` body (`else` body)?
              | `while` `(` exp `)` body
              | `break` `;`

body        ::= `{` stmt* `}`

exp         ::= andExp
andExp      ::= addExp (`&&` addExp)*
addExp      ::= multExp ((`+` | `-`) multExp)*
multExp     ::= callExp ((`*` | `/`) callExp)*
callExp     ::= primaryExp (`.` IDENTIFIER (`(` args `)`)?)*

primaryExp  ::= IDENTIFIER
              | INTEGER
              | STRING
              | `true`
              | `false`
              | `(` exp `)`
              | `this`
              | `super`
              | `new` IDENTIFIER `(` args `)`

args        ::= (exp (`,` exp)*)?
```

## Tokens
The lexer recognizes the following tokens (names come from `src/tokenTypes.js`):

### Keywords
- CLASS
- EXTENDS
- INIT
- METHOD
- SUPER
- RETURN
- IF
- ELSE
- WHILE
- BREAK
- NEW
- THIS
- TRUE
- FALSE
- PRINTLN

### Types
- INT_TYPE
- BOOLEAN_TYPE
- VOID_TYPE

### Literals & Identifiers
- IDENTIFIER
- INTEGER
- STRING

### Punctuation & Operators
- LPAREN `(` 
- RPAREN `)`
- LBRACE `{`
- RBRACE `}`
- SEMICOLON `;`
- COMMA `,`
- DOT `.`
- ASSIGN `=`
- PLUS `+`
- MINUS `-`
- STAR `*`
- SLASH `/`

### Other
- EOF


First install dependencies:
```
npm i 
```

To run the program:
```bash
npm run start
```

To test the program:
```
npm test
```