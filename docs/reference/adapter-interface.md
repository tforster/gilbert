# Adapter Interface Specification <!-- omit in toc -->

All Gilbert adapters provide a standardised interface for reading from and writing to different data sources. This document defines the constructor, `read()`, and `write()` contracts that all adapters must satisfy.

## Table of Contents <!-- omit in toc -->

- [1. Constructor Pattern](#1-constructor-pattern)
- [2. read() Method](#2-read-method)
- [3. write() Method](#3-write-method)
- [4. Usage Examples](#4-usage-examples)

## 1. Constructor Pattern

All Gilbert adapters use ES6 class constructors with private fields for configuration encapsulation:

```javascript
// Filesystem adapter
import GilbertFS from "@tforster/gilbert-fs";
const fsAdapter = new GilbertFS({
  base: "/project/src", // Base path for relative calculations (default: process.cwd())
  strict: true, // Fail fast on errors (default: true)
});

// GitHub adapter
import GilbertGitHub from "@tforster/gilbert-github";
const githubAdapter = new GilbertGitHub({
  repo: "owner/repository", // Required: GitHub repository
  branch: "main", // Branch to fetch (default: "main")
  token: "ghp_xxx", // GitHub token for private repos (optional)
});
```

## 2. read() Method

The `read(patterns, options)` method creates a `ReadableStream<GilbertFile>` of files matching the specified glob patterns.

**Method signature:**

- `patterns` (string | string[]) — glob pattern(s) to match files
- `options` (object, optional) — per-call configuration overrides
- **Returns:** `ReadableStream<GilbertFile>`

```javascript
// Single pattern
const stream = adapter.read("**/*.hbs");

// Array of patterns for multiple file types
const stream = adapter.read(["**/*.hbs", "**/*.json"]);

// Override instance configuration per read call
const fsStream = fsAdapter.read("src/**/*", {
  base: "/different/base",
  strict: false,
});

const githubStream = githubAdapter.read("templates/**/*", {
  branch: "feature-branch",
  token: "different-token",
});
```

## 3. write() Method

The `write(destination)` method creates a `WritableStream<GilbertFile>` for outputting GilbertFile objects.

**Method signature:**

- `destination` (string) — output destination (directory path for filesystem, deployment config for cloud adapters)
- **Returns:** `WritableStream<GilbertFile>`

```javascript
// Filesystem writing
const writeStream = fsAdapter.write("/output/directory");

// Pipeline example: read → transform → write
await sourceAdapter.read("**/*").pipeThrough(transformStream).pipeTo(destinationAdapter.write("/output"));
```

## 4. Usage Examples

**Local development workflow:**

```javascript
import GilbertFS from "@tforster/gilbert-fs";
import Gilbert from "@tforster/gilbert";

const dataAdapter = new GilbertFS({ base: "./src/data" });
const templatesAdapter = new GilbertFS({ base: "./src/templates" });
const staticAdapter = new GilbertFS({ base: "./src" });
const outputAdapter = new GilbertFS();

const gilbert = new Gilbert(
  {
    templates: templatesAdapter.read("**/*.hbs"),
    data: { source: dataAdapter.read("**/*.json") },
    staticFiles: staticAdapter.read("images/**/*"),
  },
  { debug: true }
);

await gilbert.compile().pipeTo(outputAdapter.write("./dist"));
```

**Cross-platform adapter swapping:**

```javascript
// Development: local filesystem
const devAdapter = new GilbertFS({ base: "./content" });

// Production: GitHub repository
const prodAdapter = new GilbertGitHub({
  repo: "company/content",
  token: process.env.GITHUB_TOKEN,
});

// Same interface, different data source
const contentStream = (isDev ? devAdapter : prodAdapter).read(["templates/**/*.hbs", "data/**/*.json"]);
```

[← Back to Reference](./README.md)
