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
        const superclause = classDef.superclass ? ' extends ${classDef.superclass}' : "";
        lines.push ('class ${classDef.name}${superclause} {');
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
        const innerIndent = this.indent(indentLevel + 1);
        const params = initDef.params.map(p => p.name).join(", ");
        const lines = [`${indent}constructor(${params}) {`];
        for (const stmt of initDef.body) {
          lines.push(this.generateStmt(stmt, indentLevel + 1));
        }
        lines.push(`${indent}}`);
        return lines.join("\n");
    }

    generateMethod(methodDef, indentLevel) {
        const indent = this.indent(indentLevel);
        const params = methodDef.params.map(p => p.name).join(", ");
        const lines = [`${indent}${methodDef.name}(${params}) {`];
        for (const stmt of methodDef.body) {
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
                return '${indent}let &{stmt.name};';

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
            
            default:
                throw new CodeGenException('Unknown statement kind: ${stmt.kind}');
        }
    }

    generateIf(stmt, indentLevel) {
        const indent = this.indent(indentLevel);
        const condition = this.generateExpr(stmt.condition);
        const lines = ['${indent}if (${condition}) {'];
        for(const s of stmt.thenBranch) {
            lines.push(this.generateStmt(s, indentLevel + 1));
        }
        if(stmt.elseBranch && stmt.elseBranch.length > 0) {
            lines.push('${indent}} else {');
            for (const s of stmt.elseBranch) {
                lines.push(this.generateStmt(s, indentLevel + 1));
            }
        }
        lines.push('${indnet}}');
        return lines.join("\n");
    }

    generateWhile(stmt, indentLevel) {
        const indent = this.indent(indentLevel);
        const condition = this.generateExpr(stmt.condition);
        const lines = [`${indent}while (${condition}) {`];

        for (const s of stmt.body) {
            lines.push(this.generateStmt(s, indentLevel + 1));
        }
        lines.push(`${indent}}`);
        return lines.join("\n");
    }
    
}
