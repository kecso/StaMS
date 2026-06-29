#!/usr/bin/env node
'use strict';

/**
 * Parse a `.sm` file with the same Langium pipeline as TextToModel.
 *
 * Usage:
 *   npm run parse:sm -- path/to/file.sm
 *   node scripts/parse-sm.js examples/turnstile.sm
 */

const fs = require('fs');
const path = require('path');

const smLangiumPath = path.join(__dirname, '..', 'build', 'stams', 'sm-langium.cjs');
if (!fs.existsSync(smLangiumPath)) {
    console.error('[parse-sm] Missing ' + smLangiumPath);
    console.error('[parse-sm] Run: npm run build:plugins');
    process.exit(2);
}

const SmLangium = require(smLangiumPath);

const fileArg = process.argv[2];
if (!fileArg) {
    console.error('Usage: node scripts/parse-sm.js <file.sm>');
    process.exit(2);
}

const filePath = path.resolve(fileArg);
if (!fs.existsSync(filePath)) {
    console.error('[parse-sm] File not found: ' + filePath);
    process.exit(2);
}

const text = fs.readFileSync(filePath, 'utf8');
const documentUri = 'file://' + filePath.replace(/\\/g, '/');

SmLangium.parseSm(text, documentUri)
    .then(function (parsed) {
        const summary = SmLangium.summarizeModel(parsed.model, parsed.diagnostics);

        console.log('File: ' + filePath);
        console.log('Machines: ' + summary.machineNames.join(', ') || '(none)');
        console.log(
            'States: ' + summary.stateCount +
            ', transitions: ' + summary.transitionCount +
            ', events: ' + summary.eventCount
        );
        console.log(
            'Diagnostics: ' + summary.errorCount + ' error(s), ' + summary.warningCount + ' warning(s)'
        );

        if (SmLangium.hasSyntaxErrors(parsed.document)) {
            console.error('\n--- syntax errors ---');
            console.error(SmLangium.formatSyntaxErrors(parsed.document));
        }

        if (parsed.diagnostics.length > 0) {
            console.error('\n--- validation / linking ---');
            console.error(SmLangium.formatDiagnostics(parsed.diagnostics));
        }

        if (SmLangium.hasSyntaxErrors(parsed.document) || SmLangium.hasParseErrors(parsed.diagnostics)) {
            process.exit(1);
        }

        console.log('\nOK — parse and validation passed.');
        process.exit(0);
    })
    .catch(function (err) {
        console.error('[parse-sm] ' + (err && err.stack ? err.stack : err));
        process.exit(1);
    });
