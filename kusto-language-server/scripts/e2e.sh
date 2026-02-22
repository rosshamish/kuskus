#!/usr/bin/env bash

# Run client integration tests via @vscode/test-electron
# The test runner is compiled to client/out/test/runTest.js
cd "$(dirname "$0")/.." || exit 1
npm run compile && cd client && npm test