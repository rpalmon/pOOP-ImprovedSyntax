// ast.js

// --- AST Expressions ---
export class IdentifierExpr {
  constructor(name) { 
    this.kind = "IdentifierExpr";
    this.name = name; 
  }
}

export class IntegerExpr {
  constructor(value) { 
    this.kind = "IntegerExpr";
    this.value = value; 
  }
}

export class StringExpr {
  constructor(value) { 
    this.kind = "StringExpr";
    this.value = value; 
  }
}

export class ParenExpr {
  constructor(expr) { 
    this.kind = "ParenExpr";
    this.expr = expr; 
  }
}
// op is one of: "+", "-", "*", "/", "&&"
export class BinaryExpr {
  constructor(left, op, right) {
    this.kind = "BinaryExpr";
    this.left = left;
    this.op = op;
    this.right = right;
  }
}

export class BooleanExpr {
  constructor(value) { 
    this.kind = "BooleanExpr";
    this.value = value; 
  }
}

export class ThisExpr {
  constructor() {
    this.kind = "ThisExpr";
  }
 }

export class SuperExpr {
  constructor(methodName, args) {
    this.kind = "SuperExpr";
    this.methodName = methodName;
    this.args = args;
  }
 }

export class NewExpr {
  constructor(className, args) {
    this.kind = "NewExpr";
    this.className = className;
    this.args = args;
  }
}

export class MethodCallExpr {
  constructor(receiver, methodName, args) {
    this.kind = "MethodCallExpr";
    this.receiver = receiver;
    this.methodName = methodName;
    this.args = args;
  }
}

export class FieldAccessExpr {
  constructor(receiver, fieldName) {
    this.kind = "FieldAccessExpr";
    this.receiver = receiver;
    this.fieldName = fieldName;
  }
}

// --- AST Statements ---
export class VarDeclStmt {
  constructor(varType, name, initializer = null) {
    this.kind = "VarDeclStmt";
    this.varType = varType;
    this.name = name;
    this.initializer = initializer;
  }
}

export class AssignStmt {
  constructor(target, expr) {
    this.kind = "AssignStmt";
    this.target = target;
    this.expr = expr;
  }
}

export class ReturnStmt {
  constructor(expr) { 
    this.kind = "ReturnStmt";
    this.expr = expr; 
  }
}

export class PrintlnStmt {
  constructor(expr) { 
    this.kind = "PrintlnStmt";
    this.expr = expr; 
  }
}

export class IfStmt {
  constructor(condition, thenBranch, elseBranch) {
    this.kind = "IfStmt";
    this.condition = condition;
    this.thenBranch = thenBranch;
    this.elseBranch = elseBranch;
  }
}

export class WhileStmt {
  constructor(condition, body) {
    this.kind = "WhileStmt";
    this.condition = condition;
    this.body = body;
  }
}

export class BreakStmt {
  constructor() {
    this.kind = "BreakStmt";
  }
}

export class ExprStmt {
  constructor(expr) {
    this.kind = "ExprStmt";
    this.expr = expr;
  }
}

export class Program {
  constructor(classDefs, stmts = []) {
    this.kind = "Program";
    this.classDefs = classDefs;
    this.stmts = stmts;
  }
}

// --- AST Class-level nodes ---
export class ClassDef {
  constructor(name, superclass, init, methods) {
    this.kind = "ClassDef";
    this.name = name;
    this.superclass = superclass;
    this.init = init;
    this.methods = methods;
  }
}

export class InitDef {
  constructor(params, body) {
    this.kind = "InitDef";
    this.params = params;
    this.body = body;
  }
}

export class MethodDef {
  constructor(name, params, returnType, body) {
    this.kind = "MethodDef";
    this.name = name;
    this.params = params;
    this.returnType = returnType;
    this.body = body;
  }
}

export class Param {
  constructor(type, name) {
    this.kind = "Param";
    this.type = type;
    this.name = name;
  }
}


