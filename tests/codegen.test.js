import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { CodeGenerator } from "../src/codegen.js";

function compile(source) {
    const tokens = new Lexer(source).tokenize();
    const ast = new Parser(tokens).parseProgram();
    return new CodeGenerator().generateProgram(ast);
}

function compileStmt(source) {
    const tokens = new Lexer(source).tokenize();
    const stmt = new Parser(tokens).parseStmt(0).result;
    return new CodeGenerator().generateStmt(stmt, 0);
}

function compileExpr(exprSource) {
    return compileStmt(`x = ${exprSource};`).replace(/^x = /, "").replace(/;$/, "");
}

describe("Expressions", () => {
    test("generates integer literal", () => {
        assert.equal(compileExpr("42"), "42");
    });
    test("generates string literal", () => {
        assert.equal(compileExpr('"hello"'), '"hello"');
    });
    test("generates boolean true", () => {
        assert.equal(compileExpr("true"), "true");
    });
    test("generates boolean false", () => {
        assert.equal(compileExpr("false"), "false");
    });
    test("generates identifier", () => {
        assert.equal(compileExpr("myVar"), "myVar");
    });
    test("generates addition", () => {
        assert.equal(compileExpr("1 + 2"), "1 + 2");
    });
    test("generates subtraction", () => {
        assert.equal(compileExpr("5 - 3"), "5 - 3");
    });
    test("generates multiplication", () => {
        assert.equal(compileExpr("4 * 2"), "4 * 2");
    });    
    test("generates division", () => {
        assert.equal(compileExpr("8 / 2"), "8 / 2");
    });
    test("generates logical AND", () => {
        assert.equal(compileExpr("true && false"), "true && false");
    });
    test("generates parenthesized expression", () => {
        assert.equal(compileExpr("(1 + 2)"), "(1 + 2)");
    });
    test("generates this expression", () => {
        assert.equal(compileExpr("this"), "this");
    });
    test("generates new expression with no args", () => {
        assert.equal(compileExpr("new Dog()"), "new Dog()");
    });
    test("generates new expression with args", () => {
        assert.equal(compileExpr("new Dog(1, 2)"), "new Dog(1, 2)");
    });    
    test("generates method call with no args", () => {
        assert.equal(compileExpr("obj.speak()"), "obj.speak()");
    });
    test("generates method call with args", () => {
        assert.equal(compileExpr("obj.method(1, 2)"), "obj.method(1, 2)");
    });
    test("generates field access", () => {
        assert.equal(compileExpr("obj.field"), "obj.field");
    });
    test("generates this.field access", () => {
        assert.equal(compileExpr("this.name"), "this.name");
    });
});

describe("Statements", () => {
    test("generates variable declaration", () => {
        assert.equal(compileStmt("Int x;"), "let x;");
    });
  
    test("generates Boolean variable declaration", () => {
        assert.equal(compileStmt("Boolean flag;"), "let flag;");
    });
  
    test("generates assignment statement", () => {
        assert.equal(compileStmt("x = 5;"), "x = 5;");
    });
  
    test("generates return with value", () => {
        assert.equal(compileStmt("return 42;"), "return 42;");
    });
  
    test("generates return void (bare return)", () => {
        assert.equal(compileStmt("return;"), "return;");
    });
  
    test("generates println as console.log", () => {
        assert.equal(compileStmt('println("hi");'), 'console.log("hi");');
    });
  
    test("generates if statement without else", () => {
        const out = compileStmt("if (x) { println(x); }");
        assert.ok(out.includes("if (x) {"));
        assert.ok(out.includes("console.log(x);"));
        assert.ok(!out.includes("else"));
    });
  
    test("generates if/else statement", () => {
        const out = compileStmt("if (x) { println(x); } else { println(0); }");
        assert.ok(out.includes("if (x) {"));
        assert.ok(out.includes("} else {"));
    });
  
    test("generates while statement", () => {
        const out = compileStmt("while (x) { println(x); }");
        assert.ok(out.includes("while (x) {"));
        assert.ok(out.includes("console.log(x);"));
    });
  
    test("generates break inside while", () => {
        const out = compileStmt("while (x) { break; }");
        assert.ok(out.includes("break;"));
    });
});

describe("Classes", () => {
    test("generates empty class", () => {
        const out = compile("class Foo {}");
        assert.ok(out.includes("class Foo {"));
    });
    
    test("generates class with extends", () => {
        const out = compile("class Dog extends Animal {}");
        assert.ok(out.includes("class Dog extends Animal {"));
    });
    
    test("generates class with empty init as constructor", () => {
        const out = compile("class Foo { init() {} }");
        assert.ok(out.includes("constructor() {"));
    });
    
    test("generates constructor with params, erasing type annotations", () => {
        const out = compile("class Foo { init(Int x, Int y) {} }");
        assert.ok(out.includes("constructor(x, y) {"));
        assert.ok(!out.includes("Int"));
    });
    
    test("generates method with return type erased", () => {
        const out = compile("class Foo { method speak() Void {} }");
        assert.ok(out.includes("speak() {"));
        assert.ok(!out.includes("Void"));
    });
    
    test("generates super() call in constructor body", () => {
        const out = compile("class Cat extends Animal { init() { super(); } }");
        assert.ok(out.includes("super()"));
    });
});

describe("Full programs", () => {
   test("compiles the animal example program", () => {
    const src = `
    class Animal {
        init() {}
        method speak() Void { return println(0); }
    }
    class Cat extends Animal {
        init() { super(); }
        method speak() Void { return println(1); }
    }
      
    class Dog extends Animal {
        init() { super(); }
        method speak() Void { return println(2); }
    } 
      Animal cat;
    Animal dog;
    cat = new Cat();
    dog = new Dog();
    cat.speak();
    dog.speak();
    `;
        const out = compile(src);
        assert.ok(out.includes("class Animal {"));
        assert.ok(out.includes("class Cat extends Animal {"));
        assert.ok(out.includes("class Dog extends Animal {"));

        assert.ok(!out.includes("Animal cat"));
        assert.ok(!out.includes("Animal dog"));

        assert.ok(out.includes("let cat;"));
        assert.ok(out.includes("let dog;"));

        assert.ok(out.includes("cat = new Cat();"));
        assert.ok(out.includes("dog = new Dog();"));

        assert.ok(out.includes("cat.speak();"));
        assert.ok(out.includes("dog.speak();"));
   });
});