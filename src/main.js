import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { Typechecker } from "./typechecker.js";
import { CodeGenerator } from "./codegen.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultFile = path.join(__dirname, "..", "examples", "test.poop.txt");
const inputPath = process.argv[2] ?? defaultFile;

try {
    const source = fs.readFileSync(inputPath, "utf8");
    
    //1. LEXICAL ANALYSIS
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    process.stderr.write(`Lexing file: ${inputPath}\n\n`);
    for (const token of tokens) {
        process.stderr.write(
            `${token.type.padEnd(12)} lexeme=${JSON.stringify(token.lexeme)} value=${JSON.stringify(token.literal)} @ ${token.line}:${token.col}\n`
        );
    }

    //2. SYNTAX ANALYSIS (PARSING)
    process.stderr.write(`\nParsing file: ${inputPath}\n\n`);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();

    //3. TYPE CHECKING
    new Typechecker().typecheck(ast);

    //4. CODE GENERATOR
    const codegen = new CodeGenerator();
    const jsOutput = codegen.generateProgram(ast);
    console.log(jsOutput);

} catch (err) {
    console.error(`\nFailed to process file: ${inputPath}`);
    console.error(err.message);
    process.exit(1);
}
