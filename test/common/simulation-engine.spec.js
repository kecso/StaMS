/*eslint-env node, mocha*/
/**
 * Unit tests for the stepwise simulation engine (turnstile scenario).
 */

describe('simulation-engine', function () {
    var testFixture = require('../globals'),
        expect = testFixture.expect,
        ExprAst = testFixture.requirejs('stams/verification/expr-ast'),
        SimulationEngine = testFixture.requirejs('stams/verification/simulation-engine');

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

    it('initializes in the initial state with entry action applied', function () {
        var trace = SimulationEngine.createTrace(turnstileModel, 'Turnstile');
        expect(trace.initial.state).to.equal('Locked');
        expect(trace.initial.variables.alarmCount).to.equal(0);
        expect(SimulationEngine.getCurrentSnapshot(trace).variables.alarmCount).to.equal(0);
    });

    it('grows a trace for coin then push', function () {
        var trace = SimulationEngine.simulate(turnstileModel, 'Turnstile', ['coin', 'push']);
        expect(trace.steps).to.have.length(2);
        expect(trace.steps[0].after.state).to.equal('Unlocked');
        expect(trace.steps[0].after.variables.alarmCount).to.equal(1);
        expect(trace.steps[1].after.state).to.equal('Locked');
        expect(trace.steps[1].after.variables.alarmCount).to.equal(0);
    });

    it('records guard failure when coin rejected after alarm', function () {
        var trace = SimulationEngine.createTrace(turnstileModel, 'Turnstile');
        SimulationEngine.step(trace, 'push');
        expect(trace.steps[0].after.variables.alarmCount).to.equal(1);
        SimulationEngine.step(trace, 'coin');
        expect(trace.steps[1].guardPassed).to.equal(false);
        expect(trace.steps[1].after.state).to.equal('Locked');
    });
});
