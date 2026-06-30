/*globals define*/
/*eslint-env node, browser*/
/**
 * Expression AST helpers: parse source text, evaluate, execute statements.
 * Shared by simulation engine and model export (body attribute decoding).
 */
define([], function () {
    'use strict';

    var BINARY_OPS = ['||', '&&', '==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/'];

    function numberLiteral(value) {
        return { kind: 'number', value: value };
    }

    function stringLiteral(value) {
        return { kind: 'string', value: value };
    }

    function boolLiteral(value) {
        return { kind: 'bool', value: value };
    }

    function varRef(name) {
        return { kind: 'var', name: name };
    }

    function binary(op, left, right) {
        return { kind: 'binary', op: op, left: left, right: right };
    }

    function unary(op, arg) {
        return { kind: 'unary', op: op, arg: arg };
    }

    function parseExprSource(source) {
        var tokens = tokenize(String(source || '').trim());
        var parser = new Parser(tokens);
        var expr = parser.parseExpression();
        parser.expectEnd();
        return expr;
    }

    function tokenize(source) {
        var tokens = [];
        var i = 0;

        function peek() {
            return source[i];
        }

        function advance() {
            return source[i++];
        }

        while (i < source.length) {
            var ch = peek();
            if (/\s/.test(ch)) {
                i += 1;
                continue;
            }
            if (ch === '"' || ch === '\'') {
                var quote = advance();
                var value = '';
                while (i < source.length && peek() !== quote) {
                    value += advance();
                }
                if (peek() === quote) {
                    advance();
                }
                tokens.push({ type: 'string', value: value });
                continue;
            }
            if (/[0-9.]/.test(ch)) {
                var num = '';
                while (i < source.length && /[0-9.]/.test(peek())) {
                    num += advance();
                }
                tokens.push({ type: 'number', value: parseFloat(num) });
                continue;
            }
            if (/[a-zA-Z_]/.test(ch)) {
                var ident = '';
                while (i < source.length && /[a-zA-Z0-9_]/.test(peek())) {
                    ident += advance();
                }
                if (ident === 'true' || ident === 'false') {
                    tokens.push({ type: 'bool', value: ident === 'true' });
                } else {
                    tokens.push({ type: 'ident', value: ident });
                }
                continue;
            }
            var two = source.slice(i, i + 2);
            if (BINARY_OPS.indexOf(two) >= 0) {
                tokens.push({ type: 'op', value: two });
                i += 2;
                continue;
            }
            if ('+-*/(),!<>'.indexOf(ch) >= 0) {
                tokens.push({ type: 'op', value: ch });
                i += 1;
                continue;
            }
            throw new Error('Unexpected character in expression: ' + ch);
        }
        return tokens;
    }

    function Parser(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    Parser.prototype.peek = function () {
        return this.tokens[this.pos];
    };

    Parser.prototype.advance = function () {
        return this.tokens[this.pos++];
    };

    Parser.prototype.expectEnd = function () {
        if (this.peek()) {
            throw new Error('Unexpected token: ' + JSON.stringify(this.peek()));
        }
    };

    Parser.prototype.parseExpression = function () {
        return this.parseOr();
    };

    Parser.prototype.parseOr = function () {
        var left = this.parseAnd();
        while (this.peek() && this.peek().type === 'op' && this.peek().value === '||') {
            this.advance();
            left = binary('||', left, this.parseAnd());
        }
        return left;
    };

    Parser.prototype.parseAnd = function () {
        var left = this.parseEquality();
        while (this.peek() && this.peek().type === 'op' && this.peek().value === '&&') {
            this.advance();
            left = binary('&&', left, this.parseEquality());
        }
        return left;
    };

    Parser.prototype.parseEquality = function () {
        var left = this.parseRelational();
        while (this.peek() && this.peek().type === 'op' && (this.peek().value === '==' || this.peek().value === '!=')) {
            var op = this.advance().value;
            left = binary(op, left, this.parseRelational());
        }
        return left;
    };

    Parser.prototype.parseRelational = function () {
        var left = this.parseAdditive();
        while (this.peek() && this.peek().type === 'op' &&
            ['<', '<=', '>', '>='].indexOf(this.peek().value) >= 0) {
            var op = this.advance().value;
            left = binary(op, left, this.parseAdditive());
        }
        return left;
    };

    Parser.prototype.parseAdditive = function () {
        var left = this.parseMultiplicative();
        while (this.peek() && this.peek().type === 'op' && (this.peek().value === '+' || this.peek().value === '-')) {
            var op = this.advance().value;
            left = binary(op, left, this.parseMultiplicative());
        }
        return left;
    };

    Parser.prototype.parseMultiplicative = function () {
        var left = this.parseUnary();
        while (this.peek() && this.peek().type === 'op' && (this.peek().value === '*' || this.peek().value === '/')) {
            var op = this.advance().value;
            left = binary(op, left, this.parseUnary());
        }
        return left;
    };

    Parser.prototype.parseUnary = function () {
        if (this.peek() && this.peek().type === 'op' && (this.peek().value === '!' || this.peek().value === '-')) {
            var op = this.advance().value;
            return unary(op, this.parseUnary());
        }
        return this.parsePrimary();
    };

    Parser.prototype.parsePrimary = function () {
        var token = this.peek();
        if (!token) {
            throw new Error('Unexpected end of expression');
        }
        if (token.type === 'number') {
            this.advance();
            return numberLiteral(token.value);
        }
        if (token.type === 'string') {
            this.advance();
            return stringLiteral(token.value);
        }
        if (token.type === 'bool') {
            this.advance();
            return boolLiteral(token.value);
        }
        if (token.type === 'ident') {
            this.advance();
            if (this.peek() && this.peek().type === 'op' && this.peek().value === '(') {
                this.advance();
                var args = [];
                if (!(this.peek() && this.peek().type === 'op' && this.peek().value === ')')) {
                    args.push(this.parseExpression());
                    while (this.peek() && this.peek().type === 'op' && this.peek().value === ',') {
                        this.advance();
                        args.push(this.parseExpression());
                    }
                }
                if (!this.peek() || this.peek().value !== ')') {
                    throw new Error('Expected ) after function call');
                }
                this.advance();
                return { kind: 'call', name: token.value, args: args };
            }
            return varRef(token.value);
        }
        if (token.type === 'op' && token.value === '(') {
            this.advance();
            var expr = this.parseExpression();
            if (!this.peek() || this.peek().value !== ')') {
                throw new Error('Expected )');
            }
            this.advance();
            return expr;
        }
        throw new Error('Unexpected token: ' + JSON.stringify(token));
    };

    function parseBodyJson(raw) {
        if (!raw) {
            return null;
        }
        if (typeof raw === 'object') {
            return raw;
        }
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function bodyToStatements(body) {
        var parsed = parseBodyJson(body);
        if (!parsed) {
            return [];
        }
        if (parsed.statements && Array.isArray(parsed.statements)) {
            return parsed.statements.map(function (stmt) {
                if (stmt.kind === 'assign') {
                    return {
                        kind: 'assign',
                        target: stmt.target,
                        expr: typeof stmt.expr === 'string' ? parseExprSource(stmt.expr) : stmt.expr
                    };
                }
                if (stmt.kind === 'expr') {
                    return {
                        kind: 'expr',
                        expr: typeof stmt.expr === 'string' ? parseExprSource(stmt.expr) : stmt.expr
                    };
                }
                return stmt;
            });
        }
        if (parsed.expr) {
            return [{
                kind: 'expr',
                expr: typeof parsed.expr === 'string' ? parseExprSource(parsed.expr) : parsed.expr
            }];
        }
        return [];
    }

    function guardBodyToExpr(body) {
        var parsed = parseBodyJson(body);
        if (!parsed) {
            return boolLiteral(true);
        }
        if (parsed.expr) {
            return typeof parsed.expr === 'string' ? parseExprSource(parsed.expr) : parsed.expr;
        }
        var statements = bodyToStatements(body);
        if (statements.length === 0) {
            return boolLiteral(true);
        }
        return statements[statements.length - 1].expr;
    }

    function coerceNumber(value) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        if (typeof value === 'string') {
            var n = parseFloat(value);
            return isNaN(n) ? 0 : n;
        }
        return 0;
    }

    function evaluate(expr, env) {
        if (!expr || !expr.kind) {
            return null;
        }
        switch (expr.kind) {
            case 'number':
            case 'string':
            case 'bool':
                return expr.value;
            case 'var':
                if (!Object.prototype.hasOwnProperty.call(env, expr.name)) {
                    return null;
                }
                return env[expr.name];
            case 'unary': {
                var arg = evaluate(expr.arg, env);
                if (expr.op === '!') {
                    return !arg;
                }
                return -coerceNumber(arg);
            }
            case 'binary': {
                var left = evaluate(expr.left, env);
                var right = evaluate(expr.right, env);
                switch (expr.op) {
                    case '+':
                        return (typeof left === 'string' || typeof right === 'string')
                            ? String(left) + String(right)
                            : coerceNumber(left) + coerceNumber(right);
                    case '-':
                        return coerceNumber(left) - coerceNumber(right);
                    case '*':
                        return coerceNumber(left) * coerceNumber(right);
                    case '/':
                        return coerceNumber(left) / coerceNumber(right);
                    case '==':
                        return left === right;
                    case '!=':
                        return left !== right;
                    case '<':
                        return coerceNumber(left) < coerceNumber(right);
                    case '<=':
                        return coerceNumber(left) <= coerceNumber(right);
                    case '>':
                        return coerceNumber(left) > coerceNumber(right);
                    case '>=':
                        return coerceNumber(left) >= coerceNumber(right);
                    case '&&':
                        return left && right;
                    case '||':
                        return left || right;
                    default:
                        throw new Error('Unknown binary operator: ' + expr.op);
                }
            }
            case 'call':
                throw new Error('Function calls are not supported in simulation: ' + expr.name);
            default:
                throw new Error('Unknown expression kind: ' + expr.kind);
        }
    }

    function executeStatements(statements, env) {
        var assignments = [];
        (statements || []).forEach(function (stmt) {
            if (stmt.kind === 'assign') {
                var before = env[stmt.target];
                var after = evaluate(stmt.expr, env);
                env[stmt.target] = after;
                assignments.push({ target: stmt.target, before: before, after: after });
            } else if (stmt.kind === 'expr') {
                evaluate(stmt.expr, env);
            }
        });
        return assignments;
    }

    function defaultInitForType(typeName) {
        switch (typeName) {
            case 'bool':
                return false;
            case 'string':
                return '';
            case 'int':
            case 'float':
            default:
                return 0;
        }
    }

    return {
        parseExprSource: parseExprSource,
        parseBodyJson: parseBodyJson,
        bodyToStatements: bodyToStatements,
        guardBodyToExpr: guardBodyToExpr,
        evaluate: evaluate,
        executeStatements: executeStatements,
        defaultInitForType: defaultInitForType,
        numberLiteral: numberLiteral,
        boolLiteral: boolLiteral
    };
});
