# Gilbert Architecture <!-- omit in toc -->

This document explains the core concepts and design decisions that shape Gilbert — what it is, why it works the way it does, and how its internal pieces fit together.

## Table of Contents <!-- omit in toc -->

- [1. About Gilbert](#1-about-gilbert)
  - [1.1 Philosophy: The Mind's DOM](#11-philosophy-the-minds-dom)
  - [1.2 Performance-First Architecture](#12-performance-first-architecture)
  - [1.3 Runtime-Agnostic Design](#13-runtime-agnostic-design)
- [2. Streams-Based Processing](#2-streams-based-processing)
- [3. Data Middleware System](#3-data-middleware-system)
- [4. Pipeline Architecture](#4-pipeline-architecture)
- [5. Virtual File System](#5-virtual-file-system)
- [6. Build vs. Publish Modes](#6-build-vs-publish-modes)
  - [6.1 Building (Full Pipeline)](#61-building-full-pipeline)
  - [6.2 Publishing (Content-Only Pipeline)](#62-publishing-content-only-pipeline)
  - [6.3 Design Rationale](#63-design-rationale)
- [Further Reading](#further-reading)

## 1. About Gilbert

Gilbert is a **streams-based, data-driven static site generator** designed for exceptional performance in modern deployment environments. Unlike traditional file-based generators that process filesystem trees of markdown files, Gilbert transforms data streams through specialised pipelines to generate HTML, CSS, and JavaScript with remarkable speed and efficiency.

**What makes Gilbert different:**

- **Data-driven architecture** — processes streams of data rather than filesystem trees, enabling real-time content publishing and serverless deployment scenarios
- **Streams-based processing** — uses Web API streams for high-speed processing with minimal memory requirements, ideal for large-scale content generation
- **Runtime-agnostic design** — built on Web API standards to work across Node.js, Bun, Deno, Cloudflare Workers, and other WinterCG-compatible runtimes
- **Decoupled architecture** — core engine as a reusable module that accepts and returns streams, enabling flexible integration patterns
- **Performance-first** — targets 200+ pages per second generation with minimal memory footprint
- **Lean implementation** — only essential dependencies, maintaining a small at-rest and in-memory footprint

### 1.1 Philosophy: The Mind's DOM

Gilbert's template philosophy centres on the "mind's DOM" concept — developers must be able to easily visualise and mentally render templates without cognitive overhead.

**Human context**: complex template logic creates mental burden and debugging difficulties. Simple token replacement allows developers to maintain clear mental models of output, leading to faster development and easier collaboration.

**Key benefits:**

- Faster debugging and development cycles
- Easier team collaboration and project handoffs
- Predictable performance characteristics
- Clear separation between data transformation and presentation
- Templates that generate multiple file types (HTML, CSS, JS, XML, etc.)

**Implementation**: Gilbert supports optional data middleware for cross-file transformations (pagination, global data objects, etc.) while keeping templates simple. Complex data processing happens in middleware functions before template rendering.

### 1.2 Performance-First Architecture

Gilbert consistently achieves **sub-200ms build times** for complex projects, enabling both rapid local development and real-time serverless publishing.

**Validated performance (January 2025):**

- **Ultimate Test**: 27 files (4 HTML, 1 JS, 1 CSS, 21 static assets) generated in 189ms
- **Compilation phase**: 137ms (within 150ms target)
- **Concurrent pipelines**: all 4 running simultaneously without race conditions
- **Real-world validation**: StopTheParty website structure with authentic complexity

**Human context**: this performance level enables sophisticated workflows like webhook-triggered CMS publishing in under a second, making static sites feel dynamic while maintaining the benefits of pre-generated content.

**Performance strategies:**

- **Stream Processing** — files processed individually without loading entire datasets into memory
- **Selective Pipeline Execution** — skip unnecessary pipelines during content-only updates
- **Template Pre-loading** — templates loaded once and reused across all data processing
- **Minimal Dependencies** — careful dependency selection to minimise runtime overhead

### 1.3 Runtime-Agnostic Design

Gilbert's engine uses only **Web API streams** (ReadableStream, TransformStream, WritableStream) to ensure portability across modern JavaScript runtimes.

**Human context**: this design enables deployment flexibility — the same Gilbert code runs in local development (Node.js), edge functions (Cloudflare Workers), serverless platforms (AWS Lambda), and emerging runtimes (Bun, Deno).

**Architecture benefits:**

- **Future-proof** — works with emerging runtimes without code changes
- **Testing simplicity** — mock Web Streams for isolated testing
- **Deployment flexibility** — same code base across all environments
- **Integration patterns** — clean separation between processing logic and I/O

## 2. Streams-Based Processing

Gilbert processes content through **Web API streams** (ReadableStream, TransformStream, WritableStream) for runtime-agnostic compatibility and high-performance processing.

**Human context**: streams enable processing large datasets without loading everything into memory, critical for scalability and enabling real-time publishing workflows in serverless environments.

**Stream processing benefits:**

- **Memory efficiency** — files processed individually without accumulating in memory
- **Runtime portability** — works across Node.js, Bun, Deno, Cloudflare Workers
- **Composability** — streams can be piped together for complex processing workflows
- **Performance** — enables parallel processing and lazy evaluation

**Stream coordination**: Gilbert uses stream utilities for managing multiple concurrent streams and ensuring proper completion handling.

## 3. Data Middleware System

Gilbert supports optional data middleware for cross-file transformations that require knowledge of the entire dataset. Middleware functions process all data files before template rendering, enabling pagination, global data objects, and content categorisation.

**Human context**: many static site features require processing relationships between files — pagination needs total page counts, global navigation requires all page data, and category systems need cross-references. Middleware enables these patterns while maintaining streaming performance for other content types.

**Middleware function signature:**

```javascript
const myMiddleware = async (dataFiles) => {
  // dataFiles: Array<GilbertFile> — all data files loaded into memory
  const processedFiles = [];

  for (const file of dataFiles) {
    const data = JSON.parse(await file.toString());

    data.processedAt = new Date().toISOString();
    data.globalSiteData = { totalPages: dataFiles.length };

    processedFiles.push(
      file.clone({
        contents: new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode(JSON.stringify(data, null, 2)));
            controller.close();
          },
        }),
      })
    );
  }

  return processedFiles;
};
```

**Common use cases:**

- **Pagination** — add page counts and navigation metadata
- **Global data** — site-wide navigation, build timestamps, configuration
- **Content processing** — Markdown rendering, syntax highlighting
- **SEO metadata** — generate sitemaps, meta descriptions
- **Categorisation** — tag systems, content grouping, related posts

**Usage example:**

```javascript
const gilbert = new Gilbert(
  {
    templates: templatesAdapter.read("**/*.hbs"),
    data: {
      source: dataAdapter.read("**/*.json"),
      middleware: [paginationMiddleware, globalDataMiddleware],
    },
    staticFiles: staticAdapter.read("**/*"),
  },
  { debug: true }
);
```

## 4. Pipeline Architecture

Gilbert uses specialised pipelines for different content types, each optimised for its specific processing requirements.

**Pipeline responsibilities:**

| Pipeline              | Responsibility                                                                                                         |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| `TemplatePipeline`    | Handlebars template processing, data merging, HTML minification. Requires full template pre-loading for random access. |
| `ScriptsPipeline`     | esbuild bundling, ES module processing, tree-shaking, and minification.                                                |
| `StylesheetsPipeline` | PostCSS integration, autoprefixing, CSS minification, and import resolution.                                           |
| `StaticFilesPipeline` | File copying with MIME type detection and path preservation.                                                           |

## 5. Virtual File System

Gilbert uses **GilbertFile objects** instead of direct filesystem operations, enabling in-memory processing and easy testing.

**Human context**: virtual files enable processing content from any source (filesystem, APIs, databases) through a consistent interface, making Gilbert highly adaptable to different deployment scenarios.

```javascript
import GilbertFile from "@tforster/gilbert-file";

const file = new GilbertFile({
  path: "/index.html",
  contents: Buffer.from(htmlContent),
  cwd: "/",
});

// Access patterns
console.log(file.relative); // "index.html"
console.log(file.dirname); // "/"
console.log(file.extname); // ".html"
```

**GilbertFile properties:**

| Property      | Description                                   |
| :------------ | :-------------------------------------------- |
| `path`        | Absolute file path                            |
| `base`        | Base directory for relative path calculations |
| `relative`    | Computed relative path (read-only)            |
| `contents`    | File contents as Buffer or ReadableStream     |
| `stat`        | File system statistics (size, dates, etc.)    |
| `contentType` | MIME type based on file extension             |

## 6. Build vs. Publish Modes

Gilbert supports **selective pipeline execution** to optimise for different deployment scenarios and performance requirements.

### 6.1 Building (Full Pipeline)

**When**: development, asset changes, CI/CD with complete development environment

**Where**: local filesystem or VMs with full Node.js environment

**Pipelines used**: ALL Gilbert pipelines

- `TemplatePipeline` — data + templates → HTML
- `ScriptsPipeline` — esbuild bundling, tree-shaking, minification
- `StylesheetsPipeline` — PostCSS processing, autoprefixing
- `StaticFilesPipeline` — complete asset copying and optimisation

**Requirements**: full filesystem access for esbuild to read source and node_modules

### 6.2 Publishing (Content-Only Pipeline)

**When**: content changes, CMS updates, webhook-triggered publishing

**Where**: serverless environments (Cloudflare Workers, edge functions)

**Pipelines used**: SUBSET of Gilbert pipelines

- `TemplatePipeline` — data + templates → HTML _(primary use case)_
- `StaticFilesPipeline` — content-dependent assets only
- No `ScriptsPipeline` or `StylesheetsPipeline` _(assets pre-built)_

**Requirements**: Web API streams only, no filesystem dependencies

### 6.3 Design Rationale

**Minimal JS/CSS philosophy**: sites built with Gilbert use minimal client-side code, making asset rebuilds unnecessary for content changes.

**esbuild constraint**: esbuild requires filesystem access to source and node_modules, making it incompatible with serverless streams-only environments.

**Performance optimisation**: skipping expensive bundling operations when only content changes enables sub-second publishing workflows.

## Further Reading

- [Packages Reference](../reference/packages.md) — details on every gilbert-\* package
- [Pipelines Reference](../reference/pipelines.md) — pipeline configuration and behaviour
- [ADR-001: Web API Streams Migration](./adr-001-web-api-streams.md) — the decision record behind the streams architecture
- [Advanced Patterns](./advanced-patterns.md) — custom pipelines, stream composition, and plugins

[← Back to Explanation](./README.md)
