/*eslint-env node, mocha*/
/**
 * Verification settings load from config/components.json.
 */

describe('verification settings', function () {
    var testFixture = require('../globals'),
        expect = testFixture.expect,
        Settings = testFixture.requirejs('stams/verification/settings');

    it('uses StaMS_Verification component id', function () {
        expect(Settings.COMPONENT_ID).to.equal('StaMS_Verification');
    });

    it('loads deployment overrides from components.json', function () {
        expect(Settings.maxDepth).to.equal(12);
        expect(Settings.engine).to.equal('auto');
        expect(Settings.registry.result).to.equal('stams/verification-result');
        expect(Settings.z3.command).to.equal('z3');
    });
});
