import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { Typechecker, TypeErrorException } from "../src/typechecker.js";

// helper: lex + parse + typecheck a full program string
function check(source) {
  const tokens = new Lexer(source).tokenize();
  const program = new Parser(tokens).parseProgram();
  new Typechecker().typecheck(program);
}

// helper: assert that typechecking throws a TypeErrorException
function checkThrows(source) {
  assert.throws(() => check(source), TypeErrorException);
}

describe("Expressions", () => {
  test("accepts integer literal", () => {
    check("println(1);");
  });

  test("accepts string literal", () => {
    check(`println("hello");`);
  });

  test("accepts boolean literal", () => {
    check("println(true);");
  });

  test("accepts arithmetic on ints", () => {
    check("println(1 + 2);");
    check("println(3 - 1);");
    check("println(2 * 4);");
    check("println(8 / 2);");
  });

  test("accepts logical AND on booleans", () => {
    check("println(true && false);");
  });

  test("accepts parenthesized expression", () => {
    check("println((1 + 2));");
  });

  test("accepts chained arithmetic", () => {
    check("println(1 + 2 * 3);");
  });

  test("rejects arithmetic on non-int left side", () => {
    checkThrows("println(true + 1);");
  });

  test("rejects arithmetic on non-int right side", () => {
    checkThrows(`println(1 + "hello");`);
  });

  test("rejects && on non-boolean left side", () => {
    checkThrows("println(1 && true);");
  });

  test("rejects && on non-boolean right side", () => {
    checkThrows("println(true && 0);");
  });

  test("rejects undefined variable", () => {
    checkThrows("println(y);");
  });

  test("rejects mixed types in flattened binary expressions", () => {
    checkThrows("println(1 + true && false);");
  });

});

describe("Statements", () => {
  test("accepts variable declaration with no initializer", () => {
    check("Int x;");
  });

  test("accepts typed declaration with matching initializer", () => {
    check("Int x = 5;");
    check("Boolean flag = true;");
  });

  test("rejects typed declaration with mismatched initializer type", () => {
    checkThrows("Int x = true;");
    checkThrows(`Boolean flag = "hello";`);
  });

  test("rejects unknown type in variable declaration", () => {
    checkThrows("Ghost x;");
  });

  test("accepts assignment", () => {
    check("Int x;\nx = 5;");
  });

  test("accepts comparison expression", () => {
    check("Boolean b; b = 1 < 2;");
  });

  test("rejects comparison with Boolean", () => {
    checkThrows("Boolean b; b = true < false;");
  });

  test("accepts equality with same types", () => {
    check("Boolean b; b = 1 == 1;");
  });

  test("rejects equality with mismatched types", () => {
    checkThrows('Boolean b; b = 1 == "one";');
  });

  test("accepts println with any type", () => {
    check(`println(1);`);
    check(`println("hello");`);
    check(`println(true);`);
  });

  test("accepts if with boolean condition", () => {
    check("if (true) { println(1); }");
  });

  test("accepts if/else with boolean condition", () => {
    check("if (true) { println(1); } else { println(2); }");
  });

  test("rejects if with non-boolean condition", () => {
    checkThrows("if (1) { println(1); }");
  });

  test("accepts while with boolean condition", () => {
    check("while (true) { break; }");
  });

  test("rejects while with non-boolean condition", () => {
    checkThrows("while (1) { break; }");
  });

  test("accepts bare return in void method", () => {
    check(`
      class Foo {
        init() {}
        method run() Void { return; }
      }
    `);
  });

  test("rejects bare return in non-void method", () => {
    checkThrows(`
      class Foo {
        init() {}
        method run() Int { return; }
      }
    `);
  });

  test("rejects return type mismatch", () => {
    checkThrows(`
      class Foo {
        init() {}
        method run() Int { return true; }
      }
    `);
  });

  test("rejects return outside of a method", () => {
    checkThrows("return 1;");
  });

  test("rejects missing return statement in non-void method", () => {
    checkThrows(`
      class Foo {
        init() {}
        method run() Int { 
          Int x;
          x = 5; 
          // Missing return statement here!
        }
      }
    `);
  });

});

