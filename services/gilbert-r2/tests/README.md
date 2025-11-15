# Gilbert R2 Integration Tests

## Overview

This directory contains integration tests for the gilbert-r2 adapter that run against a local R2 bucket emulated by Wrangler.

## Files

- `index.test.js` - Unit tests (run with `npm test`)
- `integration-worker.js` - Integration test worker that runs against local R2
- `wrangler.toml` - Wrangler configuration for local R2 bucket

## Running Integration Tests

### Prerequisites

```bash
npm install
```

### Start the Test Worker

```bash
npm run test:integration
```

This starts a local Cloudflare Worker on `http://localhost:8787` with a local R2 bucket binding.

### Run the Tests

In another terminal:

```bash
curl http://localhost:8787/test
```

Or open `http://localhost:8787/test` in your browser.

## What the Tests Cover

1. **Adapter Creation** - Creates GilbertR2 with R2 binding
2. **Simple Text File** - Writes a basic text file to R2
3. **File Verification** - Reads the file back to verify content
4. **HTML with Cache Control** - Writes HTML file with custom cache headers
5. **HTTP Metadata** - Verifies cache-control and content-type headers
6. **Multiple Files** - Streams multiple files in sequence
7. **Custom Metadata** - Attaches and verifies custom metadata

## Expected Output

```text
Test 1: Creating GilbertR2 adapter with binding...
✓ Test 1 passed: Adapter created successfully

Test 2: Writing a simple text file to R2...
✓ Test 2 passed: Text file written successfully

Test 3: Reading file back from R2...
✓ Test 3 passed: File content verified

Test 4: Writing HTML file with cache control...
✓ Test 4 passed: HTML file written with cache control

Test 5: Verifying HTTP metadata...
  Content-Type: text/html
  Cache-Control: public, max-age=300
✓ Test 5 passed: HTTP metadata verified

Test 6: Writing multiple files in stream...
✓ Test 6 passed: Multiple files written and verified

Test 7: Writing file with custom metadata...
  Custom metadata: {"version":"1.0.0","environment":"test","originalPath":"/test/metadata.txt","uploadedAt":"..."}
✓ Test 7 passed: Custom metadata verified

=========================
✅ ALL TESTS PASSED!
=========================
```

## Local R2 Storage

Wrangler persists R2 data locally in `.wrangler/state/v3/r2/` by default when using `--persist` flag. You can inspect or clean up test files there if needed.

## Cleaning Up

To stop the worker: `Ctrl+C` in the terminal running `npm run test:integration`

To clear persisted R2 data:

```bash
rm -rf .wrangler
```
