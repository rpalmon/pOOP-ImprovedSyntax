import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Lexer } from "./lexer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = 
    process.argv[2] ??
    path.join(__dirname, "..", "examples", "test.poop");

try {
    const source = fs.readFileSync(inputPath, "utf8");
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    console.log(`Lexing file: ${inputPath}\n`);
    for (const token of tokens) {
        console.log(
            `${token.type.padEnd(12)} lexeme=${JSON.stringify(token.lexeme)} value=${JSON.stringify(token.literal)} @ ${token.line}:${token.col}`
        );
    }
} catch (err) {
    console.error("Lexer error:", err.message);
    process.exit(1);
}

// Run node src/main.js examples/test.poop.txt to test lexer
