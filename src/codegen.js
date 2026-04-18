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
}
