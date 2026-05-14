// typechecker.js
import {
  IdentifierExpr, IntegerExpr, StringExpr, ParenExpr, BinaryExpr,
  BooleanExpr, NewExpr, ThisExpr, SuperExpr, MethodCallExpr, FieldAccessExpr, PrintLnExpr,
  VarDeclStmt, AssignStmt, ReturnStmt, PrintlnStmt, IfStmt, WhileStmt,
  BreakStmt, BlockStmt, ExprStmt,
  ClassDef, InitDef, MethodDef, FieldDef, Param,
  Program
} from "./ast.js";

export class TypeErrorException extends Error {
  constructor(message) {
    super(message);
    this.name = "TypeErrorException";
  }
}

const INT    = "Int";
const BOOL   = "Boolean";
const STRING = "String";
const VOID   = "Void";

// holds the info we need to typecheck against a class: superclass, fields, methods, init params
class ClassEntry {
  constructor(superclass, fields, methods, initParamTypes) {
    this.superclass     = superclass;     // string | null
    this.fields         = fields;         // Map<string, string>
    this.methods        = methods;        // Map<string, { paramTypes, returnType }>
    this.initParamTypes = initParamTypes; // string[]
  }
}

export class Typechecker {
  constructor() {
    this.classTable = new Map(); // Map<string, ClassEntry>
  }

  // entry point: build class table first, then check everything
  typecheck(program) {
    this.checkDuplicateMembers(program.classDefs);
    this.buildClassTable(program.classDefs);
    this.checkForCycles();
    this.checkOverrides();

    for (const classDef of program.classDefs) {
      this.typecheckClass(classDef);
    }

    // top-level statements have no enclosing class or return type
    const env = new Map();
    for (const stmt of program.stmts) {
      this.typecheckStmt(stmt, env, null, null);
    }
  }

  typecheckStmtOrBlock(stmtOrBlock, env, expectedReturn, currentClass, inLoop = false) {
    if (stmtOrBlock instanceof BlockStmt) {
      this.typecheckBody(stmtOrBlock, env, expectedReturn, currentClass, inLoop);
    } else {
      this.typecheckStmt(stmtOrBlock, env, expectedReturn, currentClass, inLoop);
    }
  }

  // pass 1: collect class signatures before checking any bodies
  // this lets classes reference each other regardless of order
  buildClassTable(classDefs) {
    for (const cls of classDefs) {
      if (this.classTable.has(cls.name)) {
        throw new TypeErrorException(`Duplicate class definition: '${cls.name}'`);
      }

      const fields  = new Map();
      const methods = new Map();

      for (const field of cls.fields) {
        fields.set(field.name, field.type);
      }

      const initParamTypes = cls.init.params.map(p => p.type);

      for (const method of cls.methods) {
        methods.set(method.name, {
          paramTypes: method.params.map(p => p.type),
          returnType: method.returnType,
        });
      }

      this.classTable.set(cls.name, new ClassEntry(
        cls.superclass, fields, methods, initParamTypes
      ));
    }

    // make sure every superclass, field type, param type, and return type exists
    for (const [name, entry] of this.classTable) {
      if (entry.superclass !== null && !this.classTable.has(entry.superclass)) {
        throw new TypeErrorException(
          `Class '${name}' extends unknown class '${entry.superclass}'`
        );
      }
      for (const [fieldName, fieldType] of entry.fields) {
        this.assertTypeExists(fieldType);
      }
      for (const paramType of entry.initParamTypes) {
        this.assertTypeExists(paramType);
      }
      for (const [methodName, sig] of entry.methods) {
        this.assertTypeExists(sig.returnType);
        for (const paramType of sig.paramTypes) {
          this.assertTypeExists(paramType);
        }
      }
    }
  }

  // isSubtype("Dog", "Animal") is true if Dog extends Animal (directly or transitively)
  isSubtype(sub, sup) {
    if (sub === sup) return true;
    if (!this.classTable.has(sub)) return false;

    const entry = this.classTable.get(sub);
    if (entry.superclass === null) return false;

    return this.isSubtype(entry.superclass, sup);
  }

  assertTypeExists(typeName) {
    const primitives = new Set([INT, BOOL, STRING, VOID]);
    if (!primitives.has(typeName) && !this.classTable.has(typeName)) {
      throw new TypeErrorException(`Unknown type: '${typeName}'`);
    }
  }

  assertSubtype(sub, sup, context) {
    if (!this.isSubtype(sub, sup)) {
      throw new TypeErrorException(
        `Type mismatch in ${context}: expected '${sup}', got '${sub}'`
      );
    }
  }