describe("Classes", () => {
  test("accepts a class with fields and init", () => {
    check(`
      class Point {
        Int x;
        Int y;
        init(Int x, Int y) {
          this.x = x;
          this.y = y;
        }
      }
    `);
  });

  test("accepts a class with a method", () => {
    check(`
      class Counter {
        Int count;
        init(Int count) {
          this.count = count;
        }
        method getCount() Int {
          return this.count;
        }
      }
    `);
  });

  test("accepts this inside a method", () => {
    check(`
      class Foo {
        Int x;
        init(Int x) { this.x = x; }
        method getX() Int { return this.x; }
      }
    `);
  });

  test("rejects this outside a class", () => {
    checkThrows("x = this;");
  });

  test("accepts new with correct arg types", () => {
    check(`
      class Dog {
        init(Int age) {}
      }
      Dog d;
      d = new Dog(3);
    `);
  });

  test("rejects new with wrong arg type", () => {
    checkThrows(`
      class Dog {
        init(Int age) {}
      }
      Dog d;
      d = new Dog(true);
    `);
  });

  test("rejects new with wrong arg count", () => {
    checkThrows(`
      class Dog {
        init(Int age) {}
      }
      Dog d;
      d = new Dog(1, 2);
    `);
  });

  test("rejects unknown class in new", () => {
    checkThrows("x = new Ghost();");
  });

  test("rejects duplicate class definition", () => {
    checkThrows(`
      class Foo { init() {} }
      class Foo { init() {} }
    `);
  });

  test("rejects extends on unknown class", () => {
    checkThrows(`
      class Dog extends Animal { init() {} }
    `);
  });

  test("accepts method call on class instance", () => {
    check(`
      class Greeter {
        init() {}
        method greet() Int { return 1; }
      }
      Greeter g;
      g = new Greeter();
      Int result;
      result = g.greet();
    `);
  });

  test("rejects method call with wrong arg type", () => {
    checkThrows(`
      class Adder {
        init() {}
        method add(Int a, Int b) Int { return a; }
      }
      Adder a;
      a = new Adder();
      Int result;
      result = a.add(1, true);
    `);
  });

  test("rejects method call on non-class type", () => {
    checkThrows(`
      Int x;
      x = 5;
      x.foo();
    `);
  });

  test("rejects unknown method on class", () => {
    checkThrows(`
      class Foo { init() {} }
      Foo f;
      f = new Foo();
      f.missing();
    `);
  });

  test("accepts field access on class instance", () => {
    check(`
      class Box {
        Int value;
        init(Int value) { this.value = value; }
      }
      Box b;
      b = new Box(10);
      Int v;
      v = b.value;
    `);
  });

  test("rejects field access on non-class type", () => {
    checkThrows(`
      Int x;
      x = 5;
      x.value;
    `);
  });

  test("rejects unknown field on class", () => {
    checkThrows(`
      class Foo { init() {} }
      Foo f;
      f = new Foo();
      Int x;
      x = f.missing;
    `);
  });

  test("accepts field initializer with correct type", () => {
    check(`
      class Foo {
        Int x = 5;
        Boolean flag = true;
        init() {}
      }
    `);
  });

  test("rejects field initializer with wrong type", () => {
    checkThrows(`
      class Foo {
        Int x = true;
        init() {}
      }
    `);
  });

  test("rejects unknown type in method parameter", () => {
    checkThrows(`
      class Foo {
        init() {}
        method run(Ghost g) Void { return; }
      }
    `);
  });

  test("rejects unknown return type on method", () => {
    checkThrows(`
      class Foo {
        init() {}
        method run() Ghost { return; }
      }
    `);
  });

  test("rejects duplicate field definitions in the same class", () => {
    checkThrows(`
      class BadBox {
        Int x;
        String x;
        init() {}
      }
    `);
  });

  test("rejects duplicate method definitions in the same class", () => {
    checkThrows(`
      class BadMath {
        init() {}
        method add() Int { return 1; }
        method add() Int { return 2; }
      }
    `);
  });

});

