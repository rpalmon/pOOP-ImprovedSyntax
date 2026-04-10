// parser.js
import { TokenType } from "./tokenTypes.js";
import {
  ParseResult, ParseException,
  IdentifierExp, IntegerExp, StringExp, ParenExp, BinopExp,
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

  // op ::= `+` | `-` | `*` | `/` | `&&`
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
        return new ParseResult(new AndOp(), startPosition + 1);
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
      case TokenType.STRING:
        return new ParseResult(new StringExp(firstToken.literal), startPosition + 1);
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
    this.assertTokenHereIs(startPosition, TokenType.LPAREN);
    const args = [];
    let currentPosition = startPosition + 1;

    if (this.getToken(currentPosition).type !== TokenType.RPAREN) {
      const firstArg = this.parseExp(currentPosition);
      args.push(firstArg.result);
      currentPosition = firstArg.nextPos;

      while (this.getToken(currentPosition).type === TokenType.COMMA) {
        currentPosition++;
        const nextArg = this.parseExp(currentPosition);
        args.push(nextArg.result);
        currentPosition = nextArg.nextPos;
      }
    }

    this.assertTokenHereIs(currentPosition, TokenType.RPAREN);
    return new ParseResult(args, currentPosition + 1);
  }

  // parseDotSuffix -- handles .field and .method(args) after a primary exp
  parseDotSuffix(exp, startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.DOT);
    const idToken = this.getToken(startPosition + 1);
    if (idToken.type !== TokenType.IDENTIFIER && idToken.type !== TokenType.METHOD) {
      throw new ParseException(`Expected identifier after '.', got: ${idToken.type} at line ${idToken.line}`);
    }

    if (this.getToken(startPosition + 2).type === TokenType.LPAREN) {
      const argsResult = this.parseArgs(startPosition + 2);
      if (exp instanceof SuperExp) {
        return new ParseResult(exp, argsResult.nextPos);
      }
      return new ParseResult(new MethodCallExp(exp, idToken.lexeme, argsResult.result), argsResult.nextPos);
    } else {
      return new ParseResult(new FieldAccessExp(exp, idToken.lexeme), startPosition + 2);
    }
  }

  // addExp ::= primaryExp (op primaryExp)* with dot suffix support
  parseAddExp(startPosition) {
    let primary = this.parsePrimaryExp(startPosition);
    let currentExp = primary.result;
    let currentPosition = primary.nextPos;

    while (this.getToken(currentPosition).type === TokenType.DOT) {
      const dotResult = this.parseDotSuffix(currentExp, currentPosition);
      currentExp = dotResult.result;
      currentPosition = dotResult.nextPos;
    }

    while (true) {
      try {
        const curToken = this.getToken(currentPosition);

        switch (curToken.type) {
          case TokenType.PLUS:
          case TokenType.MINUS:
          case TokenType.STAR:
          case TokenType.SLASH:
          case TokenType.AND: {
            const opResult = this.parseOp(currentPosition);
            let nextPrimary = this.parsePrimaryExp(opResult.nextPos);
            let nextExp = nextPrimary.result;
            let nextPos = nextPrimary.nextPos;

            while (this.getToken(nextPos).type === TokenType.DOT) {
              const dotResult = this.parseDotSuffix(nextExp, nextPos);
              nextExp = dotResult.result;
              nextPos = dotResult.nextPos;
            }

            currentExp = new BinopExp(currentExp, opResult.result, nextExp);
            currentPosition = nextPos;
            break;
          }
          default:
            throw new ParseException(`Not an operator: ${curToken.type}`);
        }
      } catch (e) {
        return new ParseResult(currentExp, currentPosition);
      }
    }
  }

  // exp ::= addExp
  parseExp(startPosition) {
    return this.parseAddExp(startPosition);
  }

  // stmt ::= vardec | assignment | return | println | if | while | break
  parseStmt(startPosition) {
    const firstToken = this.getToken(startPosition);

    switch (firstToken.type) {
      case TokenType.INT_TYPE:

      case TokenType.BOOLEAN_TYPE:

      case TokenType.VOID_TYPE: {
        this.assertTokenHereIs(startPosition + 1, TokenType.IDENTIFIER);
        const idToken = this.getToken(startPosition + 1);
        this.assertTokenHereIs(startPosition + 2, TokenType.SEMICOLON);
        return new ParseResult(new VarDecStmt(firstToken.lexeme, idToken.lexeme), startPosition + 3);
      }
      case TokenType.IDENTIFIER: {
        if (firstToken.lexeme === "let") {
          this.assertTokenHereIs(startPosition + 1, TokenType.IDENTIFIER);
          const idToken = this.getToken(startPosition + 1);
          this.assertTokenHereIs(startPosition + 2, TokenType.ASSIGN);
          const expResult = this.parseExp(startPosition + 3);
          this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
          return new ParseResult(new VarDecStmt("let", idToken.lexeme), expResult.nextPos + 1);
        }

        if (this.getToken(startPosition + 1).type === TokenType.DOT) {
          const expResult = this.parseExp(startPosition);
          this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
          return new ParseResult(null, expResult.nextPos + 1);
        }

        this.assertTokenHereIs(startPosition + 1, TokenType.ASSIGN);
        const expResult = this.parseExp(startPosition + 2);
        this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
        return new ParseResult(new AssignStmt(firstToken.lexeme, expResult.result), expResult.nextPos + 1);
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
      case TokenType.THIS: {
        const lhsResult = this.parseExp(startPosition);
        if (this.getToken(lhsResult.nextPos).type === TokenType.ASSIGN) {
          const rhsResult = this.parseExp(lhsResult.nextPos + 1);
          this.assertTokenHereIs(rhsResult.nextPos, TokenType.SEMICOLON);
          return new ParseResult(new AssignStmt("this", rhsResult.result), rhsResult.nextPos + 1);
        }

        this.assertTokenHereIs(lhsResult.nextPos, TokenType.SEMICOLON);
        return new ParseResult(null, lhsResult.nextPos + 1);
      }
      case TokenType.CLASS:
        return this.parseClass(startPosition);
      default:
        throw new ParseException(`Expected statement, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // return ::= `return` exp? `;`
  parseReturn(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.RETURN);
    const nextToken = this.getToken(startPosition + 1);
    if (nextToken.type === TokenType.SEMICOLON) {
      return new ParseResult(new ReturnStmt(null), startPosition + 2);
    } else {
      const expResult = this.parseExp(startPosition + 1);
      this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
      return new ParseResult(new ReturnStmt(expResult.result), expResult.nextPos + 1);
    }
  }

  // println ::= `println` `(` exp `)` `;`
  parsePrintln(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.PRINTLN);
    this.assertTokenHereIs(startPosition + 1, TokenType.LPAREN);
    const expResult = this.parseExp(startPosition + 2);
    this.assertTokenHereIs(expResult.nextPos, TokenType.RPAREN);
    this.assertTokenHereIs(expResult.nextPos + 1, TokenType.SEMICOLON);
    return new ParseResult(new PrintlnStmt(expResult.result), expResult.nextPos + 2);
  }

  // if ::= `if` `(` exp `)` `{` stmt* `}` (`else` `{` stmt* `}`)?
  parseIf(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.IF);
    this.assertTokenHereIs(startPosition + 1, TokenType.LPAREN);
    const condResult = this.parseExp(startPosition + 2);
    this.assertTokenHereIs(condResult.nextPos, TokenType.RPAREN);
    const thenResult = this.parseBody(condResult.nextPos + 1);

    let currentPosition = thenResult.nextPos;
    let elseBranch = null;
    if (this.getToken(currentPosition).type === TokenType.ELSE) {
      const elseResult = this.parseBody(currentPosition + 1);
      elseBranch = elseResult.result;
      currentPosition = elseResult.nextPos;
    }

    return new ParseResult(new IfStmt(condResult.result, thenResult.result, elseBranch), currentPosition);
  }

  // while ::= `while` `(` exp `)` `{` stmt* `}`
  parseWhile(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.WHILE);
    this.assertTokenHereIs(startPosition + 1, TokenType.LPAREN);
    const condResult = this.parseExp(startPosition + 2);
    this.assertTokenHereIs(condResult.nextPos, TokenType.RPAREN);
    const bodyResult = this.parseBody(condResult.nextPos + 1);
    return new ParseResult(new WhileStmt(condResult.result, bodyResult.result), bodyResult.nextPos);
  }

  // break ::= `break` `;`
  parseBreak(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.BREAK);
    this.assertTokenHereIs(startPosition + 1, TokenType.SEMICOLON);
    return new ParseResult(new BreakStmt(), startPosition + 2);
  }

  // parseBody ::= `{` stmt* `}`
  parseBody(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.LBRACE);
    const stmts = [];
    let currentPosition = startPosition + 1;

    while (this.getToken(currentPosition).type !== TokenType.RBRACE) {
      const stmtResult = this.parseStmt(currentPosition);
      stmts.push(stmtResult.result);
      currentPosition = stmtResult.nextPos;
    }

    return new ParseResult(stmts, currentPosition + 1);
  }

  // parseParams ::= `(` (type IDENTIFIER (`,` type IDENTIFIER)*)? `)`
  parseParams(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.LPAREN);
    const params = [];
    let currentPosition = startPosition + 1;

    if (this.getToken(currentPosition).type !== TokenType.RPAREN) {
      while (true) {
        const firstToken = this.getToken(currentPosition);
        const secondToken = this.getToken(currentPosition + 1);

        if (
          (firstToken.type === TokenType.INT_TYPE || firstToken.type === TokenType.BOOLEAN_TYPE || firstToken.type === TokenType.VOID_TYPE) &&
          secondToken.type === TokenType.IDENTIFIER
        ) {
          params.push({ type: firstToken.lexeme, name: secondToken.lexeme });
          currentPosition += 2;
        } else if (firstToken.type === TokenType.IDENTIFIER) {
          params.push({ type: null, name: firstToken.lexeme });
          currentPosition += 1;
        } else {
          throw new ParseException(`Expected parameter, got: ${firstToken.type} at line ${firstToken.line}`);
        }

        if (this.getToken(currentPosition).type !== TokenType.COMMA) {
          break;
        }

        currentPosition++;
      }
    }

    this.assertTokenHereIs(currentPosition, TokenType.RPAREN);
    return new ParseResult(params, currentPosition + 1);
  }

  // init ::= `init` `(` params `)` `{` stmt* `}`
  parseInit(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.INIT);
    const paramsResult = this.parseParams(startPosition + 1);
    const bodyResult = this.parseBody(paramsResult.nextPos);
    return new ParseResult(new InitDef(paramsResult.result, bodyResult.result), bodyResult.nextPos);
  }

  // method ::= `method` IDENTIFIER `(` params `)` returnType `{` stmt* `}`
  parseMethod(startPosition) {
    const firstToken = this.getToken(startPosition);
    let methodName = null;
    let paramsStart = null;
    let currentPosition = startPosition;

    if (firstToken.type === TokenType.METHOD) {
      const nextToken = this.getToken(startPosition + 1);
      if (nextToken.type === TokenType.IDENTIFIER) {
        methodName = nextToken.lexeme;
        paramsStart = startPosition + 2;
      } else if (nextToken.type === TokenType.LPAREN) {
        methodName = "method";
        paramsStart = startPosition + 1;
      } else {
        throw new ParseException(`Expected method name, got: ${nextToken.type} at line ${nextToken.line}`);
      }
    } else if (firstToken.type === TokenType.IDENTIFIER) {
      methodName = firstToken.lexeme;
      paramsStart = startPosition + 1;
    } else {
      throw new ParseException(`Expected method definition, got: ${firstToken.type} at line ${firstToken.line}`);
    }

    const paramsResult = this.parseParams(paramsStart);
    currentPosition = paramsResult.nextPos;

    let returnType = null;
    if (
      this.getToken(currentPosition).type === TokenType.INT_TYPE ||
      this.getToken(currentPosition).type === TokenType.BOOLEAN_TYPE ||
      this.getToken(currentPosition).type === TokenType.VOID_TYPE ||
      this.getToken(currentPosition).type === TokenType.IDENTIFIER
    ) {
      if (this.getToken(currentPosition + 1).type === TokenType.LBRACE) {
        returnType = this.getToken(currentPosition).lexeme;
        currentPosition += 1;
      }
    }

    const bodyResult = this.parseBody(currentPosition);
    return new ParseResult(new MethodDef(methodName, paramsResult.result, returnType, bodyResult.result), bodyResult.nextPos);
  }

  // class ::= `class` IDENTIFIER (`extends` IDENTIFIER)? `{` init? method* `}`
  parseClass(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.CLASS);
    const idToken = this.getToken(startPosition + 1);
    let currentPosition = startPosition + 2;
    let superClass = null;

    if (this.getToken(currentPosition).type === TokenType.EXTENDS) {
      superClass = this.getToken(currentPosition + 1).lexeme;
      currentPosition += 2;
    }

    this.assertTokenHereIs(currentPosition, TokenType.LBRACE);
    currentPosition++;

    let initDef = null;
    if (this.getToken(currentPosition).type === TokenType.INIT) {
      const initResult = this.parseInit(currentPosition);
      initDef = initResult.result;
      currentPosition = initResult.nextPos;
    }

    const methodDefs = [];
    while (this.getToken(currentPosition).type === TokenType.METHOD || this.getToken(currentPosition).type === TokenType.IDENTIFIER) {
      const methodResult = this.parseMethod(currentPosition);
      methodDefs.push(methodResult.result);
      currentPosition = methodResult.nextPos;
    }

    this.assertTokenHereIs(currentPosition, TokenType.RBRACE);
    currentPosition++;

    return new ParseResult(new ClassDef(idToken.lexeme, superClass, initDef, methodDefs), currentPosition);
  }

  parseProgram() {
    const stmts = [];
    let currentPosition = 0;

    while (currentPosition < this.tokens.length) {
      const curToken = this.getToken(currentPosition);
      if (curToken.type === TokenType.EOF) break;

      const stmtResult = this.parseStmt(currentPosition);
      if (stmtResult.result !== null) {
        stmts.push(stmtResult.result);
      }
      currentPosition = stmtResult.nextPos;
    }

    return new Program(stmts);
  }
}
