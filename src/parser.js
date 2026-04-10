// parser.js
import { TokenType } from "./tokenTypes.js";
import { 
  ParseResult, ParseException, 
  IdentifierExp, IntegerExp, ParenExp, BinopExp,
  PlusOp, MinusOp, StarOp, SlashOp,
  VarDecStmt, AssignStmt, Program 
} from "./ast.js";

export class Parser {
  constructor(tokens) {
    this.tokens = tokens;
  }

  getToken(position) {
    if (position < 0 || position >= this.tokens.length) {
      throw new ParseException(`Tried to read token at out-of-bounds position: ${position}`);
    }
    return this.tokens[position];
  }

  assertTokenHereIs(position, expectedType) {
    const received = this.getToken(position);
  
    if (received.type !== expectedType) {
      throw new ParseException(`Expected token: ${expectedType}; received token: ${received.type} at line ${received.line}`);
    }
  }

  // op ::= `+` | `-` | `*` | `/`
  parseOp(startPosition) {
    const token = this.getToken(startPosition);
    if (token.type === TokenType.PLUS) {
      return new ParseResult(new PlusOp(), startPosition + 1);
    } else if (token.type === TokenType.MINUS) {
      return new ParseResult(new MinusOp(), startPosition + 1);
    } else if (token.type === TokenType.STAR) {
      return new ParseResult(new StarOp(), startPosition + 1);
    } else if (token.type === TokenType.SLASH) {
      return new ParseResult(new SlashOp(), startPosition + 1);
    } else {
      throw new ParseException(`Expected operator, got: ${token.type}`);
    }
  }

  // primaryExp ::= IDENTIFIER | INTEGER | `(` exp `)`
  parsePrimaryExp(startPosition) {
    const firstToken = this.getToken(startPosition);
    
    if (firstToken.type === TokenType.IDENTIFIER) {
      return new ParseResult(new IdentifierExp(firstToken.lexeme), startPosition + 1);
    } else if (firstToken.type === TokenType.INTEGER) {
      return new ParseResult(new IntegerExp(firstToken.literal), startPosition + 1);
    } else if (firstToken.type === TokenType.LPAREN) {
      const exp = this.parseExp(startPosition + 1);
      this.assertTokenHereIs(exp.nextPos, TokenType.RPAREN);
      return new ParseResult(new ParenExp(exp.result), exp.nextPos + 1);
    } else {
      throw new ParseException(`Expected primary exp; found: ${firstToken.type}`);
    }
  }

  // addExp ::= primaryExp ((`+` | `-` | `*` | `/`) primaryExp)*

  parseAddExp(startPosition) {
    const initialPrimaryExp = this.parsePrimaryExp(startPosition);
    let currentExp = initialPrimaryExp.result;
    let currentPosition = initialPrimaryExp.nextPos;
    
    while (true) {
      try {
        const curToken = this.getToken(currentPosition);
        
        if (curToken.type === TokenType.PLUS || curToken.type === TokenType.MINUS || 
            curToken.type === TokenType.STAR || curToken.type === TokenType.SLASH) {
          
          const opResult = this.parseOp(currentPosition);
          const nextExp = this.parsePrimaryExp(opResult.nextPos);
          
          currentExp = new BinopExp(currentExp, opResult.result, nextExp.result);
          currentPosition = nextExp.nextPos;
        } else {
          // If it's a token but not an operator, we've finished the math expression
          throw new ParseException(`Not an operator: ${curToken.type}`);
        }
      } catch (e) {
        // As soon as getToken goes out of bounds, or it stops seeing math operators, 
        // it catches the exception and returns the tree it has built so far.
        return new ParseResult(currentExp, currentPosition);
      }
    }
  }

  // exp ::= addExp
  parseExp(startPosition) {
    return this.parseAddExp(startPosition);
  }

  // stmt ::= vardec | assignment
  // vardec ::= type IDENTIFIER `;`
  // assignment ::= IDENTIFIER `=` exp `;`
  parseStmt(startPosition) {
    const firstToken = this.getToken(startPosition);
    
    // 1. Check for Variable Declaration 
    if (firstToken.type === TokenType.INT || firstToken.type === TokenType.BOOLEAN || firstToken.type === TokenType.VOID) {
      this.assertTokenHereIs(startPosition + 1, TokenType.IDENTIFIER);
      const idToken = this.getToken(startPosition + 1);
      
      this.assertTokenHereIs(startPosition + 2, TokenType.SEMICOLON);
      
      return new ParseResult(
        new VarDecStmt(firstToken.lexeme, idToken.lexeme), 
        startPosition + 3
      );
    } 
    
    
    if (firstToken.type === TokenType.IDENTIFIER) {
      this.assertTokenHereIs(startPosition + 1, TokenType.ASSIGN);
      
      const expResult = this.parseExp(startPosition + 2);
      this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
      
      return new ParseResult(
        new AssignStmt(firstToken.lexeme, expResult.result),
        expResult.nextPos + 1
      );
    }
    
    throw new ParseException(`Expected statement, got: ${firstToken.type} at line ${firstToken.line}`);
  }

  
  parseProgram() {
    const stmts = [];
    let currentPosition = 0;
    
    while (currentPosition < this.tokens.length) {
      const curToken = this.getToken(currentPosition);
      
      // Stop parsing if we hit the EOF token 
      if (curToken.type === TokenType.EOF) {
        break;
      }
      
      const stmtResult = this.parseStmt(currentPosition);
      stmts.push(stmtResult.result);
      currentPosition = stmtResult.nextPos;
    }

    return new Program(stmts);
  }
}