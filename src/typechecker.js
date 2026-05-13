export class TypeCheckException extends Error {
  constructor(message) {
    super(message);
    this.name = "TypeCheckException";
  }
}

export class TypeChecker {

  constructor() {
    this.classes = new Map();
  }

  checkMethodOverrides() {
    for (const classDef of this.classes.values()) {
      if (!classDef.superclass) continue;

      for (const method of classDef.methods ?? []) {
        const parentMethod = this.lookupMethod(classDef.superclass, method.name);

        if (!parentMethod) continue;

        if (method.returnType !== parentMethod.returnType) {
          throw new TypeCheckException(
            `Invalid override of ${method.name}: return type mismatch`
          );
        }

        const childParams = method.params ?? [];
        const parentParams = parentMethod.params ?? [];

        if (childParams.length !== parentParams.length) {
          throw new TypeCheckException(
            `Invalid override of ${method.name}: parameter count mismatch`
          );
        }

        for (let i = 0; i < childParams.length; i++) {
          if (childParams[i].type !== parentParams[i].type) {
            throw new TypeCheckException(
              `Invalid override of ${method.name}: parameter type mismatch`
            );
          }
        }
      }
    }
  }

  checkCyclicInheritance() {
    for (const className of this.classes.keys()) {
      const seen = new Set();
      let current = className;

      while (current) {
        if (seen.has(current)) {
          throw new TypeCheckException(`Cyclic inheritance involving ${className}`);
        }

        seen.add(current);

        const classInfo = this.classes.get(current);
        current = classInfo?.superclass ?? null;
      }
    }
  }

  checkMethodReturns(method, className) {
    const env = new Map();

    env.set("this", className);

    for (const param of method.params ?? []) {
      env.set(param.name, param.type);
    }

    let sawReturn = false;

    for (const stmt of this.getStmtList(method.body)) {
      if (stmt.kind === "ReturnStmt") {
        sawReturn = true;

        if (stmt.expr == null) {
          if (method.returnType !== "Void") {
            throw new TypeCheckException(
              `Non-void method ${method.name} must return ${method.returnType}`
            );
          }
        } 
        else {
            const actualType = this.checkExpr(stmt.expr, env);

            if (!this.isAssignable(actualType, method.returnType)) {
              throw new TypeCheckException(
                `Return type mismatch in ${method.name}: expected ${method.returnType}, got ${actualType}`
              );
            }
        }
      } 
      else {
        this.checkStmt(stmt, env);
      }
    }

    if (method.returnType !== "Void" && !sawReturn) {
      throw new TypeCheckException(`Missing return in non-void method ${method.name}`);
    }
  }


  isAssignable(actualType, expectedType) {
    if (actualType === expectedType) return true;

    let current = actualType;

    while (current) {
      const classInfo = this.classes.get(current);
      if (!classInfo) return false;

      if (classInfo.superclass === expectedType) {
        return true;
      }

      current = classInfo.superclass;
    }
    return false;
  }

  lookupField(className, fieldName) {
    let current = className;

    while (current) {
      const classInfo = this.classes.get(current);
      if (!classInfo) return null;

      const fields = classInfo.fields ?? [];
      const field = fields.find((f) => f.name === fieldName);

      if (field) {
        return field.type;
      }

      current = classInfo.superclass ?? null;
    }

    return null;
  }

  lookupMethod(className, methodName) {
    let current = className;

    while (current) {
      const classInfo = this.classes.get(current);
      if (!classInfo) return null;

      const methods = classInfo.methods ?? [];
      const method = methods.find((m) => m.name === methodName);

      if (method) {
        return method;
      }

      current = classInfo.superclass ?? null;
    }

    return null;
  }

  checkProgram(program) {
    this.classes = new Map();

    for (const classDef of program.classDefs ?? []) {
      if (this.classes.has(classDef.name)) {
        throw new TypeCheckException(`Duplicate class definition: ${classDef.name}`);
      }

      this.classes.set(classDef.name, classDef);
    }

    for (const classDef of program.classDefs ?? []) {
      if (classDef.superclass && !this.classes.has(classDef.superclass)) {
        throw new TypeCheckException(`Unknown superclass: ${classDef.superclass}`);
      }
    }

    this.checkCyclicInheritance();
    this.checkMethodOverrides();

    for (const classDef of program.classDefs ?? []) {
      const fieldNames = new Set();

      for (const field of classDef.fields ?? []) {
        if (fieldNames.has(field.name)) {
          throw new TypeCheckException(`Duplicate field ${field.name} in class ${classDef.name}`);
        }

        fieldNames.add(field.name);
      }

      const methodNames = new Set();

      for (const method of classDef.methods ?? []) {
        if (methodNames.has(method.name)) {
          throw new TypeCheckException(`Duplicate method ${method.name} in class ${classDef.name}`);
        }

        methodNames.add(method.name);
      }
    }

    for (const classDef of program.classDefs ?? []) {
      for (const method of classDef.methods ?? []) {
        this.checkMethodReturns(method, classDef.name);
      }
    }

    const env = new Map();

    for (const stmt of program.stmts ?? []) {
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

          if (!this.isAssignable(initType, stmt.varType)) {
            throw new TypeCheckException(
              `Type mismatch: cannot assign ${initType} to ${stmt.varType}`
            );
          }
        }

        return;
      }

