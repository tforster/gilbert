# Test Harness

This directory contains development tools for testing the Web API streams migration.

## Purpose

The test harness is separate from `tests/` because it serves as a development tool for validating the migration, not as production test cases.

## Contents

- `mock-stp-publish.js` - Simulates StopTheParty publishing scenario
- `fixtures/` - Sample data and templates for testing
- `compare-streams.js` - Tool for comparing Node.js vs Web API stream outputs

## Usage

Run the mock publisher to test Web API streams conversion:

```bash
node test-harness/mock-stp-publish.js
```

This will help verify that the migrated pipelines produce identical output to the original Node.js streams implementation.
