'use strict';

const path = require('path');

module.exports = {
    entry: {
        'langium.worker': './src/visualizers/widgets/MonacoEditor/langium.worker.ts'
    },
    output: {
        path: path.resolve(__dirname, 'build/workers'),
        filename: '[name].js',
        globalObject: 'self'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    ignoreWarnings: [/Failed to parse source map/],
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.workers.json'
                    }
                },
                exclude: /node_modules/
            }
        ]
    },
    devtool: 'source-map',
    mode: 'production'
};
