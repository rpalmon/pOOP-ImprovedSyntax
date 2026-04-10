// ast.js

export class ParseResult {
  constructor(result, nextPos) {
    this.result = result;
    this.nextPos = nextPos;
  }
}

export class ParseException extends Error {
  constructor(message) {
    super(message);
    this.name = "ParseException";
  }
}

// --- AST Expressions ---
export class IdentifierExp {
  constructor(name) { this.name = name; }
}

export class IntegerExp {
  constructor(value) { this.value = value; }
}

export class StringExp {
  constructor(value) { this.value = value; }
}

export class ParenExp {
  constructor(exp) { this.exp = exp; }
}

export class BinopExp {
  constructor(left, op, right) {
    this.left = left;
    this.op = op;
    this.right = right;
  }
}

export class BooleanLiteral {
  constructor(value) { this.value = value; }
}

export class ThisExp { }

export class SuperExp { }

export class NewExp {
  constructor(className, args) {
    this.className = className;
    this.args = args;
  }
}

export class MethodCallExp {
  constructor(receiver, methodName, args) {
    this.receiver = receiver;
    this.methodName = methodName;
    this.args = args;
  }
}

export class FieldAccessExp {
  constructor(receiver, fieldName) {
    this.receiver = receiver;
    this.fieldName = fieldName;
  }
}

// --- Operators ---
export class PlusOp { type = "Plus"; }
export class MinusOp { type = "Minus"; }
export class StarOp { type = "Star"; }
export class SlashOp { type = "Slash"; }
export class AndOp { type = "And"; }

// --- AST Statements ---
export class VarDecStmt {
  constructor(dataType, name) {
    this.dataType = dataType;
    this.type = dataType;
    this.name = name;
  }
}

export class AssignStmt {
  constructor(name, exp) {
    this.name = name;
    this.exp = exp;
  }
}

export class ReturnStmt {
  constructor(exp) { this.exp = exp; }
}

export class PrintlnStmt {
  constructor(exp) { this.exp = exp; }
}

export class IfStmt {
  constructor(condition, trueBranch, falseBranch) {
    this.condition = condition;
    this.trueBranch = trueBranch;
    this.falseBranch = falseBranch;
    this.thenBranch = trueBranch;
    this.elseBranch = falseBranch;
  }
}

export class WhileStmt {
  constructor(condition, body) {
    this.condition = condition;
    this.body = body;
  }
}

export class BreakStmt { }

export class Program {
  constructor(stmts) {
    this.stmts = stmts;
  }
}

// --- AST Class-level nodes ---
export class ClassDef {
  constructor(name, superclass, init, methods) {
    this.name = name;
    this.superclass = superclass;
    this.init = init;
    this.methods = methods;
  }
}

export class InitDef {
  constructor(params, body) {
    this.params = params;
    this.body = body;
  }
}

export class MethodDef {
  constructor(name, params, returnType, body) {
    this.name = name;
    this.params = params;
    this.returnType = returnType;
    this.body = body;
  }
}

export class Param {
  constructor(type, name) {
    this.type = type;
    this.name = name;
  }
}


