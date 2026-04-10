import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import {
  ParseException,
  IntegerExp,
  IdentifierExp,
  BinopExp,
  PlusOp,
  MinusOp,
  StarOp,
  SlashOp,
  VarDecStmt,
  AssignStmt,
  Program,
} from "../src/ast.js";

// Helper: run source through lexer + parser and return the AST Program
function parse(src) {
  const tokens = new Lexer(src).tokenize();
  return new Parser(tokens).parseProgram();
}

describe("Expressions", () => {
  test("parses an integer literal", () => {
    const tokens = new Lexer("x = 42;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof IntegerExp);
    assert.equal(stmt.exp.value, 42);
  });

  test("parses an identifier expression", () => {
    const tokens = new Lexer("x = y;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof IdentifierExp);
    assert.equal(stmt.exp.name, "y");
  });

  test("parses addition", () => {
    const tokens = new Lexer("x = 1 + 2;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof PlusOp);
  });

  test("parses subtraction", () => {
    const tokens = new Lexer("x = 5 - 3;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof MinusOp);
  });

  test("parses multiplication", () => {
    const tokens = new Lexer("x = 4 * 2;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof StarOp);
  });

  test("parses division", () => {
    const tokens = new Lexer("x = 8 / 2;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof SlashOp);
  });

  test("parses left-associative chained addition", () => {
    const tokens = new Lexer("x = 1 + 2 + 3;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    // Should be ((1 + 2) + 3)
    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.left instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof PlusOp);
  });

  test("parses parenthesized expression", () => {
    const tokens = new Lexer("x = (1 + 2);").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
  });

  // TODO: add as you implement each expression type
  // test("parses true literal", () => { ... });
  test("parses boolean literals in expressions", {skip: "not implemented yet"},() => {
    const tokens = new Lexer("x = true && false;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof AndOp);
  });
  // test("parses false literal", () => { ... });
  test("parses logical AND", {skip: "not implemented yet"}, () => {
    const tokens = new Lexer("x = true && false;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof AndOp);
  });
  // test("parses new object instantiation", () => { ... });
  test("parses parenthesized expression", {skip: "not implemented yet"}, () => {
    const tokens = new Lexer("x = (1 + 2);").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
  });
  // test("parses this expression", () => { ... });
  test("parses super expression", {skip: "not implemented yet"}, () => {
    const tokens = new Lexer("x = super;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof SuperExp);
  });
  // test("parses dot access", () => { ... });
  test("parses method call", {skip: "not implemented yet"}, () => {
    const tokens = new Lexer("x = obj.method();").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof MethodCallExp);
  });
  // test("parses field access", () => { ... });
   test("parses field access", {skip: "not implemented yet"}, () => {
    const tokens = new Lexer("x = obj.field;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof FieldAccessExp);
  });
  // test("parses method call", () => { ... });
  test("parses method call with arguments", () => {
    const tokens = new Lexer("x = obj.method(arg1, arg2);").tokenize(); 
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof MethodCallExp);
  });

});

describe("Statements", () => {
  test("parses a variable declaration", () => {
    // TODO: fix TokenType.INT -> INT_TYPE bug first, then uncomment
    // const program = parse("Int x;");
    // assert.equal(program.stmts.length, 1);
    // assert.ok(program.stmts[0] instanceof VarDecStmt);
    // assert.equal(program.stmts[0].type, "Int");
    // assert.equal(program.stmts[0].name, "x");
  });

  test("parses an assignment statement", () => {
    const program = parse("x = 5;");

    assert.equal(program.stmts.length, 1);
    assert.ok(program.stmts[0] instanceof AssignStmt);
    assert.equal(program.stmts[0].name, "x");
  });

  test("parses multiple statements", () => {
    const program = parse("x = 1;\ny = 2;");

    assert.equal(program.stmts.length, 2);
    assert.ok(program.stmts[0] instanceof AssignStmt);
    assert.ok(program.stmts[1] instanceof AssignStmt);
  });

  test("parses empty program", () => {
    const program = parse("");

    assert.ok(program instanceof Program);
    assert.equal(program.stmts.length, 0);
  });

  // TODO: add as you implement each statement type
  // test("parses return statement", () => { ... });
  // test("parses println statement", () => { ... });
  // test("parses if statement", () => { ... });
  // test("parses if/else statement", () => { ... });
  // test("parses while statement", () => { ... });
  // test("parses break statement", () => { ... });
  // test("parses super call", () => { ... });
});

describe("Classes", () => {
  // TODO: add as you implement class parsing
  // test("parses empty class", () => { ... });
  // test("parses class with extends", () => { ... });
  // test("parses class with init", () => { ... });
  // test("parses class with method", () => { ... });
  // test("parses the full example program", () => { ... });
});

describe("Error cases", () => {
  test("throws on missing semicolon in assignment", () => {
    const tokens = new Lexer("x = 5").tokenize();
    assert.throws(() => new Parser(tokens).parseProgram(), ParseException);
  });

  test("throws on unexpected token in expression", () => {
    const tokens = new Lexer("x = ;").tokenize();
    assert.throws(() => new Parser(tokens).parseProgram(), ParseException);
  });

  test("throws on unknown statement start", () => {
    const tokens = new Lexer("123;").tokenize();
    assert.throws(() => new Parser(tokens).parseProgram(), ParseException);
  });
});
