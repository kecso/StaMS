/**
 * Serialize action/guard/constraint bodies from Langium AST to JSON stored on GME nodes.
 */
import type { LangiumDocument } from 'langium';
import {
    isAssignment,
    isExpressionStmt,
    type Assignment,
    type Expression,
    type ExpressionStmt,
    type Statement
} from './language/generated/ast.js';
import { isAndExpr, isOrExpr } from './language/generated/ast.js';

export type BodyJson =
    | { version: 1; statements: SerializedStatement[] }
    | { version: 1; expr: string };

export type SerializedStatement =
    | { kind: 'assign'; target: string; expr: string }
    | { kind: 'expr'; expr: string };

function textRange(document: LangiumDocument, node: { $cstNode?: { range: { start: { line: number; character: number }; end: { line: number; character: number } } } }): string {
    const cst = node.$cstNode;
    if (!cst || !cst.range) {
        return '';
    }
    return document.textDocument.getText({
        start: cst.range.start,
        end: cst.range.end
    });
}

function exprSource(document: LangiumDocument, expr: Expression): string {
    return textRange(document, expr).trim().replace(/;\s*$/, '');
}

export function serializeStatements(document: LangiumDocument, statements: Statement[]): BodyJson {
    const serialized: SerializedStatement[] = statements.map((stmt) => {
        if (isAssignment(stmt)) {
            return serializeAssignment(document, stmt);
        }
        if (isExpressionStmt(stmt)) {
            return serializeExpressionStmt(document, stmt);
        }
        return { kind: 'expr', expr: textRange(document, stmt).trim().replace(/;\s*$/, '') };
    });
    return { version: 1, statements: serialized };
}

function serializeAssignment(document: LangiumDocument, stmt: Assignment): SerializedStatement {
    const target = stmt.target.ref?.name ?? 'unknown';
    return {
        kind: 'assign',
        target: target,
        expr: exprSource(document, stmt.value)
    };
}

function serializeExpressionStmt(document: LangiumDocument, stmt: ExpressionStmt): SerializedStatement {
    return {
        kind: 'expr',
        expr: exprSource(document, stmt.expression)
    };
}

/** Guard/constraint blocks: single boolean expression or statement list. */
export function serializeGuardOrConstraintBody(document: LangiumDocument, statements: Statement[]): string {
    const body = serializeStatements(document, statements);
    if ('statements' in body && body.statements.length === 1 && body.statements[0].kind === 'expr') {
        return JSON.stringify({ version: 1, expr: body.statements[0].expr });
    }
    return JSON.stringify(body);
}

export function serializeVariableInit(document: LangiumDocument, init: Expression | undefined): string | undefined {
    if (!init) {
        return undefined;
    }
    return JSON.stringify({ version: 1, expr: exprSource(document, init) });
}

/** Convert Langium expression tree to portable JSON AST (when bodies are already structured). */
export function serializeExpressionAst(expr: Expression): Record<string, unknown> {
    if (isOrExpr(expr)) {
        return expr.right.reduce(
            (left, right) => ({
                kind: 'binary',
                op: '||',
                left: left,
                right: serializeExpressionAst(right)
            }),
            serializeExpressionAst(expr.primary as Expression)
        );
    }
    if (isAndExpr(expr)) {
        return expr.right.reduce(
            (left, right) => ({
                kind: 'binary',
                op: '&&',
                left: left,
                right: serializeExpressionAst(right)
            }),
            serializeExpressionAst(expr.primary as Expression)
        );
    }
    if (expr.variable) {
        return { kind: 'var', name: expr.variable.ref?.name ?? 'unknown' };
    }
    if (expr.callee) {
        return {
            kind: 'call',
            name: expr.callee,
            args: (expr.args ?? []).map(serializeExpressionAst)
        };
    }
    if (expr.expression) {
        return serializeExpressionAst(expr.expression);
    }
    if (expr.value !== undefined) {
        const raw = expr.value;
        if (raw === 'true' || raw === 'false') {
            return { kind: 'bool', value: raw === 'true' };
        }
        if (/^"/.test(raw) || /^'/.test(raw)) {
            return { kind: 'string', value: raw.slice(1, -1) };
        }
        return { kind: 'number', value: parseFloat(raw) };
    }
    if (expr.right && expr.right.length > 0 && expr.primary) {
        const op = inferBinaryOp(expr);
        return expr.right.reduce(
            (left, right) => ({
                kind: 'binary',
                op: op,
                left: left,
                right: serializeExpressionAst(right)
            }),
            serializeExpressionAst(expr.primary)
        );
    }
    if (expr.primary) {
        return serializeExpressionAst(expr.primary);
    }
    return { kind: 'number', value: 0 };
}

function inferBinaryOp(expr: Expression): string {
    const source = expr.$cstNode?.text ?? '';
    const ops = ['==', '!=', '<=', '>=', '<', '>', '+', '-', '*', '/'];
    for (let i = 0; i < ops.length; i += 1) {
        if (source.indexOf(ops[i]) >= 0) {
            return ops[i];
        }
    }
    return '+';
}
