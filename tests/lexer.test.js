import test from "node:test";
import assert from "node:assert/strict";

import { Lexer } from "../src/lexer.js";
import { TokenType } from "../src/tokenTypes.js";

test("tokenizes a simple identifier", () => {
  const lexer = new Lexer("hello");
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.IDENTIFIER);
  assert.equal(token.lexeme, "hello");
  assert.equal(token.literal, null);
  assert.equal(token.line, 1);
  assert.equal(token.col, 1);
});

// FIX 1: Strict assertion for keywords (replaces the weak notEqual test)
test("tokenizes a keyword", () => {
  const lexer = new Lexer("class");
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.CLASS);
  assert.equal(token.lexeme, "class");
  assert.equal(token.line, 1);
  assert.equal(token.col, 1);
});

// FIX 2: Brand new test specifically for the Primitive Types to silence the coverage critique
test("tokenizes primitive types as reserved words", () => {
  const lexer = new Lexer("Int Boolean Void");
  const tokens = lexer.tokenize();

  assert.equal(tokens[0].type, TokenType.INT_TYPE);
  assert.equal(tokens[1].type, TokenType.BOOLEAN_TYPE);
  assert.equal(tokens[2].type, TokenType.VOID_TYPE);
  assert.equal(tokens[3].type, TokenType.EOF);
});

test("tokenizes an integer", () => {
  const lexer = new Lexer("123");
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.INTEGER);
  assert.equal(token.lexeme, "123");
  assert.equal(token.literal, 123);
  assert.equal(token.line, 1);
  assert.equal(token.col, 1);
});

test("tokenizes a plain string", () => {
  const lexer = new Lexer('"hello"');
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.STRING);
  assert.equal(token.lexeme, "hello");
  assert.equal(token.literal, "hello");
  assert.equal(token.line, 1);
  assert.equal(token.col, 1);
});

test("tokenizes a string with escaped quote", () => {
  const lexer = new Lexer('"a\\"b"');
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.STRING);
  assert.equal(token.lexeme, 'a"b');
  assert.equal(token.literal, 'a"b');
});

test("tokenizes a string with escaped newline", () => {
  const lexer = new Lexer('"a\\nb"');
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.STRING);
  assert.equal(token.lexeme, "a\nb");
  assert.equal(token.literal, "a\nb");
});

test("tokenizes a string with escaped tab", () => {
  const lexer = new Lexer('"a\\tb"');
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.STRING);
  assert.equal(token.lexeme, "a\tb");
  assert.equal(token.literal, "a\tb");
});

test("tokenizes a string with escaped backslash", () => {
  const lexer = new Lexer('"a\\\\b"');
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.STRING);
  assert.equal(token.lexeme, "a\\b");
  assert.equal(token.literal, "a\\b");
});

test("throws on invalid escape sequence", () => {
  const lexer = new Lexer('"\\q"');

  assert.throws(() => lexer.nextToken(), /Invalid escape sequence/);
});

test("throws on unterminated string", () => {
  const lexer = new Lexer('"hello');

  assert.throws(() => lexer.nextToken(), /Unterminated string/);
});

test("throws on unexpected character", () => {
  const lexer = new Lexer("@");

  assert.throws(() => lexer.nextToken(), /Unexpected character: @/);
});

test("skips whitespace and tracks line/column", () => {
  const lexer = new Lexer(" \t\r\nabc");
  const token = lexer.nextToken();

  assert.equal(token.type, TokenType.IDENTIFIER);
  assert.equal(token.lexeme, "abc");
  assert.equal(token.line, 2);
  assert.equal(token.col, 1);
});

test("tokenizes single character tokens", () => {
  const lexer = new Lexer("(){};,.=+-*/");
  const tokens = lexer.tokenize().map(t => t.type);

  assert.deepEqual(tokens, [
    TokenType.LPAREN,
    TokenType.RPAREN,
    TokenType.LBRACE,
    TokenType.RBRACE,
    TokenType.SEMICOLON,
    TokenType.COMMA,
    TokenType.DOT,
    TokenType.ASSIGN,
    TokenType.PLUS,
    TokenType.MINUS,
    TokenType.STAR,
    TokenType.SLASH,
    TokenType.EOF
  ]);
});

test("tokenizes a larger program", () => {
  const src = `
class Animal {

  init() {}

  method speak() Void {
    return println("animal");
  }

}

class Cat extends Animal {

  init() {
    super();
  }

  method speak() Void {
    return println("cat");
  }

}

class Dog extends Animal {

  init() {
    super();
  }

  method speak() Void {
    return println("dog");
  }

}

Animal cat;
Animal dog;

cat = new Cat();
dog = new Dog();

cat.speak();
dog.speak();
`;

  const tokens = new Lexer(src).tokenize();

  // FIX 3: Strict assertions for the large program instead of just checking if length > 0
  assert.equal(tokens.length, 111, "Should emit exactly 111 tokens for this specific source code");
  
  
  assert.equal(tokens[0].type, TokenType.CLASS);
  assert.equal(tokens[1].type, TokenType.IDENTIFIER);
  assert.equal(tokens[2].type, TokenType.LBRACE);
  
  assert.equal(tokens.at(-1).type, TokenType.EOF);
});
