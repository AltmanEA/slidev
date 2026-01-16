const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
  {
    label: 'integrationTests',
    files: 'out/test/suite/**/*.test.js',
    version: 'stable',
    mocha: {
      ui: 'tdd',
      timeout: 30000
    }
  }
]);