# Gilbert Packages <!-- omit in toc -->

Gilbert is organised as a monorepo with specialised packages for different runtime environments and use cases.

## Table of Contents <!-- omit in toc -->

- [1. gilbert (Core Engine)](#1-gilbert-core-engine)
- [2. gilbert-file (Virtual File Objects)](#2-gilbert-file-virtual-file-objects)
- [3. gilbert-fs (Filesystem Integration)](#3-gilbert-fs-filesystem-integration)
- [4. gilbert-github (GitHub Integration)](#4-gilbert-github-github-integration)
- [5. gilbert-cli (Command Line Interface)](#5-gilbert-cli-command-line-interface)

## 1. gilbert (Core Engine)

The main Gilbert compiler engine that orchestrates all pipeline processing and stream coordination.

**Package**: `@tforster/gilbert`

**Key features:**

- **Stream orchestration** — coordinates multiple pipelines through Web API streams
- **Pipeline management** — manages Template, Scripts, Stylesheets, and Static Files pipelines
- **Build vs. Publish modes** — supports selective pipeline execution for different deployment scenarios
- **Memory management** — optimised for processing large datasets with minimal memory footprint

**Basic usage:**

```javascript
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const dataAdapter = new GilbertFS({ base: "./src/data" });
const templatesAdapter = new GilbertFS({ base: "./src/templates" });
const staticAdapter = new GilbertFS({ base: "./src" });

const gilbert = new Gilbert(
  {
    templates: templatesAdapter.read("**/*.hbs"),
    data: { source: dataAdapter.read("**/*.json") },
    scripts: ["./src/scripts/main.js"],
    stylesheets: ["./src/stylesheets/main.css"],
    staticFiles: staticAdapter.read("images/**/*"),
  },
  {
    debug: true,
  }
);

// compile() returns ReadableStream directly
const outputStream = await gilbert.start();
```

## 2. gilbert-file (Virtual File Objects)

Virtual file object implementation providing a lightweight, Web API-compatible file abstraction.

**Package**: `@tforster/gilbert-file`

**Key features:**

- **Web API compatible** — uses Web API streams for runtime-agnostic compatibility
- **Lightweight implementation** — no external dependencies except a custom mime module for content-type detection
- **Path utilities** — built-in Web API-compatible path manipulation utilities
- **Custom MIME detection** — content-type is determined by current file extension (extension changes correctly reset content-type)

**Usage examples:**

```javascript
import GilbertFile from "@tforster/gilbert-file";

// Create a virtual file
const file = new GilbertFile({
  path: "/index.html",
  contents: new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
});

// Clone for transformation
const transformedFile = file.clone({
  contents: new Uint8Array([87, 111, 114, 108, 100]), // "World"
});

// Access properties
console.log(file.path); // '/index.html'
console.log(file.extname); // '.html'
console.log(file.contentType); // 'text/html'
```

## 3. gilbert-fs (Filesystem Integration)

Web API stream implementation for reading from and writing GilbertFile objects to the local filesystem.

**Package**: `@tforster/gilbert-fs`

**Key features:**

- **Web API streams** — standard ReadableStream / WritableStream interface for broad compatibility
- **Automatic directory creation** — creates nested directories as needed on write
- **Multiple content types** — supports Uint8Array, ReadableStream, and null contents
- **Path resolution** — handles relative and absolute file paths correctly
- **Local development focus** — optimised for Node.js, Bun, and Deno environments

**Usage examples:**

```javascript
import GilbertFS from "@tforster/gilbert-fs";

// Read files from filesystem
const fsAdapter = new GilbertFS({ base: "./src" });
const sourceStream = fsAdapter.read("**/*");

// Write files to filesystem
const outputAdapter = new GilbertFS();
const destStream = outputAdapter.write("./dist");

// Pipeline: src → transform → dest
await sourceStream.pipeThrough(transformStream).pipeTo(destStream);
```

## 4. gilbert-github (GitHub Integration)

GitHub integration package for fetching content and templates from GitHub repositories as Web API streams.

**Package**: `@tforster/gilbert-github`

**Key features:**

- **Web API streams** — streams content directly from the GitHub API
- **Branch / tag support** — fetch content from specific branches or tags
- **Content filtering** — filter and transform GitHub content for Gilbert processing
- **Serverless ready** — works in Cloudflare Workers and other serverless environments

**Usage examples:**

```javascript
import GilbertGitHub from "@tforster/gilbert-github";

const githubAdapter = new GilbertGitHub({
  repo: "owner/website-content",
  branch: "main",
  token: process.env.GITHUB_TOKEN,
});

// Fetch templates from GitHub
const templateStream = githubAdapter.read("templates/**/*.hbs");

// Fetch data from GitHub
const dataStream = githubAdapter.read("data/**/*.json");
```

## 5. gilbert-cli (Command Line Interface)

> [!WARNING]
> This module is currently stale and not functional. Development focus is on the core engine and programmatic APIs.

Command-line interface for Gilbert providing filesystem-based development workflows.

**Package**: `@tforster/gilbert-cli`

**Key features:**

- **Convention-based configuration** — works with standard project structures out-of-the-box
- **Flexible options** — extensive CLI options for customising paths and pipeline behaviour
- **Integration ready** — designed for CI/CD and automated workflows

**Intended usage:**

```bash
# Basic build with default paths
gilbert build

# Custom source and destination
gilbert build --src ./content --dest ./public

# Pipeline-specific control
gilbert build --no-scripts --no-stylesheets
```

[← Back to Reference](./README.md)
