import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { TypeChecker, TypeCheckException } from "../src/typechecker.js";

function check(source) {
  const tokens = new Lexer(source).tokenize();
  const program = new Parser(tokens).parseProgram();
  return new TypeChecker().checkProgram(program);
}

describe("TypeChecker - variables", () => {
    test("accepts Int variable declaration", () => {
        assert.doesNotThrow(() => check("Int x;"));
    });
    
    test("accepts Boolean variable declaration", () => {
        assert.doesNotThrow(() => check("Boolean flag;"));
    });
    
    test("accepts class-name variable declaration", () => {
        assert.doesNotThrow(() => check("Animal pet;"));
    });
    
    test("rejects assignment to undefined variable", () => {
        assert.throws(() => check("x = 5;"), TypeCheckException);
    });
    
    test("accepts assignment with matching Int type", () => {
        assert.doesNotThrow(() => check("Int x; x = 5;"));
    });
    
    test("rejects assignment with wrong type", () => {
        assert.throws(() => check("Int x; x = true;"), TypeCheckException);
    });
    
    test("rejects duplicate variable declaration", () => {
        assert.throws(() => check("Int x; Boolean x;"), TypeCheckException);
    });
    
    test("rejects use of undefined variable in expression", () => {
        assert.throws(() => check("Int x; x = y + 1;"), TypeCheckException);
    });
    
    test("accepts comparison expression", () => {
        assert.doesNotThrow(() => check("Boolean b; b = 1 < 2;"));
    });
    
    test("rejects comparison with Boolean", () => {
        assert.throws(() => check("Boolean b; b = true < false;"), TypeCheckException);
    });
    
    test("accepts equality with same types", () => {
        assert.doesNotThrow(() => check("Boolean b; b = 1 == 1;"));
    });
    
    test("rejects equality with mismatched types", () => {
        assert.throws(() => check('Boolean b; b = 1 == "one";'), TypeCheckException);
    });
});

describe("TypeChecker - expressions", () => {
  test("accepts integer arithmetic", () => {
    assert.doesNotThrow(() => check("Int x; x = 1 + 2 * 3;"));
  });

  test("rejects arithmetic with Boolean", () => {
    assert.throws(() => check("Int x; x = true + 1;"), TypeCheckException);
  });

  test("accepts Boolean AND", () => {
    assert.doesNotThrow(() => check("Boolean flag; flag = true && false;"));
  });

  test("rejects AND with Int", () => {
    assert.throws(() => check("Boolean flag; flag = 1 && true;"), TypeCheckException);
  });

  test("accepts println with primitive expression", () => {
    assert.doesNotThrow(() => check('println("hello");'));
  });
});

describe("TypeChecker - control flow", () => {
  test("accepts if with Boolean condition", () => {
    assert.doesNotThrow(() => check("if (true) { println(1); }"));
  });

  test("rejects if with non-Boolean condition", () => {
    assert.throws(() => check("if (1) { println(1); }"), TypeCheckException);
  });

  test("accepts while with Boolean condition", () => {
    assert.doesNotThrow(() => check("while (true) { break; }"));
  });

  test("rejects while with non-Boolean condition", () => {
    assert.throws(() => check("while (1) { break; }"), TypeCheckException);
  }); 
});