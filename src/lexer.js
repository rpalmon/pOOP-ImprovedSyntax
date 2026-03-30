import { TokenType } from "./tokenTypes.js";
import { KEYWORDS } from "./keywords.js";

const SINGLE_CHAR_TOKENS = {
  "(": TokenType.LPAREN,
  ")": TokenType.RPAREN,
  "{": TokenType.LBRACE,
  "}": TokenType.RBRACE,
  ";": TokenType.SEMICOLON,
  ",": TokenType.COMMA,
  ".": TokenType.DOT,
  "=": TokenType.ASSIGN,
  "+": TokenType.PLUS,
  "-": TokenType.MINUS,
  "*": TokenType.STAR,
  "/": TokenType.SLASH,
};

export class Lexer {
  constructor(source) {
    this.source = source;
    this.i = 0;
    this.line = 1;
    this.col = 1;
  }

  makeToken(type, lexeme, literal = null, line = this.line, col = this.col) {
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

  error(msg, line = this.line, col = this.col) {
    throw new Error(`Lexer error at ${line}:${col} - ${msg}`);
  }

  skipWhitespace() {
    while (true) {
      const ch = this.peek();

      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        this.advance();
        continue;
      }

      if (ch === "/" && this.peek(1) === "/") {
        while (this.peek() !== "\n" && this.peek() !== "\0") {
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  readNumber() {
    const startLine = this.line;
    const startCol = this.col;
    let lexeme = "";

    while (/[0-9]/.test(this.peek())) {
      lexeme += this.advance();
    }

    return {
      type: TokenType.INTEGER,
      lexeme,
      literal: Number(lexeme),
      line: startLine,
      col: startCol,
    };
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
      let literal = null;

      if (keywordType === TokenType.TRUE) {
        literal = true;
      } else if (keywordType === TokenType.FALSE) {
        literal = false;
      }

      return {
        type: keywordType,
        lexeme,
        literal,
        line: startLine,
        col: startCol,
      };
    }

    return {
      type: TokenType.IDENTIFIER,
      lexeme,
      literal: null,
      line: startLine,
      col: startCol,
    };
  }

  readString() {
    const startLine = this.line;
    const startCol = this.col;
    let lexeme = "";

    this.advance();

    while (this.peek() !== '"' && this.peek() !== "\0") {
      if (this.peek() === "\\") {
        const escapeLine = this.line;
        const escapeCol = this.col;
        this.advance();
        const escapeChar = this.peek();

        switch (escapeChar) {
          case '"':
            lexeme += '"';
            break;
          case "n":
            lexeme += "\n";
            break;
          case "t":
            lexeme += "\t";
            break;
          case "\\":
            lexeme += "\\";
            break;
          default:
            this.error(`Invalid escape sequence '\\${escapeChar}'`, escapeLine, escapeCol);
        }

        this.advance();
      } else {
        lexeme += this.advance();
      }
    }

    if (this.peek() === "\0") {
      this.error("Unterminated string", startLine, startCol);
    }

    this.advance();
    return {
      type: TokenType.STRING,
      lexeme,
      literal: lexeme,
      line: startLine,
      col: startCol,
    };
  }

  nextToken() {
    this.skipWhitespace();
    const ch = this.peek();

    if (ch === "\0") return this.makeToken(TokenType.EOF, "", null);
    if (/[0-9]/.test(ch)) return this.readNumber();
    if (/[A-Za-z_]/.test(ch)) return this.readIdentifierOrKeyword();
    if (ch === '"') return this.readString();

    if (SINGLE_CHAR_TOKENS[ch]) {
      const tokenType = SINGLE_CHAR_TOKENS[ch];
      this.advance();
      return this.makeToken(tokenType, ch);
    }

    this.error(`Unexpected character '${ch}'`);
    return null;
  }

  tokenize() {
    const tokens = [];
    while (true) {
      const token = this.nextToken();
      tokens.push(token);
      if (token.type === TokenType.EOF) break;
    }
    return tokens;
  }
}