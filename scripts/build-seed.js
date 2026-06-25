'use strict';

/**
 * Documents how to export the StateMachine seed.
 * Full automation requires MongoDB and a project with BuildMetaModel applied.
 *
 * Usage: npm run seed
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'src', 'seeds', 'StateMachine');
const README = path.join(OUT_DIR, 'README.md');

console.log('StaMS seed builder');
console.log('------------------');
console.log('Automated export is not run in bootstrap mode.');
console.log('Follow the steps in:', README);
console.log('');
console.log('Quick path:');
console.log('  1. npm start');
console.log('  2. Create EmptyProject → run BuildMetaModel plugin');
console.log('  3. npm run export -- -p <ProjectName> -u guest -s master -f src/seeds/StateMachine/project.json');
console.log('  4. Zip project.json → StateMachine.webgmex');

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, {recursive: true});
}
