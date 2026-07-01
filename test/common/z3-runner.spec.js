/*eslint-env node, mocha*/
/**
 * Z3 runner interface (skipped when z3 is not on PATH).
 */

describe('z3-runner', function () {
    var testFixture = require('../globals'),
        expect = testFixture.expect,
        Z3Runner = testFixture.requirejs('stams/verification/z3-runner');

    it('detects Z3 availability', function () {
        var available = Z3Runner.isZ3Available();
        expect(typeof available).to.equal('boolean');
    });

    (Z3Runner.isZ3Available() ? it : it.skip)('solves a trivial satisfiable problem', function () {
        var smt2 = [
            '(set-logic QF_LIA)',
            '(declare-fun x () Int)',
            '(assert (> x 0))',
            '(check-sat)',
            '(get-model)'
        ].join('\n');
        var result = Z3Runner.runZ3(smt2, { timeoutMs: 5000 });
        expect(result.status).to.equal('sat');
        expect(result.model.x).to.exist;
    });

    (Z3Runner.isZ3Available() ? it : it.skip)('reports unsat for contradictory assertions', function () {
        var smt2 = [
            '(set-logic QF_LIA)',
            '(declare-fun x () Int)',
            '(assert (> x 0))',
            '(assert (< x 0))',
            '(check-sat)'
        ].join('\n');
        var result = Z3Runner.runZ3(smt2, { timeoutMs: 5000 });
        expect(result.status).to.equal('unsat');
    });
});