  // walk up the inheritance chain to find a field type
  lookupField(className, fieldName) {
    if (!this.classTable.has(className)) {
      throw new TypeErrorException(`Unknown class: '${className}'`);
    }
    const entry = this.classTable.get(className);
    if (entry.fields.has(fieldName)) return entry.fields.get(fieldName);
    if (entry.superclass !== null) return this.lookupField(entry.superclass, fieldName);
    throw new TypeErrorException(`Field '${fieldName}' not found on class '${className}'`);
  }

  // walk up the inheritance chain to find a method signature
  lookupMethod(className, methodName) {
    if (!this.classTable.has(className)) {
      throw new TypeErrorException(`Unknown class: '${className}'`);
    }
    const entry = this.classTable.get(className);
    if (entry.methods.has(methodName)) return entry.methods.get(methodName);
    if (entry.superclass !== null) return this.lookupMethod(entry.superclass, methodName);
    throw new TypeErrorException(`Method '${methodName}' not found on class '${className}'`);
  }

  // pass 2: typecheck class bodies
  typecheckClass(cls) {
    for (const field of cls.fields) {
      if (field.initializer !== null) {
        const t = this.typecheckExp(field.initializer, new Map(), cls.name);
        this.assertSubtype(t, field.type, `field '${field.name}' initializer`);
      }
    }

    const initEnv = new Map();
    for (const param of cls.init.params) {
      initEnv.set(param.name, param.type);
    }
    this.typecheckBody(cls.init.body, initEnv, VOID, cls.name);

    for (const method of cls.methods) {
      const methodEnv = new Map();
      for (const param of method.params) {
        methodEnv.set(param.name, param.type);
      }
      this.typecheckBody(method.body, methodEnv, method.returnType, cls.name);

      //non-void methods must end with a return
      if (method.returnType !== VOID) {
        const stmts = method.body.stmts;
        if(stmts.length === 0 || !(stmts[stmts.length-1] instanceof ReturnStmt)) {
          throw new TypeErrorException(
            `Method '${cls.name}.${method.name}' has non-void return type but does not end with a return statement`
          );
        }
      }
    }
  }

  // typecheck a block, giving it its own scope layered on top of env
  typecheckBody(block, env, expectedReturn, currentClass, inLoop = false) {
    const localEnv = new Map(env);
    for (const stmt of block.stmts) {
      this.typecheckStmt(stmt, localEnv, expectedReturn, currentClass, inLoop);
    }
  }

  // stmt ::= vardec | assignment | return | println | if | while | break | exprstmt | block
  typecheckStmt(stmt, env, expectedReturn, currentClass, inLoop = false) {
    if (stmt instanceof VarDeclStmt) {
      this.assertTypeExists(stmt.varType);
      if (stmt.initializer !== null) {
        const initType = this.typecheckExp(stmt.initializer, env, currentClass);
        this.assertSubtype(initType, stmt.varType, "variable declaration");
      }
      env.set(stmt.name, stmt.varType);

    } else if (stmt instanceof AssignStmt) {
      const rhsType = this.typecheckExp(stmt.expr, env, currentClass);
      const lhsType = this.typecheckExp(stmt.target, env, currentClass);
      this.assertSubtype(rhsType, lhsType, "assignment");

    } else if (stmt instanceof ReturnStmt) {
      if (stmt.expr === null) {
        //bare return
        if (expectedReturn !== null && expectedReturn !== VOID) {
          throw new TypeErrorException(
            `Expected return type '${expectedReturn}' but got bare return`
          );
        }
      } else {
        const retType = this.typecheckExp(stmt.expr, env, currentClass);
        if (expectedReturn === null) {
          throw new TypeErrorException(`Return statement outside of a method`);
        }
        //check return type against expected return type of the method
        this.assertSubtype(retType, expectedReturn, "return statement");
      }

    } else if (stmt instanceof PrintlnStmt) {
      //println accepts any type
      this.typecheckExp(stmt.expr, env, currentClass);

    } else if (stmt instanceof IfStmt) {
        const condType = this.typecheckExp(stmt.condition, env, currentClass);
        if (condType !== BOOL) {
          throw new TypeErrorException(`If condition must be Boolean, got '${condType}'`);
        }

        this.typecheckStmtOrBlock(stmt.thenBranch, env, expectedReturn, currentClass, inLoop);

        if (stmt.elseBranch !== null) {
          this.typecheckStmtOrBlock(stmt.elseBranch, env, expectedReturn, currentClass, inLoop);
        }
    } else if (stmt instanceof WhileStmt) {
        const condType = this.typecheckExp(stmt.condition, env, currentClass);
        if (condType !== BOOL) {
          throw new TypeErrorException(`While condition must be Boolean, got '${condType}'`);
        }

        this.typecheckStmtOrBlock(stmt.body, env, expectedReturn, currentClass, true);
    } else if (stmt instanceof BreakStmt) {
      if (!inLoop) {
        throw new TypeErrorException(`'break' used outside of a while loop`);
      }

    } else if (stmt instanceof ExprStmt) {
      this.typecheckExp(stmt.expr, env, currentClass);

    } else if (stmt instanceof BlockStmt) {
      this.typecheckBody(stmt, env, expectedReturn, currentClass, inLoop);

    } else {
      throw new TypeErrorException(`Unknown statement kind: ${stmt.kind}`);
    }
  }

