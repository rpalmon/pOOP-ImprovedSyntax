// parser.js
import { TokenType } from "./tokenTypes.js";
import {
  IdentifierExpr, IntegerExpr, StringExpr, ParenExpr, BinaryExpr,
  BooleanExpr, NewExpr, ThisExpr, SuperExpr, MethodCallExpr, FieldAccessExpr,
  VarDeclStmt, AssignStmt, ReturnStmt, PrintlnStmt, IfStmt, WhileStmt, BreakStmt, ExprStmt,
  ClassDef, InitDef, MethodDef, Param,
  Program
} from "./ast.js";

export class ParseResult {
  constructor(result, nextPos) {
    this.result = result;
    this.nextPos = nextPos;
  }
}

export class ParseException extends Error {
  constructor(message) {
    super(message);
    this.name = "ParseException";
  }
}

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
        return new ParseResult("+", startPosition + 1);
      case TokenType.MINUS:
        return new ParseResult("-", startPosition + 1);
      case TokenType.STAR:
        return new ParseResult("*", startPosition + 1);
      case TokenType.SLASH:
        return new ParseResult("/", startPosition + 1);
      case TokenType.AND:
        return new ParseResult("&&", startPosition + 1);
      default:
        throw new ParseException(`Expected operator, got: ${token.type}`);
    }
  }

  // primaryExp ::= IDENTIFIER | INTEGER | BOOLEAN | `(` exp `)` | `this` | `super` | `new` IDENTIFIER `(` args `)`
  parsePrimaryExp(startPosition) {
    const firstToken = this.getToken(startPosition);

    switch (firstToken.type) {
      case TokenType.IDENTIFIER:
        return new ParseResult(new IdentifierExpr(firstToken.lexeme), startPosition + 1);
      case TokenType.INTEGER:
        return new ParseResult(new IntegerExpr(firstToken.literal), startPosition + 1);
      case TokenType.STRING:
        return new ParseResult(new StringExpr(firstToken.literal), startPosition + 1);
      case TokenType.LPAREN: {
        const exp = this.parseExp(startPosition + 1);
        this.assertTokenHereIs(exp.nextPos, TokenType.RPAREN);
        return new ParseResult(new ParenExpr(exp.result), exp.nextPos + 1);
      }
      case TokenType.TRUE:
      case TokenType.FALSE:
        return new ParseResult(new BooleanExpr(firstToken.type === TokenType.TRUE), startPosition + 1);
      case TokenType.THIS:
        return new ParseResult(new ThisExpr(), startPosition + 1);
      case TokenType.SUPER: {
        if (this.getToken(startPosition + 1).type === TokenType.LPAREN) {
          const argsResult = this.parseArgs(startPosition + 1);
          return new ParseResult(new SuperExpr(null, argsResult.result), argsResult.nextPos);
        }
        return new ParseResult(new SuperExpr(null, []), startPosition + 1);
      }
      case TokenType.NEW: {
        const idToken = this.getToken(startPosition + 1);
        if (idToken.type !== TokenType.IDENTIFIER) {
          throw new ParseException(`Expected identifier after 'new', got: ${idToken.type} at line ${idToken.line}`);
        }
        const argsResult = this.parseArgs(startPosition + 2);
        return new ParseResult(new NewExpr(idToken.lexeme, argsResult.result), argsResult.nextPos);
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
      if (exp instanceof SuperExpr) {
        return new ParseResult(exp, argsResult.nextPos);
      }
      return new ParseResult(new MethodCallExpr(exp, idToken.lexeme, argsResult.result), argsResult.nextPos);
    } else {
      return new ParseResult(new FieldAccessExpr(exp, idToken.lexeme), startPosition + 2);
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

            currentExp = new BinaryExpr(currentExp, opResult.result, nextExp);
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

        if (this.getToken(startPosition + 2).type === TokenType.SEMICOLON) {
          return new ParseResult(new VarDeclStmt(firstToken.lexeme, idToken.lexeme), startPosition + 3);
        }

        if (this.getToken(startPosition + 2).type === TokenType.ASSIGN) {
          const exprResult = this.parseExp(startPosition + 3);
          this.assertTokenHereIs(exprResult.nextPos, TokenType.SEMICOLON);
          return new ParseResult(new VarDeclStmt(firstToken.lexeme, idToken.lexeme, exprResult.result), exprResult.nextPos + 1);
        }

        throw new ParseException(`Expected ';' or '=' after variable declaration, got: ${this.getToken(startPosition + 2).type} at line ${this.getToken(startPosition + 2).line}`);
      }
      case TokenType.IDENTIFIER: {
        //let-style declaration: let x = 5;
        if (firstToken.lexeme === "let") {
          this.assertTokenHereIs(startPosition + 1, TokenType.IDENTIFIER);
          const idToken = this.getToken(startPosition + 1);
          this.assertTokenHereIs(startPosition + 2, TokenType.ASSIGN);
          const expResult = this.parseExp(startPosition + 3);
          this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
          return new ParseResult(new VarDeclStmt("let", idToken.lexeme, expResult.result), expResult.nextPos + 1);
        }

        //class type declaration: Animal Cat;
        if (this.getToken(startPosition + 1).type === TokenType.IDENTIFIER && 
        this.getToken(startPosition + 2).type === TokenType.SEMICOLON ) {
          const varName = this.getToken(startPosition + 1);
          return new ParseResult(new VarDeclStmt(firstToken.lexeme, varName.lexeme), startPosition + 3);
        }
        
        //expression statement like cat.speak();
        if (this.getToken(startPosition + 1).type === TokenType.DOT) {
          const expResult = this.parseExp(startPosition);
          this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
          return new ParseResult(new ExprStmt(expResult.result), expResult.nextPos + 1);
        }
        
        //assignment: x = ...
        this.assertTokenHereIs(startPosition + 1, TokenType.ASSIGN);
        const expResult = this.parseExp(startPosition + 2);
        this.assertTokenHereIs(expResult.nextPos, TokenType.SEMICOLON);
        return new ParseResult(new AssignStmt(new IdentifierExpr(firstToken.lexeme), expResult.result), expResult.nextPos + 1);
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
          return new ParseResult(new AssignStmt(lhsResult.result, rhsResult.result), rhsResult.nextPos + 1);
        }

        this.assertTokenHereIs(lhsResult.nextPos, TokenType.SEMICOLON);
        return new ParseResult(new ExprStmt(lhsResult.result), lhsResult.nextPos + 1);
      }

      case TokenType.SUPER: {
        const exprResult = this.parseExp(startPosition);
        this.assertTokenHereIs(exprResult.nextPos, TokenType.SEMICOLON);
        return new ParseResult(new ExprStmt(exprResult.result), exprResult.nextPos + 1);
      }
      default:
        throw new ParseException(`Expected statement, got: ${firstToken.type} at line ${firstToken.line}`);
    }
  }

  // return ::= `return` exp? `;`
  parseReturn(startPosition) {
    this.assertTokenHereIs(startPosition, TokenType.RETURN);
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
      if (stmtResult.result !== null) {
        stmts.push(stmtResult.result);
      }
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

        switch (firstToken.type) {
          case TokenType.INT_TYPE:
          case TokenType.BOOLEAN_TYPE:
          case TokenType.VOID_TYPE:
            if (secondToken.type !== TokenType.IDENTIFIER) {
              throw new ParseException(`Expected parameter name, got: ${secondToken.type} at line ${secondToken.line}`);
            }
            params.push(new Param(firstToken.lexeme, secondToken.lexeme));
            currentPosition += 2;
            break;
          case TokenType.IDENTIFIER:
            params.push(new Param(null, firstToken.lexeme));
            currentPosition += 1;
            break;
          default:
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

    switch (firstToken.type) {
      case TokenType.METHOD: {
        const nextToken = this.getToken(startPosition + 1);
        switch (nextToken.type) {
          case TokenType.IDENTIFIER:
            methodName = nextToken.lexeme;
            paramsStart = startPosition + 2;
            break;
          case TokenType.LPAREN:
            methodName = "method";
            paramsStart = startPosition + 1;
            break;
          default:
            throw new ParseException(`Expected method name, got: ${nextToken.type} at line ${nextToken.line}`);
        }
        break;
      }
      case TokenType.IDENTIFIER:
        methodName = firstToken.lexeme;
        paramsStart = startPosition + 1;
        break;
      default:
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
    this.assertTokenHereIs(startPosition + 1, TokenType.IDENTIFIER);
    const idToken = this.getToken(startPosition + 1);
    let currentPosition = startPosition + 2;
    let superClass = null;

    if (this.getToken(currentPosition).type === TokenType.EXTENDS) {
      this.assertTokenHereIs(currentPosition + 1, TokenType.IDENTIFIER);
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
    const classDefs = [];
    const stmts = [];
    let currentPosition = 0;

    //parse classes first
    while (this.getToken(currentPosition).type === TokenType.CLASS) {
      const classResult = this.parseClass(currentPosition);
      classDefs.push(classResult.result);
      currentPosition = classResult.nextPos;
    }

    //then parse statements until EOF
    while (this.getToken(currentPosition).type !== TokenType.EOF) {
      const stmtResult = this.parseStmt(currentPosition);
      stmts.push(stmtResult.result);
      currentPosition = stmtResult.nextPos;
    }

    return new Program(classDefs, stmts);
  }
}