export class CodeGenException extends Error {
    constructor (message) {
        super(message);
        this.name = "CodeGenException";
    }
}

export class CodeGenerator {
    constructor(indentSize = 2) {
        this.indentSize = indentSize;
    }

    // Entry Point
    generateProgram(program) {
        const parts =[];
        for (const classDef of program.classDefs) {
            parts.push(this.generateClass(classDef));
        }
        for(const stmt of program.stmts) {
            parts.push(this.generateStmt(stmt, 0));
        }
        return parts.join("\n")
    }

    // Classes
    generateClass(classDef){
        const lines = [];
        const superclause = classDef.superclass ? ` extends ${classDef.superclass}` : "";
        lines.push(`class ${classDef.name}${superclause} {`);
        if (classDef.init) {
            lines.push(this.generateInit(classDef.init, 1));
        }
        for (const method of classDef.methods) {
            lines.push(this.generateMethod(method, 1));
        }
        lines.push("}");
        return lines.join("\n");
    }

    generateInit(initDef, indentLevel) {
        const indent = this.indent(indentLevel);
        const params = initDef.params.map(p => p.name).join(", ");
        const lines = [`${indent}constructor(${params}) {`];
        for (const stmt of initDef.body.stmts) {
          lines.push(this.generateStmt(stmt, indentLevel + 1));
        }
        lines.push(`${indent}}`);
        return lines.join("\n");
    }

    generateMethod(methodDef, indentLevel) {
        const indent = this.indent(indentLevel);
        const params = methodDef.params.map(p => p.name).join(", ");
        const lines = [`${indent}${methodDef.name}(${params}) {`];
        for (const stmt of methodDef.body.stmts) {
          lines.push(this.generateStmt(stmt, indentLevel + 1));
        }
        lines.push(`${indent}}`);
        return lines.join("\n");
    }

    // Statements
    generateStmt(stmt, indentLevel) {
        const indent = this.indent(indentLevel);

        switch (stmt.kind) {
            case "VarDeclStmt":
                if(stmt.initializer != null) {
                    return `${indent}let ${stmt.name} = ${this.generateExpr(stmt.initializer)};`;
                }
                return `${indent}let ${stmt.name};`;

            case "AssignStmt":
                return `${indent}${this.generateExpr(stmt.target)} = ${this.generateExpr(stmt.expr)};`;
            
            case "ReturnStmt":
                if (stmt.expr !== null && stmt.expr !== undefined) {
                    return `${indent}return ${this.generateExpr(stmt.expr)};`;
                }
                return `${indent}return;`;
            
            case "PrintlnStmt":
                return `${indent}console.log(${this.generateExpr(stmt.expr)});`;

            case "IfStmt":
                return this.generateIf(stmt, indentLevel);

            case "WhileStmt":
                return this.generateWhile(stmt, indentLevel);

            case "BreakStmt":
                return `${indent}break;`;

            case "ExprStmt":
                return `${indent}${this.generateExpr(stmt.expr)};`;
            case "BlockStmt":
                const lines = [`${indent}{`];
                for(const s of stmt.stmts) {
                    lines.push(this.generateStmt(s, indentLevel + 1));
                }
                lines.push(`${indent}}`);
                return lines.join("\n");            
            default:
                throw new CodeGenException(`Unknown statement kind: ${stmt.kind}`);
        }
    }

    getStmtList(stmtOrBlock) {
        if (!stmtOrBlock) return [];
        if (stmtOrBlock.kind === "BlockStmt") return stmtOrBlock.stmts;
        return [stmtOrBlock];
    }

    generateIf(stmt, indentLevel) {
        const indent = this.indent(indentLevel);
        const condition = this.generateExpr(stmt.condition);
        const lines = [`${indent}if (${condition}) {`];

        for (const s of this.getStmtList(stmt.thenBranch)) {
            lines.push(this.generateStmt(s, indentLevel + 1));
        }

        if (stmt.elseBranch) {
            lines.push(`${indent}} else {`);
            for (const s of this.getStmtList(stmt.elseBranch)) {
                lines.push(this.generateStmt(s, indentLevel + 1));
            }
        }

        lines.push(`${indent}}`);
        return lines.join("\n");
    }

    generateWhile(stmt, indentLevel) {
        const indent = this.indent(indentLevel);
        const condition = this.generateExpr(stmt.condition);
        const lines = [`${indent}while (${condition}) {`];

        for (const s of this.getStmtList(stmt.body)) {
            lines.push(this.generateStmt(s, indentLevel + 1));
        }

        lines.push(`${indent}}`);
        return lines.join("\n");
    }

    // Expressions
    generateExpr(expr) {
        switch (expr.kind) {
            case "IntegerExpr":
                return String(expr.value);
            
            case "StringExpr":
                return `"${expr.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t")}"`;

            case "ParenExpr":
                return `(${this.generateExpr(expr.expr)})`;

            case "BinaryExpr":
                return `${this.generateExpr(expr.left)} ${expr.op} ${this.generateExpr(expr.right)}`;

            case "ThisExpr":
                return "this";

            case "SuperExpr":
                if(expr.methodName) {
                    const args = expr.args.map(a => this.generateExpr(a)).join(", ");
                    return `super.${expr.methodName}(${args})`;
                } else if (expr.args && expr.args.length > 0) {
                    const args = expr.args.map(a => this.generateExpr(a)).join(", ");
                    return `super(${args})`;
                }
                return "super()";
            
            case "MethodCallExpr": {
                const receiver = this.generateExpr(expr.receiver);
                const args = expr.args.map(a => this.generateExpr(a)).join(", ");
                return `${receiver}.${expr.methodName}(${args})`;
            }

            case "FieldAccessExpr":
                return `${this.generateExpr(expr.receiver)}.${expr.fieldName}`;

            case "IdentifierExpr":
                return expr.name;

            case "BooleanExpr":
                return expr.value ? "true" : "false";   
            
            case "NewExpr": {
                const newArgs = expr.args.map(a => this.generateExpr(a)).join(", ");
                return `new ${expr.className}(${newArgs})`;
            }

            case "PrintlnExpr":
                return `console.log(${this.generateExpr(expr.expr)})`;

            default:
                throw new CodeGenException(`Unknown expression kind: ${expr.kind}`);
        }
    }

    // Helper
    indent(level) {
        return " ".repeat(level * this.indentSize);
    }
}
