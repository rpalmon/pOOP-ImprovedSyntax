export class TypeCheckException extends Error {
  constructor(message) {
    super(message);
    this.name = "TypeCheckException";
  }
}

export class TypeChecker {
  checkProgram(program) {
    const env = new Map();

    for (const stmt of program.stmts) {
      this.checkStmt(stmt, env);
    }
  }
  getAssignName(stmt) {
    return stmt.name ?? stmt.varName ?? stmt.identifier ?? stmt.target?.name;
  }
  
  getAssignValue(stmt) {
    return stmt.value ?? stmt.expr ?? stmt.expression;
  }
  
  getStmtList(blockOrList) {
    if (!blockOrList) return [];
    if (Array.isArray(blockOrList)) return blockOrList;
    if (Array.isArray(blockOrList.stmts)) return blockOrList.stmts;
    if (Array.isArray(blockOrList.statements)) return blockOrList.statements;
    if (Array.isArray(blockOrList.body)) return blockOrList.body;
    return [blockOrList];
  }

  getBinaryOperator(expr) {
    return expr.operator ?? expr.op ?? expr.operation ?? expr.binaryOp;
  }

  checkStmt(stmt, env) {
    switch (stmt.kind) {
      case "VarDeclStmt": {
        if (env.has(stmt.name)) {
          throw new TypeCheckException(`Variable ${stmt.name} already declared`);
        }

        env.set(stmt.name, stmt.varType);

        if (stmt.initializer) {
          const initType = this.checkExpr(stmt.initializer, env);

          if (initType !== stmt.varType) {
            throw new TypeCheckException(
              `Type mismatch: cannot assign ${initType} to ${stmt.varType}`
            );
          }
        }

        return;
      }

      case "AssignStmt": {
        const name = this.getAssignName(stmt);
        const value = this.getAssignValue(stmt);

        if (!env.has(name)) {
          throw new TypeCheckException(`Undefined variable: ${name}`);
        }

        const expectedType = env.get(name);
        const actualType = this.checkExpr(value, env);

        if (actualType !== expectedType) {
          throw new TypeCheckException(
            `Type mismatch: cannot assign ${actualType} to ${expectedType}`
          );
        }

        return;
      }

      case "PrintlnStmt": {
        this.checkExpr(stmt.expr, env);
        return;
      }

      case "IfStmt": {
        const conditionType = this.checkExpr(stmt.condition, env);

        if (conditionType !== "Boolean") {
          throw new TypeCheckException("If condition must be Boolean");
        }

        for (const s of this.getStmtList(stmt.thenBranch ?? stmt.thenStmt ?? stmt.thenBlock)) {
          this.checkStmt(s, env);
        }

        for (const s of this.getStmtList(stmt.elseBranch ?? stmt.elseStmt ?? stmt.elseBlock)) {
            this.checkStmt(s, env);
        }

        return;
      }

      case "WhileStmt": {
        const conditionType = this.checkExpr(stmt.condition, env);

        if (conditionType !== "Boolean") {
          throw new TypeCheckException("While condition must be Boolean");
        }

        for (const s of this.getStmtList(stmt.body ?? stmt.block)) {
          this.checkStmt(s, env);
        }

        return;
      }

      case "BreakStmt":
        return;

      default:
        throw new TypeCheckException(`Unknown statement kind: ${stmt.kind}`);
    }
  }

  checkExpr(expr, env) {
    switch (expr.kind) {
      case "IntegerExpr":
        return "Int";

      case "StringExpr":
        return "String";

      case "BooleanExpr":
        return "Boolean";

      case "IdentifierExpr": {
        if (!env.has(expr.name)) {
          throw new TypeCheckException(`Undefined variable: ${expr.name}`);
        }

        return env.get(expr.name);
      }

      case "BinaryExpr": {
        const leftType = this.checkExpr(expr.left, env);
        const rightType = this.checkExpr(expr.right, env);
        const operator = this.getBinaryOperator(expr);

        if (["+", "-", "*", "/"].includes(operator)) {
          if (leftType !== "Int" || rightType !== "Int") {
            throw new TypeCheckException(
              `Operator ${operator} requires Int operands`
            );
          }

          return "Int";
        }

        if (["&&", "||"].includes(operator)) {
          if (leftType !== "Boolean" || rightType !== "Boolean") {
            throw new TypeCheckException(
              `Operator ${operator} requires Boolean operands`
            );
          }

          return "Boolean";
        }

        if (["<", ">", "<=", ">="].includes(operator)) {
          if (leftType !== "Int" || rightType !== "Int") {
            throw new TypeCheckException(
              `Operator ${operator} requires Int operands`
            );
          }

          return "Boolean";
        }

        if (["==", "!="].includes(operator)) {
          if (leftType !== rightType) {
            throw new TypeCheckException(
              `Cannot compare ${leftType} and ${rightType}`
            );
          }

          return "Boolean";
        }

        throw new TypeCheckException(`Unknown binary operator: ${operator}`);
      }

      case "NewExpr":
        return expr.className;

      default:
        throw new TypeCheckException(`Unknown expression kind: ${expr.kind}`);
    }
  }
} 