import { TokenType } from './tokenTypes.js'

export const KEYWORDS = {
    class: TokenType.CLASS,
    extends: TokenType.EXTENDS,
    init: TokenType.INIT,
    method: TokenType.METHOD,
    super: TokenType.SUPER,
    return: TokenType.RETURN,
    if: TokenType.IF,
    else: TokenType.ELSE,
    while: TokenType.WHILE,
    break: TokenType.BREAK,
    new: TokenType.NEW,
    this: TokenType.THIS,
    true: TokenType.TRUE,
    false: TokenType.FALSE,
    println: TokenType.PRINTLN,
    Int: TokenType.INT_TYPE,
    Boolean: TokenType.BOOLEAN_TYPE,
    Void: TokenType.VOID_TYPE
}