  // exp ::= int | string | bool | identifier | paren | binary | this | super | new | methodcall | fieldaccess
  typecheckExp(exp, env, currentClass) {
    if (exp instanceof IntegerExpr) {
      return INT;

    } else if (exp instanceof StringExpr) {
      return STRING;

    } else if (exp instanceof BooleanExpr) {
      return BOOL;

    } else if (exp instanceof IdentifierExpr) {
      if (!env.has(exp.name)) {
        throw new TypeErrorException(`Undefined variable: '${exp.name}'`);
      }
      return env.get(exp.name);

    } else if (exp instanceof ParenExpr) {
      return this.typecheckExp(exp.expr, env, currentClass);

    } else if (exp instanceof BinaryExpr) {
      return this.typecheckBinaryExp(exp, env, currentClass);

    } else if (exp instanceof ThisExpr) {
      if (currentClass === null) {
        throw new TypeErrorException(`'this' used outside of a class`);
      }
      return currentClass;

    } else if (exp instanceof SuperExpr) {
      return this.typecheckSuperExp(exp, env, currentClass);

    } else if (exp instanceof NewExpr) {
      return this.typecheckNewExp(exp, env, currentClass);

    } else if (exp instanceof MethodCallExpr) {
      return this.typecheckMethodCallExp(exp, env, currentClass);

    } else if (exp instanceof FieldAccessExpr) {
      return this.typecheckFieldAccessExp(exp, env, currentClass);

    } else if (exp instanceof PrintlnExpr) {
      this.typecheckExp(exp.expr, env, currentClass);
      return VOID;
    } else {
      throw new TypeErrorException(`Unknown expression kind: ${exp.kind}`);
    }
  }

  // op ::= `+` | `-` | `*` | `/` | `&&`
  typecheckBinaryExp(exp, env, currentClass) {
    const leftType  = this.typecheckExp(exp.left,  env, currentClass);
    const rightType = this.typecheckExp(exp.right, env, currentClass);

    switch (exp.op) {
      case "+": case "-": case "*": case "/":
        if (leftType  !== INT) throw new TypeErrorException(`Operator '${exp.op}' requires Int on left, got '${leftType}'`);
        if (rightType !== INT) throw new TypeErrorException(`Operator '${exp.op}' requires Int on right, got '${rightType}'`);
        return INT;

      case "&&":
        if (leftType  !== BOOL) throw new TypeErrorException(`Operator '&&' requires Boolean on left, got '${leftType}'`);
        if (rightType !== BOOL) throw new TypeErrorException(`Operator '&&' requires Boolean on right, got '${rightType}'`);
        return BOOL;

      case "<":
        if (leftType !== INT) throw new TypeErrorException(`Operator '<' requires Int on left, got '${leftType}'`);
        if (rightType !== INT) throw new TypeErrorException(`Operator '<' requires Int on right, got '${rightType}'`);
        return BOOL;

      case "==":
        if (!this.isSubtype(leftType, rightType) && !this.isSubtype(rightType, leftType)) {
          throw new TypeErrorException(`Operator '==' requires compatible types, got '${leftType}' and '${rightType}'`);
        }
        return BOOL;

      default:
        throw new TypeErrorException(`Unknown operator: '${exp.op}'`);
    }
  }

  // super ::= `super` | `super` `.` IDENTIFIER `(` args `)`
  typecheckSuperExp(exp, env, currentClass) {
    if (currentClass === null) {
      throw new TypeErrorException(`'super' used outside of a class`);
    }
    const entry = this.classTable.get(currentClass);
    if (entry.superclass === null) {
      throw new TypeErrorException(`Class '${currentClass}' has no superclass, cannot use 'super'`);
    }
    const superClass = entry.superclass;

    //super.method(args)
    if (exp.methodName !== null) {
      const sig = this.lookupMethod(superClass, exp.methodName);
      this.checkArgs(exp.args, sig.paramTypes, `super.${exp.methodName}`, env, currentClass);
      return sig.returnType;
    }

    const superEntry = this.classTable.get(superClass);
    this.checkArgs(exp.args, superEntry.initParamTypes, `super(...)`, env, currentClass);
    return superClass;
  }

