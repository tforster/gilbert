#!/bin/bash

# Integration test runner script for gilbert-r2
# Runs Wrangler dev server with local R2 emulation
# Usage: ./run-integration-tests.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "============================================"
echo "Gilbert R2 Integration Test Runner"
echo "============================================"
echo ""
echo "Starting Wrangler dev server with local R2..."
echo "Server will run at: http://localhost:8787"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""
echo "Once the server is running, open another terminal and run:"
echo "  curl http://localhost:8787/test"
echo ""
echo "Or open http://localhost:8787/test in your browser"
echo ""
echo "============================================"
echo ""

# Run wrangler dev with local R2 bucket
npx wrangler dev tests/integration-worker.js --local --persist-to .wrangler
