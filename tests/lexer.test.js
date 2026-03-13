import { Lexer } from "../src/lexer";

const src = `
class Cat extends Animal {
  init() { super(); }
  method speak() Void { return println(1); }
}
`;

console.log(new Lexer(src).tokenize());