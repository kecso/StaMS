'use strict';

/**
 * Launch an in-memory mongod on a fixed port (27017 by default) so the
 * webgme test config can connect, run mocha on the given spec, then stop mongo.
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');

async function main() {
    const spec = process.argv[2];

    if (!spec) {
        console.error('usage: node scripts/run-test-with-mongo.js <spec>');
        process.exit(2);
    }

    const mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    console.log('[test-mongo] listening at ' + uri);

    const child = spawn(
        'node',
        ['./node_modules/mocha/bin/mocha', spec],
        { stdio: 'inherit', env: Object.assign({}, process.env, { TEST_MONGO_URI: uri }) }
    );

    child.on('exit', async (code) => {
        await mongo.stop();
        process.exit(code === null ? 1 : code);
    });
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