  // new IDENTIFIER `(` args `)`
  typecheckNewExp(exp, env, currentClass) {
    if (!this.classTable.has(exp.className)) {
      throw new TypeErrorException(`Unknown class in 'new': '${exp.className}'`);
    }
    const entry = this.classTable.get(exp.className);
    this.checkArgs(exp.args, entry.initParamTypes, `new ${exp.className}`, env, currentClass);
    return exp.className;
  }

  // receiver `.` methodName `(` args `)`
  typecheckMethodCallExp(exp, env, currentClass) {
    const receiverType = this.typecheckExp(exp.receiver, env, currentClass);
    if (!this.classTable.has(receiverType)) {
      throw new TypeErrorException(`Cannot call method on non-class type '${receiverType}'`);
    }
    const sig = this.lookupMethod(receiverType, exp.methodName);
    this.checkArgs(exp.args, sig.paramTypes, `${receiverType}.${exp.methodName}`, env, currentClass);
    return sig.returnType;
  }

  // receiver `.` fieldName
  typecheckFieldAccessExp(exp, env, currentClass) {
    const receiverType = this.typecheckExp(exp.receiver, env, currentClass);
    if (!this.classTable.has(receiverType)) {
      throw new TypeErrorException(`Cannot access field on non-class type '${receiverType}'`);
    }
    return this.lookupField(receiverType, exp.fieldName);
  }

  // check arg count and types match the expected param types
  checkArgs(argExps, paramTypes, callSite, env, currentClass) {
    if (argExps.length !== paramTypes.length) {
      throw new TypeErrorException(
        `'${callSite}' expects ${paramTypes.length} argument(s), got ${argExps.length}`
      );
    }
    for (let i = 0; i < argExps.length; i++) {
      const argType = this.typecheckExp(argExps[i], env, currentClass);
      this.assertSubtype(argType, paramTypes[i], `argument ${i + 1} of '${callSite}'`);
    }
  }

  // check for circular inheritance to prevent infinite loops
  checkForCycles() {
    for (const className of this.classTable.keys()) {
      const visited = new Set();
      let current = className;
      while (current !== null) {
        if (visited.has(current)) {
          throw new TypeErrorException(`Inheritance cycle detected: '${current}'`);
        }
        visited.add(current);
        const entry = this.classTable.get(current);
        current = entry.superclass;
      }
    }
  }

  // checks that a class doesn't define two fields or two methods with the same name
  checkDuplicateMembers(classDefs) {
    for (const cls of classDefs) {
      const seenFields = new Set();
      for (const field of cls.fields) {
        if (seenFields.has(field.name)) {
          throw new TypeErrorException(`Duplicate field '${field.name}' in class '${cls.name}'`);
        }
        seenFields.add(field.name);
      }

      const seenMethods = new Set();
      for (const method of cls.methods) {
        if (seenMethods.has(method.name)) {
          throw new TypeErrorException(`Duplicate method '${method.name}' in class '${cls.name}'`);
        }
        seenMethods.add(method.name);
      }
    }
  }

  // makes sure subclass methods match the signatures of superclass methods they override
  checkOverrides() {
    for (const [className, entry] of this.classTable) {
      if (entry.superclass === null) continue;

      let parentName = entry.superclass;
      while (parentName !== null) {
        const parentEntry = this.classTable.get(parentName);

        for (const [methodName, childSig] of entry.methods) {
          if (parentEntry.methods.has(methodName)) {
            const parentSig = parentEntry.methods.get(methodName);

            if (childSig.returnType !== parentSig.returnType) {
              throw new TypeErrorException(`Overridden method '${className}.${methodName}' return type mismatch`);
            }

            if (childSig.paramTypes.length !== parentSig.paramTypes.length) {
              throw new TypeErrorException(`Overridden method '${className}.${methodName}' parameter count mismatch`);
            }
            for (let i = 0; i < childSig.paramTypes.length; i++) {
              if (childSig.paramTypes[i] !== parentSig.paramTypes[i]) {
                throw new TypeErrorException(`Overridden method '${className}.${methodName}' parameter type mismatch at arg ${i + 1}`);
              }
            }
          }
        }
        parentName = parentEntry.superclass;
      }
    }
  }
}