// parser.js
import { TokenType } from "./tokenTypes.js";
import {
  ParseResult, ParseException,
  IdentifierExp, IntegerExp, ParenExp, BinopExp,
  PlusOp, MinusOp, StarOp, SlashOp, AndOp,
  BooleanLiteral, NewExp, ThisExp, SuperExp, MethodCallExp, FieldAccessExp,
  VarDecStmt, AssignStmt, ReturnStmt, PrintlnStmt, IfStmt, WhileStmt, BreakStmt,
  ClassDef, InitDef, MethodDef,
  Program
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

  // op ::= `+` | `-` | `*` | `/` | `&&` | `&`
  parseOp(startPosition) {
    const token = this.getToken(startPosition);
    switch (token.type) {
      case TokenType.PLUS:
        return new ParseResult(new PlusOp(), startPosition + 1);
      case TokenType.MINUS:
        return new ParseResult(new MinusOp(), startPosition + 1);
      case TokenType.STAR:
        return new ParseResult(new StarOp(), startPosition + 1);
      case TokenType.SLASH:
        return new ParseResult(new SlashOp(), startPosition + 1);
      case TokenType.AND:
        // TODO: implement AndOp parsing
        return new ParseResult(new AndOp(), startPosition + 1);
      case TokenType.BOOLEAN_LITERAL:
        // TODO: implement BooleanLiteral parsing
        return new ParseResult(new BooleanLiteral(token.literal), startPosition + 1);
      default:
        throw new ParseException(`Expected operator, got: ${token.type}`);
    }
  }

  // primaryExp ::= IDENTIFIER | INTEGER | BOOLEAN | `(` exp `)` | `this` | `super` | `new` IDENTIFIER `(` args `)`
  parsePrimaryExp(startPosition) {
    const firstToken = this.getToken(startPosition);

    switch (firstToken.type) {
      case TokenType.IDENTIFIER:
        return new ParseResult(new IdentifierExp(firstToken.lexeme), startPosition + 1);
      case TokenType.INTEGER:
        return new ParseResult(new IntegerExp(firstToken.literal), startPosition + 1);
      case TokenType.LPAREN: {
        const exp = this.parseExp(startPosition + 1);
        this.assertTokenHereIs(exp.nextPos, TokenType.RPAREN);
        return new ParseResult(new ParenExp(exp.result), exp.nextPos + 1);
      }
      case TokenType.TRUE:
      case TokenType.FALSE:
        return new ParseResult(new BooleanLiteral(firstToken.type === TokenType.TRUE), startPosition + 1);
      case TokenType.THIS:
        return new ParseResult(new ThisExp(), startPosition + 1);
      case TokenType.SUPER:
        return new ParseResult(new SuperExp(), startPosition + 1);
      case TokenType.NEW: {
        const idToken = this.getToken(startPosition + 1);
        if (idToken.type !== TokenType.IDENTIFIER) {
          throw new ParseException(`Expected identifier after 'new', got: ${idToken.type} at line ${idToken.line}`);
        }
        const argsResult = this.parseArgs(startPosition + 2);
        return new ParseResult(new NewExp(idToken.lexeme, argsResult.result), argsResult.nextPos);
      }
      default:
        throw new ParseException(`Expected primary exp; found: ${firstToken.type}`);
    }
  }

  // parseArgs ::= `(` (exp (`,` exp)*)? `)`
  parseArgs(startPosition) {
    // TODO: implement argument list parsing
  }

  // parseDotSuffix — handles .field and .method(args) after a primary exp
  parseDotSuffix(exp, startPosition) {
    // TODO: implement dot access and method call parsing
  }

  // addExp ::= primaryExp ((`+` | `-` | `*` | `/`) primaryExp)*

  parseAddExp(startPosition) {
    const initialPrimaryExp = this.parsePrimaryExp(startPosition);
    let currentExp = initialPrimaryExp.result;
    let currentPosition = initialPrimaryExp.nextPos;
    
    while (true) {
      try {
        const curToken = this.getToken(currentPosition);

        switch (curToken.type) {
          case TokenType.PLUS:
          case TokenType.MINUS:
          case TokenType.STAR:
          case TokenType.SLASH: {
            const opResult = this.parseOp(currentPosition);
            const nextExp = this.parsePrimaryExp(opResult.nextPos);

            currentExp = new BinopExp(currentExp, opResult.result, nextExp.result);
            currentPosition = nextExp.nextPos;
            break;
          }
          default:
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

  // stmt ::= vardec | assignment | return | println | if | while | break
  // vardec ::= type IDENTIFIER `;`
  // assignment ::= IDENTIFIER `=` exp `;`
  parseStmt(startPosition) {
    const firstToken = this.getToken(startPosition);

    switch (firstToken.type) {
      case TokenType.INT_TYPE:
      case TokenType.BOOLEAN_TYPE:
      case TokenType.VOID_TYPE: {
        this.assertTokenHereIs(startPosition + 1, TokenType.IDENTIFIER);
        const idToken = this.getToken(startPosition + 1);
        this.assertTokenHereIs(startPosition + 2, TokenType.SEMICOLON);

        return new ParseResult(
          new VarDecStmt(firstToken.lexeme, idToken.lexeme),
          startPosition + 3
        );
      }
      case TokenType.IDENTIFIER: {
        this.assertTokenHereIs(startPosition + 1, TokenType.ASSIGN);
        const expResult = this.parseExp(startPosition + 2);
        this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);

        return new ParseResult(
          new AssignStmt(firstToken.lexeme, expResult.result),
          expResult.nextPos + 1
        );
      }
      case TokenType.RETURN:
        return this.parseReturn(startPosition);
      case TokenType.PRINTLN:
        return this.parsePrintln(startPosition);
      case TokenType.IF:
        return this.parseIf(startPosition);
      case TokenType.WHILE:
        return this.parseWhile(startPosition);
      case TokenType.BREAK:
        return this.parseBreak(startPosition);
      default:
        throw new ParseException(`Expected statement, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // return ::= `return` exp? `;`
  parseReturn(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.RETURN: {
        const nextToken = this.getToken(startPosition + 1);
        switch (nextToken.type) {
          case TokenType.SEMICOLON:
            return new ParseResult(new ReturnStmt(null), startPosition + 2);
          default: {
            const expResult = this.parseExp(startPosition + 1);
            this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
            return new ParseResult(new ReturnStmt(expResult.result), expResult.nextPos + 1);
          }
        }
      }
      default:
        throw new ParseException(`Expected return statement, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // println ::= `println` `(` exp `)` `;`
  parsePrintln(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.PRINTLN: {
        const expResult = this.parseExp(startPosition + 2);
        this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
        return new ParseResult(new PrintlnStmt(expResult.result), expResult.nextPos + 1);
      }
      default:
        throw new ParseException(`Expected println statement, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // if ::= `if` `(` exp `)` `{` stmt* `}` (`else` `{` stmt* `}`)?
  parseIf(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.IF: {
        const expResult = this.parseExp(startPosition + 2);
        const thenResult = this.parseBody(expResult.nextPos);
        const elseResult = this.parseBody(thenResult.nextPos);
        return new ParseResult(new IfStmt(expResult.result, thenResult.result, elseResult.result), elseResult.nextPos);
      }
      default:
        throw new ParseException(`Expected if statement, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // while ::= `while` `(` exp `)` `{` stmt* `}`
  parseWhile(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.WHILE: {
        const expResult = this.parseExp(startPosition + 2);
        const bodyResult = this.parseBody(expResult.nextPos);
        return new ParseResult(new WhileStmt(expResult.result, bodyResult.result), bodyResult.nextPos);
      }
      default:
        throw new ParseException(`Expected while statement, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // break ::= `break` `;`
  parseBreak(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.BREAK:
        this.assertTokenHereIs(startPosition + 1, TokenType.SEMICOLON);
        return new ParseResult(new BreakStmt(), startPosition + 2);
      default:
        throw new ParseException(`Expected break statement, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // parseBody ::= `{` stmt* `}`
  parseBody(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.LBRACE:
        break;
      default:
        throw new ParseException(`Expected { to start block body, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // parseParams ::= `(` (type IDENTIFIER (`,` type IDENTIFIER)*)? `)`
  parseParams(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.LPAREN:
        return new ParseResult([], startPosition + 1);
      default:
        throw new ParseException(`Expected ( to start parameter list, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // init ::= `init` `(` params `)` `{` stmt* `}`
  parseInit(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.INIT: {
        const paramsResult = this.parseParams(startPosition + 2);
        const bodyResult = this.parseBody(paramsResult.nextPos);
        return new ParseResult(new InitDef(paramsResult.result, bodyResult.result), bodyResult.nextPos);
      }
      default:
        throw new ParseException(`Expected init definition, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // method ::= `method` IDENTIFIER `(` params `)` type `{` stmt* `}`
  parseMethod(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.METHOD: {
        const idToken = this.getToken(startPosition + 1);
        const paramsResult = this.parseParams(startPosition + 3);
        const returnTypeToken = this.getToken(paramsResult.nextPos);
        const bodyResult = this.parseBody(returnTypeToken.nextPos);
        return new ParseResult(new MethodDef(idToken.lexeme, paramsResult.result, returnTypeToken.lexeme, bodyResult.result), bodyResult.nextPos);
      }
      default:
        throw new ParseException(`Expected method definition, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // class ::= `class` IDENTIFIER (`extends` IDENTIFIER)? `{` init? method* `}`
  parseClass(startPosition) {
    const firstToken = this.getToken(startPosition);
    switch (firstToken.type) {
      case TokenType.CLASS: {
        const idToken = this.getToken(startPosition + 1);
        let currentPosition = startPosition + 2;
        let superClass = null;

        switch (this.getToken(currentPosition).type) {
          case TokenType.EXTENDS:
            superClass = this.getToken(currentPosition + 1).lexeme;
            currentPosition += 2;
            break;
          default:
            break;
        }

        const initResult = this.parseInit(currentPosition);
        let initDef = null;

        if (initResult.result) {
          initDef = initResult.result;
          currentPosition = initResult.nextPos;
        }

        const methodDefs = [];
        while (this.getToken(currentPosition).type === TokenType.METHOD) {
          const methodResult = this.parseMethod(currentPosition);
          methodDefs.push(methodResult.result);
          currentPosition = methodResult.nextPos;
        }

        const bodyResult = this.parseBody(currentPosition);
        return new ParseResult(new ClassDef(idToken.lexeme, superClass, initDef, methodDefs), bodyResult.nextPos);
      }
      default:
        throw new ParseException(`Expected class definition, got: ${firstToken.type} at line ${firstToken.line}`);
    }
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
