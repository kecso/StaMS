/*eslint-env node, mocha*/
/**
 * Bounded verifier on turnstile model (same fixture as simulation-engine tests).
 */

describe('bounded-verifier', function () {
    var testFixture = require('../globals'),
        expect = testFixture.expect,
        ExprAst = testFixture.requirejs('stams/verification/expr-ast'),
        BoundedVerifier = testFixture.requirejs('stams/verification/bounded-verifier');

    var turnstileModel = {
        $schema: 'stams.verification-model.v1',
        version: 1,
        machines: [{
            name: 'Turnstile',
            variables: [{
                name: 'alarmCount',
                type: 'float',
                init: ExprAst.parseExprSource('0.0')
            }],
            events: ['coin', 'push'],
            actions: {
                unlock: {
                    statements: [{
                        kind: 'assign',
                        target: 'alarmCount',
                        expr: ExprAst.parseExprSource('alarmCount + 1.0')
                    }]
                },
                lock: {
                    statements: [{
                        kind: 'assign',
                        target: 'alarmCount',
                        expr: ExprAst.parseExprSource('0.0')
                    }]
                },
                alarm: {
                    statements: [{
                        kind: 'assign',
                        target: 'alarmCount',
                        expr: ExprAst.parseExprSource('alarmCount + 1.0')
                    }]
                }
            },
            guards: {
                canUnlock: {
                    expr: ExprAst.parseExprSource('alarmCount == 0.0')
                }
            },
            states: [
                {
                    name: 'Locked',
                    isInitial: true,
                    isFinal: false,
                    entry: 'lock',
                    run: null,
                    exit: null
                },
                {
                    name: 'Unlocked',
                    isInitial: false,
                    isFinal: false,
                    entry: null,
                    run: null,
                    exit: null
                }
            ],
            transitions: [
                {
                    id: 'Locked:coin:Unlocked',
                    source: 'Locked',
                    target: 'Unlocked',
                    event: 'coin',
                    guard: 'canUnlock',
                    action: 'unlock'
                },
                {
                    id: 'Locked:push:Locked',
                    source: 'Locked',
                    target: 'Locked',
                    event: 'push',
                    guard: null,
                    action: 'alarm'
                },
                {
                    id: 'Unlocked:push:Locked',
                    source: 'Unlocked',
                    target: 'Locked',
                    event: 'push',
                    guard: null,
                    action: 'lock'
                },
                {
                    id: 'Unlocked:coin:Unlocked',
                    source: 'Unlocked',
                    target: 'Unlocked',
                    event: 'coin',
                    guard: null,
                    action: null
                }
            ]
        }]
    };

    var turnstileConstraints = {
        $schema: 'stams.constraints.v1',
        version: 1,
        machines: [{
            name: 'Turnstile',
            constraints: [
                {
                    name: 'noAlarmWhenLocked',
                    kind: 'safety',
                    formula: {
                        kind: 'expr',
                        expr: ExprAst.parseExprSource('alarmCount >= 0.0')
                    }
                },
                {
                    name: 'eventuallyUnlocked',
                    kind: 'goal',
                    formula: {
                        kind: 'ltl',
                        op: 'eventually',
                        arg: {
                            kind: 'expr',
                            expr: ExprAst.parseExprSource('inState(Unlocked)')
                        }
                    }
                }
            ]
        }]
    };

    it('proves trivial safety and goal within depth', function () {
        var result = BoundedVerifier.verify(turnstileModel, turnstileConstraints, 'Turnstile', {
            maxDepth: 4
        });
        expect(result.$schema).to.equal('stams.verification-result.v1');
        expect(result.results).to.have.length(2);
        expect(result.results[0].passed).to.equal(true);
        expect(result.results[0].status).to.equal('proved');
        expect(result.results[1].passed).to.equal(true);
        expect(result.results[1].status).to.equal('proved');
        expect(result.results[1].counterexample.steps.length).to.be.at.least(1);
    });

    it('finds safety violation when invariant is false', function () {
        var badConstraints = JSON.parse(JSON.stringify(turnstileConstraints));
        badConstraints.machines[0].constraints[0].formula.expr =
            ExprAst.parseExprSource('alarmCount < 0.0');
        var result = BoundedVerifier.verify(turnstileModel, badConstraints, 'Turnstile', {
            maxDepth: 2
        });
        expect(result.results[0].passed).to.equal(false);
        expect(result.results[0].status).to.equal('counterexample');
        expect(result.results[0].counterexample.$schema).to.equal('stams.trace.v1');
    });

    it('proves counter eventuallyFull when reset is only available in Full', function () {
        var counterModel = {
            $schema: 'stams.verification-model.v1',
            version: 1,
            machines: [{
                name: 'Counter',
                variables: [{
                    name: 'count',
                    type: 'float',
                    init: ExprAst.parseExprSource('0')
                }],
                events: ['tick', 'reset'],
                actions: {
                    increment: {
                        statements: [{
                            kind: 'assign',
                            target: 'count',
                            expr: ExprAst.parseExprSource('count + 1')
                        }]
                    },
                    clear: {
                        statements: [{
                            kind: 'assign',
                            target: 'count',
                            expr: ExprAst.parseExprSource('0')
                        }]
                    }
                },
                guards: {
                    belowLimit: { expr: ExprAst.parseExprSource('count < 9') },
                    atLimit: { expr: ExprAst.parseExprSource('count >= 9') }
                },
                states: [
                    { name: 'Counting', isInitial: true, isFinal: false },
                    { name: 'Full', isInitial: false, isFinal: false }
                ],
                transitions: [
                    {
                        id: 'Counting:tick:Counting',
                        source: 'Counting',
                        target: 'Counting',
                        event: 'tick',
                        guard: 'belowLimit',
                        action: 'increment'
                    },
                    {
                        id: 'Counting:tick:Full',
                        source: 'Counting',
                        target: 'Full',
                        event: 'tick',
                        guard: 'atLimit',
                        action: 'increment'
                    },
                    {
                        id: 'Full:reset:Counting',
                        source: 'Full',
                        target: 'Counting',
                        event: 'reset',
                        guard: null,
                        action: 'clear'
                    }
                ]
            }]
        };
        var counterConstraints = {
            $schema: 'stams.constraints.v1',
            version: 1,
            machines: [{
                name: 'Counter',
                constraints: [
                    {
                        name: 'eventuallyFull',
                        kind: 'goal',
                        formula: {
                            kind: 'ltl',
                            op: 'eventually',
                            arg: {
                                kind: 'expr',
                                expr: ExprAst.parseExprSource('count >= 9')
                            }
                        }
                    }
                ]
            }]
        };
        var result = BoundedVerifier.verify(counterModel, counterConstraints, 'Counter', {
            maxDepth: 12
        });
        expect(result.results[0].name).to.equal('eventuallyFull');
        expect(result.results[0].passed).to.equal(true);
        expect(result.results[0].status).to.equal('proved');
    });
});
