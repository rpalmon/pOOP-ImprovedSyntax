import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js"; // <-- Added Parser import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultFile = path.join(__dirname, "..", "examples", "test.poop.txt");
const inputPath = process.argv[2] ?? defaultFile;

try {
    const source = fs.readFileSync(inputPath, "utf8");
    
    // --- 1. LEXICAL ANALYSIS ---
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    console.log(`Lexing file: ${inputPath}\n`);
    for (const token of tokens) {
        console.log(
            `${token.type.padEnd(12)} lexeme=${JSON.stringify(token.lexeme)} value=${JSON.stringify(token.literal)} @ ${token.line}:${token.col}`
        );
    }

    // --- 2. SYNTAX ANALYSIS (PARSING) ---
    console.log(`\nParsing file: ${inputPath}\n`);
    const parser = new Parser(tokens);
    const ast = parser.parseProgram();

    console.log("--- ABSTRACT SYNTAX TREE (AST) ---");
    console.log(JSON.stringify(ast, null, 2));

} catch (err) {
    console.error(`\nFailed to process file: ${inputPath}`);
    console.error(err.message);
    process.exit(1);
}