describe("Inheritance", () => {
  test("accepts subclass extending superclass", () => {
    check(`
      class Animal {
        init() {}
        method speak() Void { return; }
      }
      class Dog extends Animal {
        init() { super.speak(); }
      }
    `);
  });

  test("accepts super method call", () => {
    check(`
      class Animal {
        init() {}
        method speak() Void { return; }
      }
      class Dog extends Animal {
        init() {}
        method speak() Void { super.speak(); }
      }
    `);
  });

  test("rejects super in a class with no superclass", () => {
    checkThrows(`
      class Foo {
        init() {}
        method run() Void { super.run(); }
      }
    `);
  });

  test("accepts inherited method call on subclass instance", () => {
    check(`
      class Animal {
        init() {}
        method speak() Void { return; }
      }
      class Dog extends Animal {
        init() {}
      }
      Dog d;
      d = new Dog();
      d.speak();
    `);
  });

  test("accepts inherited field access on subclass instance", () => {
    check(`
      class Animal {
        Int age;
        init(Int age) { this.age = age; }
      }
      class Dog extends Animal {
        init(Int age) { this.age = age; }
      }
      Dog d;
      d = new Dog(3);
      Int a;
      a = d.age;
    `);
  });

  test("accepts assigning subclass to superclass variable", () => {
    check(`
      class Animal { init() {} }
      class Dog extends Animal { init() {} }
      Animal a;
      a = new Dog();
    `);
  });
  

  test("rejects cyclic inheritance loops", () => {
    checkThrows(`
      class A extends B { init() {} }
      class B extends A { init() {} }
    `);
  });

  test("rejects mixed types in flattened binary expressions", () => {
    checkThrows("println(1 + true && false);");
  });

  test("accepts == between subtype and supertype", () => {
    check(`
      class Animal { init() {} }
      class Dog extends Animal { init() {} }
      Dog d;
      d = new Dog();
      Animal a;
      a = new Animal();
      Boolean same;
      same = d == a;
    `);
  });

  test("rejects == between unrelated class types", () => {
    checkThrows(`
      class Cat { init() {} }
      class Dog { init() {} }
      Cat c;
      c = new Cat();
      Dog d;
      d = new Dog();
      Boolean same;
      same = c == d;
    `);
  });

  test("accepts break in nested block inside while loop", () => {
    check(`
      while (true) {
        { break; }
      }
    `);
  });

  test("accepts assigning to inherited instance variables", () => {
    check(`
      class Parent {
        Int x;
        init() {}
      }
      class Child extends Parent {
        Int y;
        init() {}
        method setup() Void {
          this.x = 10; // Inherited instance variable
          this.y = 20; // Local instance variable
          return;
        }
      }
    `);
  });

  
  test("rejects invalid method overrides with mismatched return types", () => {
    checkThrows(`
      class Parent {
        init() {}
        method fetch() Int { return 1; }
      }
      class Child extends Parent {
        init() {}
        // Invalid override: changes return type from Int to String
        method fetch() String { return "hello"; }
      }
    `);
  });


  test("rejects method override with parameter count mismatch", () => {
    checkThrows(`
      class Parent {
        init() {}
        method process(Int a) Void { return; }
      }
      class Child extends Parent {
        init() {}
        // Invalid override: takes 2 params instead of 1
        method process(Int a, Int b) Void { return; }
      }
    `);
  });

  test("rejects method override with parameter type mismatch", () => {
    checkThrows(`
      class Parent {
        init() {}
        method process(Int a) Void { return; }
      }
      class Child extends Parent {
        init() {}
        // Invalid override: changes param type from Int to Boolean
        method process(Boolean a) Void { return; }
      }
    `);
  });

  test("rejects a class extending itself directly", () => {
    checkThrows("class Foo extends Foo { init() {} }");
  });

  test("rejects simple cyclic inheritance", () => {
    checkThrows(`
      class Foo extends Bar { init() {} }
      class Bar extends Baz { init() {} }
      class Baz extends Foo { init() {} }
    `);
  });
  test("accepts simple valid method override", () => {
    check(`
      class Foo { init() {} method ping() Void { return; } }
      class Bar extends Foo { init() {} method ping() Void { return; } }
    `);
  });
});



describe("Full programs", () => {
  test("typechecks the animal example program", () => {
    check(`
      class Animal {
        String name;
        init(String name) {
          this.name = name;
        }
        method speak() Void {
          println(this.name);
          return;
        }
      }
      class Dog extends Animal {
        init(String name) {
          this.name = name;
        }
        method speak() Void {
          println(this.name);
          return;
        }
      }
      Animal a;
      a = new Animal("generic");
      Dog d;
         d = new Dog("rex");
      a.speak();
      d.speak();
    `);
  });
});