      case "AssignStmt": {
        const value = this.getAssignValue(stmt);
        const actualType = this.checkExpr(value, env);

        if (stmt.target?.kind === "FieldAccessExpr") {
          const expectedType = this.checkExpr(stmt.target, env);

          if (!this.isAssignable(actualType, expectedType)) {
            throw new TypeCheckException(
            `Type mismatch: cannot assign ${actualType} to ${expectedType}`
            );
          }

          return;
        }

        const name = this.getAssignName(stmt);

        if (!env.has(name)) {
          throw new TypeCheckException(`Undefined variable: ${name}`);
        }

        const expectedType = env.get(name);

        if (!this.isAssignable(actualType, expectedType)) {
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

      case "ExprStmt":
        this.checkExpr(stmt.expr, env);
        return;

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

      case "ParenExpr":
        return this.checkExpr(expr.expr, env);

      case "FieldAccessExpr": {
        const receiverType = this.checkExpr(expr.receiver, env);

        if (!this.classes.has(receiverType)) {
          throw new TypeCheckException(`Cannot access field on non-class type ${receiverType}`);
        }

        const fieldType = this.lookupField(receiverType, expr.fieldName);

        if (!fieldType) {
          throw new TypeCheckException(`Unknown field ${expr.fieldName} on ${receiverType}`);
        }

        return fieldType;
      }

      case "MethodCallExpr": {
        const receiverType = this.checkExpr(expr.receiver, env);

        if (!this.classes.has(receiverType)) {
          throw new TypeCheckException(`Cannot call method on non-class type ${receiverType}`);
        }

        const methodInfo = this.lookupMethod(receiverType, expr.methodName);

        if (!methodInfo) {
          throw new TypeCheckException(`Unknown method ${expr.methodName} on ${receiverType}`);
        }

        const args = expr.args ?? [];
        const params = methodInfo.params ?? [];

        if (args.length !== params.length) {
          throw new TypeCheckException(`Wrong number of arguments for ${expr.methodName}`);
        }

        for (let i = 0; i < args.length; i++) {
          const actualType = this.checkExpr(args[i], env);
          const expectedType = params[i].type;

          if (!this.isAssignable(actualType, expectedType)) {
            throw new TypeCheckException(
            `Argument type mismatch for ${expr.methodName}: expected ${expectedType}, got ${actualType}`
            );
          }
        }
        return methodInfo.returnType;
      }

      case "NewExpr": {
        const classInfo = this.classes.get(expr.className);
        
        if (!classInfo) {
          throw new TypeCheckException(`Unknown class: ${expr.className}`);
        }

        const params = classInfo.init?.params ?? [];
        const args = expr.args ?? [];

        if (args.length !== params.length) {
          throw new TypeCheckException(`Wrong number of arguments for constructor of ${expr.className}`);
        }

        for (let i = 0; i < args.length; i++) {
          const actualType = this.checkExpr(args[i], env);
          const expectedType = params[i].type;

          if (!this.isAssignable(actualType, expectedType)) {
            throw new TypeCheckException(
              `Argument type mismatch for constructor of ${expr.className}: expected ${expectedType}, got ${actualType}`
            );
          }
        }

        return expr.className;
      }

      case "ThisExpr": {
        if (!env.has("this")) {
          throw new TypeCheckException("Cannot use this outside of a class");
        }

        return env.get("this");
      }

      case "SuperExpr": {
        if (!env.has("this")) {
          throw new TypeCheckException("Cannot use super outside of a class");
        }

        const currentClassName = env.get("this");
        const currentClass = this.classes.get(currentClassName);

        if (!currentClass || !currentClass.superclass) {
          throw new TypeCheckException("Class does not have a superclass to call super on");
        }

        const methodInfo = this.lookupMethod(currentClass.superclass, expr.methodName);

        if (!methodInfo) {
          throw new TypeCheckException(`Unknown method ${expr.methodName} on superclass of ${currentClassName}`);
        }

        const args = expr.args ?? [];
        const params = methodInfo.params ?? [];

        if (args.length !== params.length) {
          throw new TypeCheckException(`Wrong number of arguments for super call to ${expr.methodName}`);
        }

        for (let i = 0; i < args.length; i++) {
          const actualType = this.checkExpr(args[i], env);
          const expectedType = params[i].type;

          if (!this.isAssignable(actualType, expectedType)) {
            throw new TypeCheckException(
              `Argument type mismatch for super call to ${expr.methodName}: expected ${expectedType}, got ${actualType}`
            );
          }
        }

        return methodInfo.returnType;
      }

      default:
        throw new TypeCheckException(`Unknown expression kind: ${expr.kind}`);
    }
  }
} 