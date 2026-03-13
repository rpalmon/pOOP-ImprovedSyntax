import { TokenType } from "./tokenTypes";
import { KEYWORDS } from "./keywords";

export class Lexer{
    constructor(source) {
        this.source = source;
        this.i = 0;
        this.line = 1;
        this.col = 1;
    }

    makeToken(type, lexeme, literal = null, line = this.line, col = this.col){
        return { type, lexeme, literal, line, col };
    }

    peek(offset = 0) {
        const idx = this.i + offset;
        return idx >= this.source.length ? "\0" : this.source[idx];
      }

    advance() {
        const ch = this.peek();
        this.i++;
        if (ch === "\n") {
          this.line++;
          this.col = 1;
        } else {
          this.col++;
        }
        return ch;
      }

    error(msg) {
        throw new Error(`Lexer error at ${this.line}:${this.col} - ${msg}`);
    }

    skipWhitespace() {
        while (true) {
          const ch = this.peek();
          if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
            this.advance();
          } else {
            break;
          }
        }
      }

      readNumber() {
        const startLine = this.line;
        const startCol = this.col;
        let lexeme = "";
        while (/[0-9]/.test(this.peek())) {
          lexeme += this.advance();
        }
        return { type: TokenType.INTEGER, lexeme, literal: Number(lexeme), line: startLine, col: startCol };
      }

      readIdentifierOrKeyword() {
        const startLine = this.line;
        const startCol = this.col;
        let lexeme = "";
        while (/[A-Za-z0-9_]/.test(this.peek())) {
          lexeme += this.advance();
        }
        const keywordType = KEYWORDS[lexeme];
        if (keywordType) {
          return { type: keywordType, lexeme, literal: null, line: startLine, col: startCol };
        }
        return { type: TokenType.IDENTIFIER, lexeme, literal: null, line: startLine, col: startCol };
      }

      readString(){

      }

      nextToken(){

      }

      tokenize(){
        const tokens =[];
        while(true) {
            const token = this.nextToken
            tokens.push(token);
            if(token.type === TokenType.EOF) break;
        }
        return tokens;
      }

}