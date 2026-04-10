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

// --- Operators ---
export class PlusOp { type = "Plus"; }
export class MinusOp { type = "Minus"; }
export class StarOp { type = "Star"; }
export class SlashOp { type = "Slash"; }

// --- AST Statements ---
export class VarDecStmt {
  constructor(dataType, name) {
    this.dataType = dataType; // e.g., 'Int', 'Boolean'
    this.name = name;
  }
}

export class AssignStmt {
  constructor(name, exp) {
    this.name = name;
    this.exp = exp;
  }
}

export class Program {
  constructor(stmts) { 
    this.stmts = stmts; 
  }
}

export class IntegerLiteral {
  //kind: IntegerLiteral
  //value: number
  constructor(value) {
    this.value = value;
  }
}

export class BooleanLiteral {
  //kind: BooleanLiteral
  //value: boolean
  constructor(value) {
    this.value = value;
  }
}

export class AndOp {
  //kind: AndOp
  constructor () {}
}

export class NewExp {
  //kind: NewExp
  //className: string
  constructor(className) {
    this.className = className;
  }
}

export class ThisExp {
  //kind: ThisExp
  constructor () {}
}

export class SuperExp {
  //kind: SuperExp
  constructor () {}
}

export class MethodCallExp {
  //kind: MethodCallExp
  //receiver: Exp
  //methodName: string
  //args: Exp[]
  constructor(receiver, methodName, args) {
    this.receiver = receiver;
    this.methodName = methodName;
    this.args = args;
  }
}

export class FieldAccessExp {
  //kind: FieldAccessExp
  //receiver: Exp
  //fieldName: string
  constructor(receiver, fieldName) {
    this.receiver = receiver;
    this.fieldName = fieldName;
  }
}

// --- AST Statements (to be implemented) ---
export class ReturnStmt {
  //kind: ReturnStmt
  //exp: Exp (optional — void return has no exp)
  constructor(exp) {
    this.exp = exp;
  }
}

export class PrintlnStmt {
  //kind: PrintlnStmt
  //exp: Exp
  constructor(exp) {
    this.exp = exp;
  }
}

export class IfStmt {
  //kind: IfStmt
  //condition: Exp
  //trueBranch: Stmt[]
  //falseBranch: Stmt[] (optional)
  constructor(condition, trueBranch, falseBranch) {
    this.condition = condition;
    this.trueBranch = trueBranch;
    this.falseBranch = falseBranch;
  }
}

export class WhileStmt {
  //kind: WhileStmt
  //condition: Exp
  //body: Stmt[]
  constructor(condition, body) {
    this.condition = condition;
    this.body = body;
  }
}

export class BreakStmt {
  //kind: BreakStmt
  constructor() {}
}

// --- AST Class-level nodes (to be implemented) ---
export class ClassDef {
  //kind: ClassDef
  //name: string
  //superclass: string | null
  //init: InitDef | null
  //methods: MethodDef[]
  constructor(name, superclass, init, methods) {
    this.name = name;
    this.superclass = superclass;
    this.init = init;
    this.methods = methods;
  }
}

export class InitDef {
  //kind: InitDef
  //params: { type: string, name: string }[]
  //body: Stmt[]
  constructor(params, body) {
    this.params = params;
    this.body = body;
  }
}

export class MethodDef {
  //kind: MethodDef
  //name: string
  //params: { type: string, name: string }[]
  //returnType: string
  //body: Stmt[]
  constructor(name, params, returnType, body) {
    this.name = name;
    this.params = params;
    this.returnType = returnType;
    this.body = body;
  }
}