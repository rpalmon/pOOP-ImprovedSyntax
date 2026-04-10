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