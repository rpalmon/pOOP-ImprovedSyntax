import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { Lexer } from "../src/lexer.js";
import { Parser, ParseException } from "../src/parser.js";
import {
  IntegerExpr,
  IdentifierExpr,
  BinaryExpr,
  BooleanExpr,
  ThisExpr,
  SuperExpr,
  NewExpr,
  MethodCallExpr,
  FieldAccessExpr,
  VarDeclStmt,
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
describe("Expressions", () => {
  test("parses an integer literal", () => {
    const tokens = new Lexer("x = 42;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.expr instanceof IntegerExpr);
    assert.equal(stmt.expr.value, 42);
  });

  test("parses an identifier expression", () => {
    const tokens = new Lexer("x = y;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof AssignStmt);
    assert.ok(stmt.expr instanceof IdentifierExpr);
    assert.equal(stmt.expr.name, "y");
  });

  test("parses addition", () => {
    const tokens = new Lexer("x = 1 + 2;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.expr instanceof BinaryExpr);
    assert.equal(stmt.expr.op, "+");
  });

  test("parses subtraction", () => {
    const tokens = new Lexer("x = 5 - 3;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.expr instanceof BinaryExpr);
    assert.equal(stmt.expr.op, "-");
  });

  test("parses multiplication", () => {
    const tokens = new Lexer("x = 4 * 2;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.expr instanceof BinaryExpr);
    assert.equal(stmt.expr.op, "*");
  });

  test("parses division", () => {
    const tokens = new Lexer("x = 8 / 2;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt.expr instanceof BinaryExpr);
    assert.equal(stmt.expr.op, "/");
  });

  test("parses left-associative chained addition", () => {
    const tokens = new Lexer("x = 1 + 2 + 3;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    // Should be ((1 + 2) + 3)
    assert.ok(stmt.expr instanceof BinaryExpr);
    assert.ok(stmt.expr.left instanceof BinaryExpr);
    assert.equal(stmt.expr.op, "+");
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
    const classDef = new Parser(tokens).parseStmt(0).result;

    assert.ok(classDef.expr instanceof BinaryExpr);
    assert.equal(classDef.expr.op, "&&");
  });
  // test("parses false literal", () => { ... });
  test("parses logical AND", () => {
    const tokens = new Lexer("x = true && false;").tokenize();
    const classDef = new Parser(tokens).parseStmt(0).result;

    assert.ok(classDef.expr instanceof BinaryExpr);
    assert.equal(classDef.expr.op, "&&");
  });
  // test("parses new object instantiation", () => { ... });
  test("parses parenthesized expression", () => {
    const tokens = new Lexer("x = (1 + 2);").tokenize();
    const classDef = new Parser(tokens).parseStmt(0).result;

    assert.ok(classDef instanceof AssignStmt);
  });
  // test("parses this expression", () => { ... });
  test("parses super expression", () => {
    const tokens = new Lexer("x = super;").tokenize();
    const classDef = new Parser(tokens).parseStmt(0).result;

    assert.ok(classDef instanceof AssignStmt);
    assert.ok(classDef.expr instanceof SuperExpr);
  });
  // test("parses dot access", () => { ... });
  test("parses method call", () => {
    const tokens = new Lexer("x = obj.method();").tokenize();
    const classDef = new Parser(tokens).parseStmt(0).result;

    assert.ok(classDef instanceof AssignStmt);
    assert.ok(classDef.expr instanceof MethodCallExpr);
  });
  // test("parses field access", () => { ... });
   test("parses field access", () => {
    const tokens = new Lexer("x = obj.field;").tokenize();
    const classDef = new Parser(tokens).parseStmt(0).result;

    assert.ok(classDef instanceof AssignStmt);
    assert.ok(classDef.expr instanceof FieldAccessExpr);
  });
  // test("parses method call", () => { ... });
  test("parses method call with arguments", () => {
    const tokens = new Lexer("x = obj.method(arg1, arg2);").tokenize();
    const classDef = new Parser(tokens).parseStmt(0).result;

    assert.ok(classDef instanceof AssignStmt);
    assert.ok(classDef.expr instanceof MethodCallExpr);
  });

});

describe("Statements", () => {
  test("parses a variable declaration", () => {
    // TODO: fix TokenType.INT -> INT_TYPE bug first, then uncomment
    const tokens = new Lexer("Int x;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof VarDeclStmt);
    assert.equal(stmt.varType, "Int");
    assert.equal(stmt.name, "x");
  });

  test("parses an assignment statement", () => {
    const tokens = new Lexer("x = 5;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;
    assert.ok(stmt instanceof AssignStmt);
    assert.equal(stmt.target.name, "x");
  });

  test("parses multiple statements", () => {
    const tokens = new Lexer("x = 1;\ny = 2;").tokenize();
    const parser = new Parser(tokens)

    const firstStmt = parser.parseStmt(0);
    const secondStmt = parser.parseStmt(firstStmt.nextPos);

    assert.ok(firstStmt.result instanceof AssignStmt);
    assert.ok(secondStmt.result instanceof AssignStmt);
    assert.equal(firstStmt.result.target.name, "x");
    assert.equal(secondStmt.result.target.name, "y");
  });

  test("parses empty program", () => {
    const tokens = new Lexer("").tokenize();
    const program = new Parser(tokens).parseProgram();

    assert.ok(program instanceof Program);
    assert.equal(program.classDefs.length, 0);
  });

  // TODO: add as you implement each statement type
  // test("parses return statement", () => { ... });
  test("parses return statement", () => {
    const tokens = new Lexer("return 5;").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof ReturnStmt);
    assert.ok(stmt.expr instanceof IntegerExpr);
    assert.equal(stmt.expr.value, 5);
  });
  // test("parses println statement", () => { ... });
  test("parses println statement", () => {
    const tokens = new Lexer("println(x);").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof PrintlnStmt);
    assert.ok(stmt.expr instanceof IdentifierExpr);
    assert.equal(stmt.expr.name, "x");
  });
  // test("parses if statement", () => { ... });
  test("parses if statement", () => {
    const tokens = new Lexer("if (x) { println(x); }").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof IfStmt);
    assert.ok(stmt.condition instanceof IdentifierExpr);
    assert.equal(stmt.condition.name, "x");
    assert.equal(stmt.thenBranch.length, 1);
    assert.ok(stmt.thenBranch[0] instanceof PrintlnStmt);
  });
  // test("parses if/else statement", () => { ... });
  test("parses if/else statement", () => {
    const tokens = new Lexer("if (x) { println(x); } else { println(0); }").tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;

    assert.ok(stmt instanceof IfStmt);
    assert.ok(stmt.condition instanceof IdentifierExpr);
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
    assert.ok(stmt.condition instanceof IdentifierExpr);
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
    assert.ok(stmt.expr instanceof SuperExpr);
  });
});

describe("Classes", () => {
  // TODO: add as you implement class parsing
  // test("parses empty class", () => { ... });
  test("parses empty class", () => {
    const tokens = new Lexer("class Foo {}").tokenize();
    const stmt = new Parser(tokens).parseClass(0).result;

    assert.ok(stmt instanceof ClassDef);
    assert.equal(stmt.name, "Foo");
  });
  // test("parses class with extends", () => { ... });
  test("parses class with extends", () => {
    const tokens = new Lexer("class Foo extends Bar {}").tokenize();
    const stmt = new Parser(tokens).parseClass(0).result;

    assert.ok(stmt instanceof ClassDef);
    assert.equal(stmt.name, "Foo");
    assert.equal(stmt.superclass, "Bar");
  });
  // test("parses class with init", () => { ... });
  test("parses class with init", () => {
    const tokens = new Lexer("class Foo { init() {} }").tokenize();
    const stmt = new Parser(tokens).parseClass(0).result;

    assert.ok(stmt instanceof ClassDef);
    assert.equal(stmt.name, "Foo");
    assert.ok(stmt.init instanceof InitDef);
  });
  // test("parses class with method", () => { ... });
  test("parses class with method", () => {
    const tokens = new Lexer("class Foo { method() {} }").tokenize();
    const stmt = new Parser(tokens).parseClass(0).result;

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
      } 
    }

    class Dog extends Animal {
      speak() {
        println(this.name + " barks.");
      } 
    }`;

    const tokens = new Lexer(source).tokenize();
    const program = new Parser(tokens).parseProgram();

    assert.ok(program instanceof Program);
    assert.equal(program.classDefs.length, 2);
    assert.ok(program.classDefs[0] instanceof ClassDef);
    assert.ok(program.classDefs[1] instanceof ClassDef);
  });
});

describe("Error cases", () => {
  test("throws on missing semicolon in assignment", () => {
    const tokens = new Lexer("x = 5").tokenize();
    assert.throws(() => new Parser(tokens).parseStmt(0), ParseException);
  });

  test("throws on unexpected token in expression", () => {
    const tokens = new Lexer("x = ;").tokenize();
    assert.throws(() => new Parser(tokens).parseStmt(0), ParseException);
  });

  test("throws on unknown statement start", () => {
    const tokens = new Lexer("123;").tokenize();
    assert.throws(() => new Parser(tokens).parseStmt(0), ParseException);
  });
});