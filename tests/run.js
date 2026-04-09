import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith(".test.js"))
  .sort();

for (const file of testFiles) {
  await import(pathToFileURL(path.join(__dirname, file)).href);
}
