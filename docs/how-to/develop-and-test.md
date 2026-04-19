# How to Develop and Test <!-- omit in toc -->

This guide covers running the test suite, working within the monorepo, and managing npm workspace dependencies during development.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Running Tests](#2-running-tests)
- [3. Test Architecture](#3-test-architecture)
- [4. Writing Tests](#4-writing-tests)
- [5. Monorepo Development](#5-monorepo-development)
  - [5.1 Versioning Conventions](#51-versioning-conventions)
  - [5.2 Adding a New Package](#52-adding-a-new-package)
  - [5.3 Linking Packages Locally](#53-linking-packages-locally)
- [6. Verification](#6-verification)

## 1. Prerequisites

- Node.js 18+
- Repository cloned and `npm install` run from the root

## 2. Running Tests

```bash
# Run all tests across all workspaces (comprehensive)
npm test

# Run tests for a specific workspace from the root (preferred)
npm -w services/gilbert test
npm -w services/gilbert-file test
npm -w services/gilbert-fs test
npm -w services/gilbert-logger test

# Run a specific test file
npm -w services/gilbert exec -- node --test tests/templates.test.js

# Run the performance benchmark
npm -w services/gilbert exec -- node --test tests/ultimate.test.js
```

> [!TIP]
> The `npm -w <workspace>` pattern is preferred over `cd services/… && npm test` because it works reliably in CI/CD pipelines without directory changes.

## 3. Test Architecture

Test locations by scope:

| Location                         | Purpose                                                                     |
| :------------------------------- | :-------------------------------------------------------------------------- |
| `/tests/`                        | Holistic cross-workspace integration tests and performance tests            |
| `/tests/integration/`            | End-to-end pipeline validation (`ultimate.test.js`, `gilbert-core.test.js`) |
| `/tests/performance/`            | Large-scale performance tests (200+ page generation)                        |
| `services/gilbert/tests/`        | Core engine unit and integration tests                                      |
| `services/gilbert-file/tests/`   | Virtual file object unit tests                                              |
| `services/gilbert-fs/tests/`     | Filesystem integration tests                                                |
| `services/gilbert-logger/tests/` | Async logging tests                                                         |

**Performance baseline**: the `ultimate.test.js` benchmark processes 29 files (8 HTML, 19 static, 1 JS, 1 CSS) in under 185ms with all four pipelines running concurrently. Treat any regression beyond this as a signal to investigate.

## 4. Writing Tests

Gilbert uses the Node.js built-in test runner (`node --test`).

**Pipeline integration test pattern:**

```javascript
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { rm, mkdir } from "node:fs/promises";
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const OUTPUT_DIR = "./tests/dist/my-test";

const cleanupTestDirectories = async () => {
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
};

describe("My Pipeline Test", () => {
  it("should generate expected files", async () => {
    await cleanupTestDirectories(); // Clean at start of each test, not in beforeEach

    const dataAdapter = new GilbertFS({ base: "./tests/fixtures/data" });
    const templatesAdapter = new GilbertFS({ base: "./tests/fixtures/templates" });
    const outputAdapter = new GilbertFS();

    const gilbert = new Gilbert({
      templates: templatesAdapter.read("**/*.hbs"),
      data: { source: dataAdapter.read("**/*.json") },
    });

    await gilbert.start().pipeTo(outputAdapter.write(OUTPUT_DIR));

    // Verify output
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(OUTPUT_DIR);
    assert.ok(files.includes("index.html"), "index.html should be generated");
  });
});
```

**Key test patterns:**

- **Individual cleanup** — each test calls `cleanupTestDirectories()` at its own start rather than using shared `beforeEach` hooks. This prevents race conditions in concurrent test execution.
- **Sequential execution** — tests run sequentially by default in the built-in test runner; avoid shared mutable state.
- **Real fixtures** — use the shared `tests/fixtures/app/` directory for authentic website structure.

## 5. Monorepo Development

### 5.1 Versioning Conventions

| Stage                  | Version pattern | Example          |
| :--------------------- | :-------------- | :--------------- |
| New package            | `0.1.0`         | `0.1.0`          |
| Development iterations | Increment patch | `0.1.1`, `0.1.2` |
| Pre-release testing    | Pre-release tag | `0.2.0-alpha.1`  |
| First npm publish      | Major bump to 1 | `1.0.0`          |

### 5.2 Adding a New Package

1. Create the directory: `services/gilbert-newpackage/`
2. Initialise with `npm init` — set version to `0.1.0`
3. Add `"type": "module"` to `package.json`
4. Add the workspace to the root `package.json` workspaces array

### 5.3 Linking Packages Locally

Use `npm link` to consume a local package under its published name — this avoids relative import paths that need rewriting before publish:

```bash
# 1. Create a global link for the new package
cd services/gilbert-newpackage
npm link

# 2. Link the package in consuming projects
cd ../gilbert
npm link @tforster/gilbert-newpackage

# 3. Add to the consuming package.json dependencies
# "@tforster/gilbert-newpackage": "^0.1.0"

# 4. Use the standard import syntax
import SomeClass from "@tforster/gilbert-newpackage";
```

**Why `npm link` over relative paths:**

- Same import syntax in development and production — no changes needed before publish
- Better IDE IntelliSense with proper package names
- Validates package exports and entry points correctly

## 6. Verification

```bash
# All workspaces passing
npm test

# Expected: 0 failing tests across all workspaces
```

Performance benchmark passes if `ultimate.test.js` completes in under 185ms for 29 files.

[← Back to How-To Guides](./README.md)
