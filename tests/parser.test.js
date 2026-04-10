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
  AndOp,
  BooleanLiteral,
  ThisExp,
  SuperExp,
  NewExp,
  MethodCallExp,
  FieldAccessExp,
  VarDecStmt,
  AssignStmt,
  ReturnStmt,
  PrintlnStmt,
  IfStmt,
  WhileStmt,
  BreakStmt,
  ClassDef,
  InitDef,
  MethodDef,
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
  test("parses boolean literals in expressions",() => {
    const tokens = new Lexer("x = true && false;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof AndOp);
  });
  // test("parses false literal", () => { ... });
  test("parses logical AND", () => {
    const tokens = new Lexer("x = true && false;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.exp instanceof BinopExp);
    assert.ok(stmt.exp.op instanceof AndOp);
  });
  // test("parses new object instantiation", () => { ... });
  test("parses parenthesized expression", () => {
    const tokens = new Lexer("x = (1 + 2);").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
  });
  // test("parses this expression", () => { ... });
  test("parses super expression", () => {
    const tokens = new Lexer("x = super;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof SuperExp);
  });
  // test("parses dot access", () => { ... });
  test("parses method call", () => {
    const tokens = new Lexer("x = obj.method();").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof MethodCallExp);
  });
  // test("parses field access", () => { ... });
   test("parses field access", () => {
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
    const program = parse("Int x;");
    assert.equal(program.stmts.length, 1);
    assert.ok(program.stmts[0] instanceof VarDecStmt);
    assert.equal(program.stmts[0].type, "Int");
    assert.equal(program.stmts[0].name, "x");
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
  test("parses return statement", () => {
    const tokens = new Lexer("return 5;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof ReturnStmt);
    assert.ok(stmt.exp instanceof IntegerExp);
    assert.equal(stmt.exp.value, 5);
  });
  // test("parses println statement", () => { ... });
  test("parses println statement", () => {
    const tokens = new Lexer("println(x);").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof PrintlnStmt);
    assert.ok(stmt.exp instanceof IdentifierExp);
    assert.equal(stmt.exp.name, "x");
  });
  // test("parses if statement", () => { ... });
  test("parses if statement", () => {
    const tokens = new Lexer("if (x) { println(x); }").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof IfStmt);
    assert.ok(stmt.condition instanceof IdentifierExp);
    assert.equal(stmt.condition.name, "x");
    assert.equal(stmt.thenBranch.length, 1);
    assert.ok(stmt.thenBranch[0] instanceof PrintlnStmt);
  });
  // test("parses if/else statement", () => { ... });
  test("parses if/else statement", () => {
    const tokens = new Lexer("if (x) { println(x); } else { println(0); }").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof IfStmt);
    assert.ok(stmt.condition instanceof IdentifierExp);
    assert.equal(stmt.condition.name, "x");
    assert.equal(stmt.thenBranch.length, 1);
    assert.ok(stmt.thenBranch[0] instanceof PrintlnStmt);
    assert.equal(stmt.elseBranch.length, 1);
    assert.ok(stmt.elseBranch[0] instanceof PrintlnStmt);
  });
  // test("parses while statement", () => { ... });
  test("parses while statement", () => {
    const tokens = new Lexer("while (x) { println(x); }").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof WhileStmt);
    assert.ok(stmt.condition instanceof IdentifierExp);
    assert.equal(stmt.condition.name, "x");
    assert.equal(stmt.body.length, 1);
    assert.ok(stmt.body[0] instanceof PrintlnStmt);
  });
  // test("parses break statement", () => { ... });
  test("parses break statement", () => {
    const tokens = new Lexer("while (x) { break; }").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof WhileStmt);
    assert.equal(stmt.body.length, 1);
    assert.ok(stmt.body[0] instanceof BreakStmt);
  });
  // test("parses super call", () => { ... });
  test("parses super call", () => {
    const tokens = new Lexer("x = super.method();").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.exp instanceof SuperExp);
  });
});

describe("Classes", () => {
  // TODO: add as you implement class parsing
  // test("parses empty class", () => { ... });
  test("parses empty class", () => {
    const tokens = new Lexer("class Foo {}").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof ClassDef);
    assert.equal(stmt.name, "Foo");
  });
  // test("parses class with extends", () => { ... });
  test("parses class with extends", () => {
    const tokens = new Lexer("class Foo extends Bar {}").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof ClassDef);
    assert.equal(stmt.name, "Foo");
    assert.equal(stmt.superclass, "Bar");
  });
  // test("parses class with init", () => { ... });
  test("parses class with init", () => {
    const tokens = new Lexer("class Foo { init() {} }").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof ClassDef);
    assert.equal(stmt.name, "Foo");
    assert.ok(stmt.init instanceof InitDef);
  });
  // test("parses class with method", () => { ... });
  test("parses class with method", () => {
    const tokens = new Lexer("class Foo { method() {} }").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof ClassDef);
    assert.equal(stmt.name, "Foo");
    assert.equal(stmt.methods.length, 1);
    assert.ok(stmt.methods[0] instanceof MethodDef);
  });
  // test("parses the full example program", () => { ... });
    test("parses the full example program", () => {
    const source = `class Animal {
  init(name) {
    this.name = name;
  }

  speak() {
    println(this.name + " makes a noise.");
  } }

class Dog extends Animal {
  speak() {
    println(this.name + " barks.");
  } }

let dog = new Dog("Rex");
dog.speak();`;

    const tokens = new Lexer(source).tokenize();
    const program = new Parser(tokens).parseProgram();

    assert.ok(program instanceof Program);
    assert.equal(program.stmts.length, 3);
    assert.ok(program.stmts[0] instanceof ClassDef);
    assert.ok(program.stmts[1] instanceof ClassDef);
    assert.ok(program.stmts[2] instanceof VarDecStmt);
  });
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
