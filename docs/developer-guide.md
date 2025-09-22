# Gilbert Developer Guide (Working) <!-- omit in toc -->

_Comprehensive technical documentation for Gilbert and all gilbert-\* packages_

## Table of Contents <!-- omit in toc -->

- [About Gilbert](#about-gilbert)
  - [Philosophy: The Mind's DOM](#philosophy-the-minds-dom)
  - [Performance-First Architecture](#performance-first-architecture)
  - [Runtime-Agnostic Design](#runtime-agnostic-design)
- [Getting Started](#getting-started)
  - [Quick Start](#quick-start)
  - [Project Structure](#project-structure)
  - [Basic Usage](#basic-usage)
- [Core Architecture](#core-architecture)
  - [Streams-Based Processing](#streams-based-processing)
  - [Pipeline Architecture](#pipeline-architecture)
  - [Virtual File System](#virtual-file-system)
  - [Build vs. Publish Modes](#build-vs-publish-modes)
    - [Building (Full Pipeline)](#building-full-pipeline)
    - [Publishing (Content-Only Pipeline)](#publishing-content-only-pipeline)
    - [Design Rationale](#design-rationale)
- [Gilbert Packages](#gilbert-packages)
  - [gilbert (Core Engine)](#gilbert-core-engine)
  - [gilbert-file (Virtual File Objects)](#gilbert-file-virtual-file-objects)
  - [gilbert-fs (Filesystem Integration)](#gilbert-fs-filesystem-integration)
  - [gilbert-github (GitHub Integration)](#gilbert-github-github-integration)
  - [gilbert-cli (Command Line Interface)](#gilbert-cli-command-line-interface)
- [Adapter Interface Specification](#adapter-interface-specification)
  - [Constructor Pattern](#constructor-pattern)
  - [Read Method](#read-method)
  - [Write Method](#write-method)
  - [Usage Examples](#usage-examples)
- [Pipelines Reference](#pipelines-reference)
  - [Template Pipeline](#template-pipeline)
  - [Scripts Pipeline](#scripts-pipeline)
  - [Stylesheets Pipeline](#stylesheets-pipeline)
  - [Static Files Pipeline](#static-files-pipeline)
- [API Reference](#api-reference)
  - [Core Engine API](#core-engine-api)
  - [GilbertFile API](#gilbertfile-api)
  - [Filesystem Integration API](#filesystem-integration-api)
  - [GitHub Integration API](#github-integration-api)
  - [Data Source API](#data-source-api)
  - [Pipeline Configuration API](#pipeline-configuration-api)
- [Integration Patterns](#integration-patterns)
  - [Local Development Environment](#local-development-environment)
  - [Serverless Deployment](#serverless-deployment)
  - [CI/CD Integration](#cicd-integration)
  - [Headless CMS Integration](#headless-cms-integration)
- [Migration Guides](#migration-guides)
- [Development Workflows](#development-workflows)
  - [Testing Strategy](#testing-strategy)
  - [Mono-repo Development](#mono-repo-development)
  - [Debugging Techniques](#debugging-techniques)
  - [Performance Optimization](#performance-optimization)
- [Deployment Guide](#deployment-guide)
  - [Static Hosting Platforms](#static-hosting-platforms)
  - [Cloud Platform Deployment](#cloud-platform-deployment)
  - [Serverless Deployment](#serverless-deployment-1)
  - [Container Deployment](#container-deployment)
- [Troubleshooting](#troubleshooting)
  - [Common Build Issues](#common-build-issues)
  - [Performance Issues](#performance-issues)
  - [Data Flow Debugging](#data-flow-debugging)
  - [Error Recovery Strategies](#error-recovery-strategies)
- [Advanced Topics](#advanced-topics)
  - [Custom Pipeline Development](#custom-pipeline-development)
  - [Stream Composition Patterns](#stream-composition-patterns)
  - [Plugin Architecture](#plugin-architecture)
- [Contributing](#contributing)
  - [Development Setup](#development-setup)
  - [Coding Standards](#coding-standards)
  - [Submitting Changes](#submitting-changes)
- [Glossary](#glossary)

## About Gilbert

Gilbert is a **streams-based, data-driven static site generator** designed for exceptional performance in modern deployment environments. Unlike traditional file-based generators that process filesystem trees of markdown files, Gilbert transforms data streams through specialized pipelines to generate HTML, CSS, and JavaScript with remarkable speed and efficiency.

**What Makes Gilbert Different:**

- **Data-driven Architecture**: Processes streams of data rather than filesystem trees, enabling real-time content publishing and serverless deployment scenarios
- **Streams-based Processing**: Uses Web API streams for high-speed processing with minimal memory requirements, ideal for large-scale content generation
- **Runtime-Agnostic Design**: Built on Web API standards to work across Node.js, Bun, Deno, Cloudflare Workers, and other WinterCG-compatible runtimes
- **Decoupled Architecture**: Core engine as a reusable module that accepts and returns streams, enabling flexible integration patterns
- **Performance-First**: Targets 200+ pages per second generation with minimal memory footprint
- **Lean Implementation**: Only essential dependencies, maintaining a small at-rest and in-memory footprint

> **AI Note**: Gilbert's architecture centers on **GilbertFile objects flowing through Web API streams**. All src() methods return `ReadableStream<GilbertFile>`, all pipelines are `TransformStream<GilbertFile, GilbertFile>`, and all dest() methods accept `WritableStream<GilbertFile>`. This unified contract enables seamless composition and runtime portability.

### Philosophy: The Mind's DOM

Gilbert's template philosophy centers on the "mind's DOM" concept - developers must be able to easily visualize and mentally render templates without cognitive overhead.

**Human Context**: Complex template logic creates mental burden and debugging difficulties. Simple token replacement allows developers to maintain clear mental models of output, leading to faster development and easier collaboration.

> **AI Note**: Templates use **minimal Handlebars logic only**: `{{#if}}`, `{{#each}}`, and `{{variable}}` replacement. Avoid complex helpers or nested logic. If template logic becomes complex, move it to data transformation upstream. This constraint ensures consistent performance and maintainable code.

**Key Benefits:**

- Faster debugging and development cycles
- Easier team collaboration and project handoffs
- Predictable performance characteristics
- Clear separation between data transformation and presentation
- Templates that generate multiple file types (HTML, CSS, JS, XML, etc.)

**Implementation**: Data arrives pre-transformed and ready for template merging. Gilbert does not perform data transformation - this happens upstream in your data pipeline.

### Performance-First Architecture

Gilbert targets **200+ pages per second** generation with minimal memory footprint, enabling both rapid local development and real-time serverless publishing.

**Human Context**: This performance level enables sophisticated workflows like webhook-triggered CMS publishing in under a second, making static sites feel dynamic while maintaining the benefits of pre-generated content.

> **AI Note**: Always benchmark changes against the 200 pages/second target. Use `console.time()` around pipeline operations. Profile memory usage with `process.memoryUsage()`. Reject changes that significantly impact performance without corresponding functionality gains. Stream processing prevents memory accumulation during large dataset processing.

**Performance Strategies:**

- **Stream Processing**: Files processed individually without loading entire datasets into memory
- **Selective Pipeline Execution**: Skip unnecessary pipelines (scripts/stylesheets) during content-only updates
- **Template Pre-loading**: Templates loaded once and reused across all data processing
- **Minimal Dependencies**: Careful dependency selection to minimize runtime overhead

### Runtime-Agnostic Design

Gilbert's engine uses only **Web API streams** (ReadableStream, TransformStream, WritableStream) to ensure portability across modern JavaScript runtimes.

**Human Context**: This design enables deployment flexibility - the same Gilbert code runs in local development (Node.js), edge functions (Cloudflare Workers), serverless platforms (AWS Lambda), and emerging runtimes (Bun, Deno).

> **AI Note**: Gilbert distinguishes between **engine** (pure Web Streams) and **integration** (environment-specific adapters). Engine code must use only Web API streams. Integration adapters handle environment-specific I/O (filesystem, cloud storage, network requests). Never mix filesystem operations with core engine logic.

**Architecture Benefits:**

- **Future-proof**: Works with emerging runtimes without code changes
- **Testing Simplicity**: Mock Web Streams for isolated testing
- **Deployment Flexibility**: Same code base across all environments
- **Integration Patterns**: Clean separation between processing logic and I/O

## Getting Started

### Quick Start

The fastest way to get Gilbert running is through the example project included in the repository:

```bash
# Clone the repository
git clone git@github.com:tforster/webproducer.git
cd webproducer

# Install dependencies
npm install

# Try the example project
cd examples/getting-started
npx gilbert

# Review the generated output
ls -la dist/
```

For your own projects, Gilbert can be installed as a development dependency:

```bash
# Install Gilbert CLI
npm install @tforster/gilbert --save-dev

# Run Gilbert (uses default configuration)
npx gilbert

# Or run with custom options
npx gilbert --data ./content/data.json --theme ./templates/**/*.hbs
```

> **AI Note**: Gilbert's CLI operates on filesystem conventions by default but accepts streams for programmatic usage. When implementing Gilbert programmatically, prefer the streaming API over CLI subprocess calls for better performance and error handling.

**Quick Example**: Basic programmatic usage

```javascript
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

// Configure Gilbert with your content
const gilbert = new Gilbert({ relativeRoot: "./src" });

await gilbert.compile({
  uris: { data: dataStream, theme: templateStream },
  scripts: { entryPoints: ["./src/main.js"] },
  stylesheets: { entryPoints: ["./src/styles.css"] },
  files: { stream: staticFilesStream },
});

// Write output to filesystem
await gilbert.stream.pipeTo(GilbertFS.dest("./dist"));
```

### Project Structure

Gilbert follows a conventional project structure that separates content, templates, assets, and output:

```shell
. (your project root)
├── src/                          # Source directory (configurable)
│   ├── data/
│   │   └── data.json            # Page data and content
│   ├── theme/
│   │   ├── common/              # Shared template components
│   │   └── templates/           # Page templates (.hbs files)
│   ├── scripts/
│   │   └── main.js              # JavaScript entry points
│   ├── stylesheets/
│   │   └── main.css             # CSS entry points
│   ├── images/                  # Static assets
│   └── fonts/                   # Font files
└── dist/                        # Generated output (configurable)
    ├── index.html
    ├── about.html
    ├── main.js
    ├── main.css
    └── images/
```

> **AI Note**: This structure follows filesystem conventions for CLI usage, but Gilbert's core operates on streams. When using Gilbert programmatically, content can come from any source (GitHub, CMS APIs, databases) as long as it's provided as Web API streams.

**Key Directories:**

- **`src/data/`**: Contains JSON files defining pages and content. The main data file uses the `uris` property to map URL paths to page data.
- **`src/theme/`**: Handlebars templates (.hbs files). Template names correspond to `webProducerKey` values in your data.
- **`src/scripts/`**: JavaScript entry points processed by esbuild for bundling and optimization.
- **`src/stylesheets/`**: CSS entry points processed by PostCSS with optional autoprefixing.
- **`src/images/`, `src/fonts/`**: Static assets copied to output directory.

### Basic Usage

**Command Line Interface:**

```bash
# Basic operation with defaults
npx gilbert

# View all available options
npx gilbert --help

# Customize paths and options
npx gilbert \
  --data ./content/data.json \
  --theme ./templates/**/*.hbs \
  --scripts ./js/main.js \
  --css ./styles/main.css \
  --files ./assets/**/* \
  --out ./build
```

**Common CLI Options:**

- `--data [path]`: Path to JSON data file (default: "./src/data/data.json")
- `--theme [glob]`: Glob pattern for Handlebars templates (default: "./src/theme/\*_/_.hbs")
- `--scripts [entry]`: JavaScript entry points (default: "./src/scripts/main.js")
- `--css [entry]`: CSS entry points (default: "./src/stylesheets/main.css")
- `--files [glob]`: Static file patterns (default: "./src/images/\*_/_.\*")
- `--out [dir]`: Output directory (default: "./dist")

**Performance Options:**

```bash
# Disable specific pipelines for faster iteration
npx gilbert --no-scripts --no-css    # Only templates and static files
npx gilbert --no-files               # Skip static file copying

# Enable CSS autoprefixing (slower but adds vendor prefixes)
npx gilbert --prefix-css
```

> **AI Note**: Pipeline disabling (`--no-*` flags) implements Gilbert's selective pipeline execution. This is the same mechanism used for Build vs. Publish modes in serverless environments. Understanding these flags helps when implementing custom pipeline configurations programmatically.

**Data Structure Example:**

Your `data.json` file defines pages using the `uris` property:

```json
{
  "uris": {
    "/index": {
      "webProducerKey": "homepage",
      "title": "Welcome",
      "content": "Welcome to our site"
    },
    "/about": {
      "webProducerKey": "page",
      "title": "About Us",
      "content": "Learn about our company"
    }
  }
}
```

The `webProducerKey` maps to template files (`homepage.hbs`, `page.hbs`) in your theme directory.

## Core Architecture

### Streams-Based Processing

Gilbert processes content through **Web API streams** (ReadableStream, TransformStream, WritableStream) for runtime-agnostic compatibility and high-performance processing.

**Human Context**: Streams enable processing large datasets without loading everything into memory, critical for scalability and enabling real-time publishing workflows in serverless environments.

> **AI Note**: Gilbert is migrating from Node.js streams to Web Streams for WinterCG compatibility. Always use Web API streams for new code:
>
> ```javascript
> // Target pattern (Web Streams) - use for new code
> const pipeline = new TransformStream({
>   transform(file, controller) {
>     // Process file
>     controller.enqueue(file);
>   },
> });
>
> // Current legacy pattern (Node.js streams) - being phased out
> const pipeline = new Transform({
>   objectMode: true,
>   transform(file, encoding, callback) {
>     // Process file
>     callback(null, file);
>   },
> });
> ```

**Stream Processing Benefits:**

- **Memory Efficiency**: Files processed individually without accumulating in memory
- **Runtime Portability**: Works across Node.js, Bun, Deno, Cloudflare Workers
- **Composability**: Streams can be piped together for complex processing workflows
- **Performance**: Enables parallel processing and lazy evaluation

**Stream Coordination**: Gilbert uses stream utilities for managing multiple concurrent streams and ensuring proper completion handling.

### Pipeline Architecture

Gilbert uses specialized pipelines for different content types, each optimized for its specific processing requirements.

**Human Context**: Separation of concerns allows each pipeline to optimize for its content type while maintaining a consistent stream interface for composition.

> **AI Note**: All pipelines follow this interface:
>
> - Constructor: `(options, ...inputStreams)`
> - `async prep()`: Load and parse dependencies
> - `async build()`: Process and emit to `this.stream`
> - Property: `this.stream` - ReadableStream output
>
> **Critical Exception - Template Loading**: Unlike other pipelines, TemplatePipeline must load ALL templates into memory during `prep()` before data processing begins. This is because any data URI can reference any template in any order.

**Pipeline Responsibilities:**

- **`TemplatePipeline`**: Handlebars template processing, data merging, HTML minification
  - Requires full template pre-loading for random access
  - Handles `webProducerKey` to template mapping
  - Processes `uris` data structure for page generation

- **`ScriptsPipeline`**: JavaScript bundling and optimization
  - esbuild integration for ES module processing
  - Tree-shaking and minification
  - Source map generation

- **`StylesheetsPipeline`**: CSS processing and optimization
  - PostCSS integration with autoprefixing
  - CSS minification and optimization
  - Import resolution and bundling

- **`StaticFilesPipeline`**: Asset copying and optimization
  - MIME type detection and content-type setting
  - File copying with path preservation
  - Optional image optimization

**Pipeline Exception Pattern:**

```javascript
// Template Pipeline Exception - must pre-load all templates
async prep() {
  const templates = {};
  // MUST load all templates before data processing
  this.themeStream.on('data', (file) => {
    templates[file.relative] = handlebars.compile(file.contents.toString());
  });
  await streamFinished(this.themeStream);
  this.templates = templates; // Now safe to process data
}
```

### Virtual File System

Gilbert uses **GilbertFile objects** (custom Vinyl implementation) instead of direct filesystem operations, enabling in-memory processing and easy testing.

**Human Context**: Virtual files enable processing content from any source (filesystem, APIs, databases) through a consistent interface, making Gilbert highly adaptable to different deployment scenarios.

> **AI Note**:
>
> - Always use `Utils.vinyl(options)` factory, never direct GilbertFile constructor
> - Set `options.cwd = "/"` for consistent virtual filesystem behavior
> - Use `path.resolve()` for all path operations
> - File contents should be Buffer objects for binary compatibility
> - GilbertFile follows Vinyl conventions: absolute `path`, `base` directory, computed `relative` property

```javascript
// Correct file creation pattern
import { vinyl } from "./Utils.js";
const file = vinyl({
  path: "/index.html",
  contents: Buffer.from(htmlContent),
  cwd: "/",
});

// Access patterns
console.log(file.relative); // "index.html"
console.log(file.dirname); // "/"
console.log(file.extname); // ".html"
```

**GilbertFile Properties:**

- **`path`**: Absolute file path (Vinyl convention)
- **`base`**: Base directory for relative path calculations
- **`relative`**: Computed relative path (read-only)
- **`contents`**: File contents as Buffer or ReadableStream
- **`stat`**: File system statistics (size, dates, etc.)
- **`contentType`**: MIME type based on file extension

### Build vs. Publish Modes

Gilbert supports **selective pipeline execution** to optimize for different deployment scenarios and performance requirements.

**Human Context**: This architecture enables both complete builds during development and fast content-only publishing in serverless environments, providing flexibility for different deployment workflows.

#### Building (Full Pipeline)

**When**: Development, asset changes, CI/CD with complete development environment
**Where**: Local filesystem or VMs with full Node.js environment
**Pipelines Used**: ALL Gilbert pipelines

- **`TemplatePipeline`**: Data + templates → HTML
- **`ScriptsPipeline`**: esbuild bundling, tree-shaking, minification
- **`StylesheetsPipeline`**: PostCSS processing, autoprefixing
- **`StaticFilesPipeline`**: Complete asset copying and optimization

**Requirements**: Full filesystem access for esbuild to read source + node_modules
**Output**: Complete optimized static site ready for deployment

#### Publishing (Content-Only Pipeline)

**When**: Content changes, CMS updates, webhook-triggered publishing
**Where**: Serverless environments (Cloudflare Workers, edge functions)
**Pipelines Used**: SUBSET of Gilbert pipelines

- **`TemplatePipeline`**: Data + templates → HTML _(primary use case)_
- **`StaticFilesPipeline`**: Content-dependent assets only
- **NO** `ScriptsPipeline` or `StylesheetsPipeline` _(assets pre-built)_

**Requirements**: Web API streams only, no filesystem dependencies
**Output**: Updated HTML and content-related assets

#### Design Rationale

**Minimal JS/CSS Philosophy**: Sites built with Gilbert use minimal client-side code, making asset rebuilds unnecessary for content changes.

**esbuild Constraint**: Requires filesystem access to source and node_modules, incompatible with serverless streams-only environments.

**Performance Optimization**: Skip expensive bundling operations when only content changes, enabling sub-second publishing workflows.

> **AI Note**: Gilbert engine supports selective pipeline execution through configuration:
>
> ```javascript
> // Full build (local development)
> await gilbert.compile({
>   uris: { data: dataStream, theme: templateStream },
>   scripts: { entryPoints: ["./src/main.js"] },
>   stylesheets: { entryPoints: ["./src/main.css"] },
>   files: { stream: staticFilesStream },
> });
>
> // Publishing (serverless/edge)
> await gilbert.compile({
>   uris: { data: dataStream, theme: templateStream },
>   files: { stream: contentAssetsStream },
>   // No scripts or stylesheets - assets pre-built
> });
> ```

## Gilbert Packages

Gilbert is organized as a monorepo with specialized packages for different runtime environments and use cases.

### gilbert (Core Engine)

The main Gilbert compiler engine that orchestrates all pipeline processing and stream coordination.

**Package**: `@tforster/gilbert`

**Key Features:**

- **Stream Orchestration**: Coordinates multiple pipelines through Web API streams
- **Pipeline Management**: Manages Template, Scripts, Stylesheets, and Static Files pipelines
- **Build vs. Publish Modes**: Supports selective pipeline execution for different deployment scenarios
- **Memory Management**: Optimized for processing large datasets with minimal memory footprint

> **AI Note**: The core engine is transitioning to pure Web API streams. When implementing new features:
>
> - Use only Web API streams (ReadableStream, TransformStream, WritableStream)
> - Avoid Node.js-specific APIs to maintain runtime portability
> - Pipeline coordination happens through stream merging and composition
> - Main API entry point is `gilbert.compile(config)` method

**Basic Usage:**

```javascript
import Gilbert from "@tforster/gilbert";

const gilbert = new Gilbert({ relativeRoot: "./src" });

await gilbert.compile({
  uris: { data: dataStream, theme: templateStream },
  scripts: { entryPoints: ["./src/main.js"] },
  stylesheets: { entryPoints: ["./src/main.css"] },
  files: { stream: staticFilesStream },
});

// Access the output stream
const outputStream = gilbert.stream;
```

### gilbert-file (Virtual File Objects)

Virtual file object implementation providing a lightweight, Web API-compatible alternative to Vinyl.

**Package**: `@tforster/gilbert-file`

**Key Features:**

- **Web API Compatible**: Uses Web API streams for runtime-agnostic compatibility
- **Lightweight Implementation**: No external dependencies except mime library for content-type detection
- **Vinyl Compatibility**: Maintains compatibility with existing Vinyl-based workflows
- **Path Utilities**: Built-in Web API-compatible path manipulation utilities
- **TypeScript Support**: Comprehensive JSDoc type definitions

> **AI Note**: GilbertFile objects are the core data structure flowing through all Gilbert streams:
>
> - Always use `new GilbertFile(options)` constructor or factory methods
> - Contents can be Buffer, Uint8Array, or ReadableStream for streaming content
> - Path properties follow Vinyl conventions: absolute `path`, `base` directory, computed `relative`
> - Use `clone()` method for file transformations in pipelines

**Usage Examples:**

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

### gilbert-fs (Filesystem Integration)

Web API WritableStream implementation for writing GilbertFile objects to the local filesystem.

**Package**: `@tforster/gilbert-fs`

**Key Features:**

- **Web API Streams**: Standard WritableStream interface for broad compatibility
- **Automatic Directory Creation**: Creates nested directories as needed
- **Multiple Content Types**: Supports Uint8Array, ReadableStream, and null contents
- **Path Resolution**: Handles relative and absolute file paths correctly
- **Local Development Focus**: Optimized for Node.js, Bun, and Deno environments

> **AI Note**: GilbertFS provides the filesystem integration layer for local development:
>
> - Use static methods: `GilbertFS.src(patterns, options)` and `GilbertFS.dest(directory)`
> - Returns proper Web API streams that integrate with Gilbert engine
> - Handles Vinyl path conventions: uses `file.relative` for output path calculation
> - Graceful error handling for invalid directories and file access issues

**Usage Examples:**

```javascript
import GilbertFS from "@tforster/gilbert-fs";

// Read files from filesystem
const sourceStream = GilbertFS.src("**/*", { base: "./src" });

// Write files to filesystem
const destStream = GilbertFS.dest("./dist");

// Pipeline: src → transform → dest
await sourceStream.pipeThrough(transformStream).pipeTo(destStream);
```

### gilbert-github (GitHub Integration)

GitHub integration package for fetching content and templates from GitHub repositories as Web API streams.

**Package**: `@tforster/gilbert-github`

**Key Features:**

- **Web API Streams**: Streams content directly from GitHub API
- **Branch/Tag Support**: Fetch content from specific branches or tags
- **Content Filtering**: Filter and transform GitHub content for Gilbert processing
- **Serverless Ready**: Works in Cloudflare Workers and other serverless environments

> **AI Note**: GitHub integration enables serverless CMS workflows:
>
> - Returns Web API streams compatible with Gilbert engine
> - Handles GitHub API authentication and rate limiting
> - Transforms GitHub file structure to GilbertFile objects
> - Primary use case: webhook-triggered publishing from GitHub-based CMS

**Usage Examples:**

```javascript
import GilbertGitHub from "@tforster/gilbert-github";

// Fetch templates from GitHub
const templateStream = GilbertGitHub.src({
  owner: "username",
  repo: "website-content",
  branch: "main",
  path: "templates/**/*.hbs",
});

// Fetch data from GitHub
const dataStream = GilbertGitHub.src({
  owner: "username",
  repo: "website-content",
  branch: "main",
  path: "data/**/*.json",
});
```

### gilbert-cli (Command Line Interface)

Command-line interface for Gilbert providing filesystem-based development workflows.

**Package**: `@tforster/gilbert-cli`

**Key Features:**

- **Convention-based Configuration**: Works with standard project structures out-of-the-box
- **Flexible Options**: Extensive CLI options for customizing paths and pipeline behavior
- **Development Optimization**: Pipeline disabling and watch mode support
- **Integration Ready**: Designed for CI/CD and automated workflows

> **AI Note**: The CLI is currently paused in development. Focus is on the core engine and programmatic APIs:
>
> - CLI wraps the core gilbert package with filesystem integration
> - Uses gilbert-fs for local file I/O integration
> - Configuration maps CLI options to core engine stream configuration
> - Consider the CLI as a convenience layer over the streaming API

**Usage Examples:**

```bash
# Basic build with default paths
gilbert build

# Custom source and destination
gilbert build --src ./content --dest ./public

# Development with watch mode
gilbert develop --watch

# Pipeline-specific control
gilbert build --no-scripts --no-stylesheets
```

## Adapter Interface Specification

Gilbert adapters provide standardized interfaces for reading from and writing to different data sources. All adapters follow a consistent constructor-based pattern with typed configuration options and Web API streams.

### Constructor Pattern

All Gilbert adapters use modern ES6 class constructors with private fields for configuration encapsulation:

```javascript
// Filesystem adapter
import GilbertFS from "@tforster/gilbert-fs";
const fsAdapter = new GilbertFS({
  cwd: "/project/path", // Working directory (default: process.cwd())
  base: "/project/src", // Base path for relative calculations (default: cwd)
  strict: true, // Fail fast on errors (default: true in dev, false in prod)
});

// GitHub adapter
import GilbertGitHub from "@tforster/gilbert-github";
const githubAdapter = new GilbertGitHub({
  repo: "owner/repository", // Required: GitHub repository
  branch: "main", // Branch to fetch (default: "main")
  token: "ghp_xxx", // GitHub token for private repos (optional)
});
```

### Read Method

The `read(patterns, options)` method creates a ReadableStream of GilbertFile objects matching the specified glob patterns:

```javascript
// Basic usage - single pattern
const stream = adapter.read("**/*.hbs");

// Array patterns for multiple file types
const stream = adapter.read(["**/*.hbs", "**/*.json"]);

// Override instance configuration per read operation
const fsStream = fsAdapter.read("src/**/*", {
  cwd: "/different/path",
  base: "/different/base",
});

const githubStream = githubAdapter.read("templates/**/*", {
  branch: "feature-branch",
  token: "different-token",
});
```

**Method Signature:**

- `patterns` (string|string[]): Glob pattern(s) to match files
- `options` (object): Optional configuration overrides
- **Returns:** `ReadableStream<GilbertFile>`

### Write Method

The `write(destination)` method creates a WritableStream for outputting GilbertFile objects:

```javascript
// Filesystem writing
const writeStream = fsAdapter.write("/output/directory");

// GitHub writing (placeholder - not yet implemented)
const uploadStream = githubAdapter.write("deployment-config");

// Pipeline example
await sourceAdapter.read("**/*").pipeThrough(transformStream).pipeTo(destinationAdapter.write("/output"));
```

**Method Signature:**

- `destination` (string): Output destination configuration
- **Returns:** `WritableStream<GilbertFile>`

### Usage Examples

**Local Development Workflow:**

```javascript
import GilbertFS from "@tforster/gilbert-fs";
import Gilbert from "@tforster/gilbert";

// Create adapters with configuration
const source = new GilbertFS({ base: "./src" });
const output = new GilbertFS({});

// Build pipeline
const gilbert = new Gilbert({
  templates: { source: source.read("templates/**/*.hbs") },
  static: { source: source.read("static/**/*") },
});

// Process and output
await gilbert.stream().pipeTo(output.write("./dist"));
```

**Serverless CMS Workflow:**

```javascript
import GilbertGitHub from "@tforster/gilbert-github";
import GilbertS3 from "@tforster/gilbert-s3";
import Gilbert from "@tforster/gilbert";

// GitHub as content source
const contentSource = new GilbertGitHub({
  repo: "company/website-content",
  branch: "main",
  token: process.env.GITHUB_TOKEN,
});

// S3 as publishing destination
const s3Output = new GilbertS3({
  bucket: "website-bucket",
  region: "us-east-1",
});

// Build and deploy
const gilbert = new Gilbert({
  templates: { source: contentSource.read("templates/**/*.hbs") },
  data: { source: contentSource.read("data/**/*.json") },
});

await gilbert.stream().pipeTo(s3Output.write("/"));
```

**Cross-Platform Adapter Swapping:**

```javascript
// Development: Local filesystem
const devAdapter = new GilbertFS({ base: "./content" });

// Production: GitHub repository
const prodAdapter = new GilbertGitHub({
  repo: "company/content",
  token: process.env.GITHUB_TOKEN,
});

// Same interface, different data source
const contentStream = (isDev ? devAdapter : prodAdapter).read(["templates/**/*.hbs", "data/**/*.json"]);
```

## Pipelines Reference

Gilbert's pipeline system processes different asset types through specialized stream transformations. Each pipeline handles specific file types and provides configurable processing options.

### Template Pipeline

Processes template files using configurable template engines with data injection and partials support.

**Supported Engines:**

- **Handlebars** (`.hbs`, `.handlebars`)
- **Mustache** (`.mustache`)
- **Liquid** (`.liquid`)
- **EJS** (`.ejs`)

**Key Features:**

- **Data Injection**: Automatic merging of context data from data sources
- **Partials Support**: Template composition using includes
- **Output Format Detection**: Automatic file extension resolution

> **AI Note**: Template processing in Gilbert follows a stream-based approach:
>
> - GilbertFile objects carry template content and metadata through the pipeline
> - Template engines are instantiated per-file for isolation
> - Output paths are computed based on template file structure and configuration
> - Error handling preserves source location information for debugging

### Scripts Pipeline

Processes JavaScript and TypeScript files with bundling, transpilation, and optimization.

**Supported Files:**

- **JavaScript** (`.js`)

**Key Features:**

- **Module Bundling**: Dependency resolution and tree shaking
- **Code Transpilation**: ES6+ to target environment compatibility
- **Source Maps**: Debug information preservation
- **Minification**: Production optimization with configurable levels

> **AI Note**: Scripts pipeline does not leverage Web Streams for inbound files as ESBuild does not support streaming input. However, the results from ESBuild are converted into a streamable GilbertFile object.
>
> - Source maps are generated as separate GilbertFile objects in the stream
> - Error reporting includes original source locations even after transpilation

**Configuration:**

```javascript
const scriptsPipeline = new ScriptsPipeline({
  target: "es2020",
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourceMaps: true,
});
```

**Processing Flow:**

1. Module dependency analysis
2. Bundle entry point identification
3. Transpilation and transformation
4. Code optimization
5. Source map generation

### Stylesheets Pipeline

Processes CSS files with preprocessing, optimization, and asset handling.

**Supported Files:**

- **CSS** (`.css`)

**Key Features:**

- **PostCSS Integration**: Plugin-based transformations and autoprefixing
- **Import Resolution**: URL rewriting and asset inlining

> **AI Note**: Stylesheet processing maintains source information through transformations:
>
> - Import graphs are resolved during preprocessing
> - Asset references (images, fonts) are tracked for dependency management
> - PostCSS transformations operate on the GilbertFile content
> - Source maps preserve original file locations across all transformations

**Processing Flow:**

1. Preprocessor detection
2. Import dependency resolution
3. Compilation and transformation
4. PostCSS plugin execution
5. Optimization and minification

### Static Files Pipeline

Handles binary assets, images, fonts, and other static resources with optimization and versioning.

**Supported Files:**

- All files are supported. The static files pipeline does not discriminate.

**Key Features:**

- **Copy Operations**: Efficient binary data streaming

> **AI Note**: Static files pipeline operates on binary streams:
>
> - Binary content is handled as Uint8Array streams for memory efficiency
> - Large files are processed in chunks to maintain low memory usage

**Processing Flow:**

1. File type detection
2. Binary content streaming
3. Optimization transformations
4. Content hash generation
5. Destination path computation

## API Reference

Comprehensive API documentation for all Gilbert packages and their exported interfaces.

### Core Engine API

The main gilbert package provides the core streaming engine and pipeline orchestration.

**gilbert.createPipeline(config)**

Creates a new Gilbert pipeline with the specified configuration.

```javascript
import gilbert from "@tforster/gilbert";

// TODO: Update this
```

**Parameters:**

**Returns:** `Pipeline` - Configured pipeline instance

**gilbert.stream(source, destination, options)**

Creates a Web API streams-based processing pipeline.

```javascript
const stream = gilbert.stream(sourceStream, destinationStream, { data: dataSource });
```

**Parameters:**

- `source` (ReadableStream): Source file stream
- `destination` (WritableStream): Destination file stream
- `options.data` (DataSource): Template context data

**Returns:** `Promise<void>` - Resolves when pipeline completes

### GilbertFile API

Virtual file objects that flow through Gilbert pipelines.

**new GilbertFile(options)**

Creates a new virtual file object.

```javascript
import { GilbertFile } from "@tforster/gilbert-file";

const file = new GilbertFile({
  path: "/src/index.html",
  contents: Buffer.from("<html>...</html>"),
});
```

**Properties:**

- `path` (string): Absolute file path
- `contents` (Buffer|string): File content
- `extname` (string): File extension (derived from path)
- `basename` (string): Filename without extension

**Methods:**

- `clone()`: Creates a deep copy of the file
- `isBuffer()`: Returns true if contents is a Buffer
- `isString()`: Returns true if contents is a string

### Filesystem Integration API

**gilbert-fs.src(pattern, options)**

Creates a readable stream of files from the filesystem.

```javascript
import { src } from "@tforster/gilbert-fs";

const sourceStream = src("src/**/*.html", {
  cwd: process.cwd(),
  base: "./src",
});
```

**Parameters:**

- `pattern` (string|Array): Glob pattern(s) for file selection
- `options.cwd` (string): Current working directory
- `options.base` (string): Base path for relative file paths

**Returns:** `ReadableStream<GilbertFile>` - Stream of matching files

**gilbert-fs.dest(directory, options)**

Creates a writable stream that saves files to the filesystem.

```javascript
import { dest } from "@tforster/gilbert-fs";

const outputStream = dest("./dist", {
  mode: 0o644,
  overwrite: true,
});
```

**Parameters:**

- `directory` (string): Output directory path
- `options.mode` (number): File permissions mode
- `options.overwrite` (boolean): Whether to overwrite existing files

**Returns:** `WritableStream<GilbertFile>` - Stream that accepts files

### GitHub Integration API

**gilbert-github.src(repo, path, options)**

Creates a readable stream of files from a GitHub repository.

```javascript
import { src } from "@tforster/gilbert-github";

const githubStream = src("owner/repo", "content/**/*.md", {
  ref: "main",
  token: process.env.GITHUB_TOKEN,
});
```

**Parameters:**

- `repo` (string): Repository in 'owner/name' format
- `path` (string): File path or glob pattern
- `options.ref` (string): Git reference (branch, tag, or commit)
- `options.token` (string): GitHub API authentication token

**Returns:** `ReadableStream<GilbertFile>` - Stream of repository files

### Data Source API

**new DataSource(sources)**

Creates a data source for template context injection.

```javascript
import { DataSource } from "@tforster/gilbert";

const dataSource = new DataSource(["./data/**/*.json", "./data/**/*.yaml", "https://api.example.com/data"]);
```

**Parameters:**

- `sources` (Array): Array of data source paths (files, URLs, or objects)

**Methods:**

- `getData()`: Returns Promise`<object>` with merged data
- `watch()`: Returns stream of data updates for development

### Pipeline Configuration API

**TemplatePipeline Configuration**

```javascript
{
  engines: {
    handlebars: {
      helpers: object,      // Custom helper functions
      partials: string,     // Partials directory path
      layouts: string       // Layouts directory path
    },
    // Similar for mustache, liquid, ejs
  },
  data: DataSource,        // Template context data
  outputExtension: string  // Override output extension
}
```

**ScriptsPipeline Configuration**

```javascript
{
  target: string,          // ES target version (es2020, es2022, etc.)
  bundle: boolean,         // Enable module bundling
  minify: boolean,         // Enable code minification
  sourceMaps: boolean,     // Generate source maps
  externals: Array,        // External dependencies to exclude
  plugins: Array          // Additional build plugins
}
```

**StylesheetsPipeline Configuration**

```javascript
{
  sass: {
    includePaths: Array,   // Sass import search paths
    outputStyle: string    // Sass output style (expanded, compressed)
  },
  postcss: {
    plugins: Array         // PostCSS plugin names or instances
  },
  extractCritical: boolean // Extract critical CSS
}
```

**StaticFilesPipeline Configuration**

```javascript
{
  imageOptimization: {
    quality: number,       // JPEG quality (0-100)
    formats: Array         // Output formats (['webp', 'original'])
  },
  versioning: {
    strategy: string,      // Versioning strategy ('hash', 'timestamp')
    length: number         // Hash length for hash strategy
  },
  copyPattern: string     // Glob pattern for files to copy
}
```

## Integration Patterns

Common patterns for integrating Gilbert into different development and deployment workflows.

### Local Development Environment

Set up Gilbert for local development with file watching and hot reload capabilities.

**Project Structure:**

```shell
my-project/
├── src/
│   ├── templates/
│   ├── scripts/
│   ├── stylesheets/
│   └── static/
├── data/
│   ├── config.json
│   └── content.yaml
├── dist/
└── package.json
```

**Development Configuration:**

```javascript
import gilbert from "@tforster/gilbert";
import { src, dest } from "@tforster/gilbert-fs";
import { DataSource } from "@tforster/gilbert";

const dataSource = new DataSource(["./data/**/*.json", "./data/**/*.yaml"]);

const developmentPipeline = gilbert.createPipeline({
  src: "./src",
  dest: "./dist",
  data: dataSource,
  watch: true,
  pipelines: {
    templates: { outputExtension: ".html" },
    scripts: { sourceMaps: true, minify: false },
    stylesheets: { sourceMaps: true },
    static: { imageOptimization: false },
  },
});

// Start development server
developmentPipeline.watch();
```

> **AI Note**: Local development patterns emphasize fast rebuilds and debugging:
>
> - Enable source maps for all pipelines to facilitate debugging
> - Disable optimization (minification, image compression) for faster builds
> - Use file watching to trigger incremental rebuilds on content changes
> - Consider serving the output directory with a local HTTP server for testing

**Watch Mode Implementation:**

```javascript
import chokidar from "chokidar";

const watcher = chokidar.watch("./src", {
  ignored: /node_modules/,
  persistent: true,
});

watcher.on("change", async (path) => {
  console.log(`File changed: ${path}`);
  await pipeline.rebuild();
});
```

### Serverless Deployment

Deploy Gilbert-generated sites to serverless platforms with optimized asset delivery.

**AWS Lambda + S3 + CloudFront:**

```javascript
import gilbert from "@tforster/gilbert";
import { src } from "@tforster/gilbert-github";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const handler = async (event) => {
  // Source content from GitHub
  const sourceStream = src("owner/content-repo", "**/*", {
    ref: "main",
    token: process.env.GITHUB_TOKEN,
  });

  // Process content
  const pipeline = gilbert.createPipeline({
    data: new DataSource(["https://api.example.com/data"]),
    pipelines: {
      templates: true,
      scripts: { minify: true, bundle: true },
      stylesheets: { extractCritical: true },
      static: { imageOptimization: true },
    },
  });

  // Deploy to S3
  const s3Client = new S3Client({ region: process.env.AWS_REGION });

  await pipeline.stream(
    sourceStream,
    new WritableStream({
      async write(file) {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: file.path,
            Body: file.contents,
            ContentType: getContentType(file.extname),
          })
        );
      },
    })
  );

  return { statusCode: 200, body: "Site deployed successfully" };
};
```

**Vercel Edge Functions:**

```javascript
export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");

  // Generate site on-demand
  const sourceStream = src(repo, "**/*");
  const pipeline = gilbert.createPipeline({
    data: new DataSource([`https://api.example.com/data/${repo}`]),
  });

  // Stream response
  const responseStream = new ReadableStream({
    start(controller) {
      pipeline.stream(
        sourceStream,
        new WritableStream({
          write(file) {
            controller.enqueue(file);
          },
          close() {
            controller.close();
          },
        })
      );
    },
  });

  return new Response(responseStream);
}
```

### CI/CD Integration

Integrate Gilbert into continuous integration and deployment pipelines.

**GitHub Actions Workflow:**

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          API_ENDPOINT: ${{ secrets.API_ENDPOINT }}

      - name: Deploy to S3
        if: github.ref == 'refs/heads/main'
        run: aws s3 sync ./dist s3://${{ secrets.S3_BUCKET }} --delete
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

**Node.js Build Script:**

```javascript
#!/usr/bin/env node
import gilbert from "@tforster/gilbert";
import { src, dest } from "@tforster/gilbert-fs";

const isProduction = process.env.NODE_ENV === "production";

const pipeline = gilbert.createPipeline({
  src: "./src",
  dest: "./dist",
  data: new DataSource(["./data/**/*.json", process.env.API_ENDPOINT]),
  pipelines: {
    templates: true,
    scripts: {
      minify: isProduction,
      sourceMaps: !isProduction,
    },
    stylesheets: {
      extractCritical: isProduction,
    },
    static: {
      imageOptimization: isProduction,
      versioning: isProduction ? { strategy: "hash" } : false,
    },
  },
});

await pipeline.build();
console.log("Build completed successfully");
```

### Headless CMS Integration

Connect Gilbert to headless CMS systems for content management workflows.

**Contentful Integration:**

```javascript
import gilbert from "@tforster/gilbert";
import { createClient } from "contentful";

const contentfulClient = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

class ContentfulDataSource {
  async getData() {
    const entries = await contentfulClient.getEntries();

    return {
      posts: entries.items.filter((item) => item.sys.contentType.sys.id === "blogPost"),
      pages: entries.items.filter((item) => item.sys.contentType.sys.id === "page"),
      config: {
        siteTitle: "My Site",
        buildTime: new Date().toISOString(),
      },
    };
  }
}

const pipeline = gilbert.createPipeline({
  src: "./templates",
  dest: "./dist",
  data: new ContentfulDataSource(),
  pipelines: {
    templates: {
      engines: {
        handlebars: {
          helpers: {
            formatDate: (date) => new Date(date).toLocaleDateString(),
            excerpt: (text, length = 150) => text.substring(0, length) + "...",
          },
        },
      },
    },
  },
});
```

**Strapi Integration:**

```javascript
class StrapiDataSource {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getData() {
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };

    const [articles, categories] = await Promise.all([
      fetch(`${this.baseUrl}/api/articles?populate=*`, { headers }).then((r) => r.json()),
      fetch(`${this.baseUrl}/api/categories`, { headers }).then((r) => r.json()),
    ]);

    return {
      articles: articles.data,
      categories: categories.data,
      navigation: await this.buildNavigation(categories.data),
    };
  }

  async buildNavigation(categories) {
    return categories.map((cat) => ({
      title: cat.attributes.name,
      url: `/category/${cat.attributes.slug}/`,
      children: [],
    }));
  }
}
```

> **AI Note**: CMS integration patterns in Gilbert emphasize data transformation:
>
> - CMS APIs return structured data that needs transformation for templates
> - Consider caching CMS data during development to reduce API calls
> - Implement incremental builds by comparing content timestamps
> - Use Web API fetch for CMS integration to maintain runtime compatibility
> - Structure data sources to match template expectations for easier debugging

## Migration Guides

Guidelines for migrating to Gilbert from other static site generators and for upgrading between Gilbert versions.

## Development Workflows

Best practices and workflows for developing with Gilbert, including testing, debugging, and performance optimization.

### Testing Strategy

Comprehensive testing approach for Gilbert projects covering unit tests, integration tests, and end-to-end validation.

**Testing Philosophy:**

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test pipeline interactions and data flow
- **End-to-End Tests**: Validate complete build output
- **Performance Tests**: Monitor build times and memory usage

**Unit Testing Example:**

```javascript
import { describe, it, expect } from "vitest";
import { GilbertFile } from "@tforster/gilbert-file";

describe("GilbertFile", () => {
  it("should create file with correct properties", () => {
    const file = new GilbertFile({
      path: "/src/index.html",
      contents: Buffer.from("<html></html>"),
    });

    expect(file.path).toBe("/src/index.html");
    expect(file.extname).toBe(".html");
    expect(file.basename).toBe("index");
    expect(file.isBuffer()).toBe(true);
  });

  it("should clone file with deep copy", () => {
    const original = new GilbertFile({
      path: "/src/page.html",
      contents: Buffer.from("<html></html>"),
      data: { title: "Test" },
    });

    const clone = original.clone();

    expect(clone.path).toBe(original.path);
    expect(clone.contents).toEqual(original.contents);
    expect(clone.data).toEqual(original.data);
    expect(clone.data).not.toBe(original.data); // Different objects
  });
});
```

**Integration Testing:**

```javascript
import { describe, it, expect } from "vitest";
import gilbert from "@tforster/gilbert";
import { src, dest } from "@tforster/gilbert-fs";
import { promises as fs } from "fs";
import path from "path";

describe("Template Pipeline Integration", () => {
  it("should process handlebars templates with data", async () => {
    const tempDir = await fs.mkdtemp("./temp-test-");

    try {
      // Create test template
      await fs.writeFile(path.join(tempDir, "index.hbs"), "<h1>{{title}}</h1><p>{{description}}</p>");

      // Create data source
      const dataSource = {
        getData: () =>
          Promise.resolve({
            title: "Test Page",
            description: "Integration test",
          }),
      };

      // Run pipeline
      const pipeline = gilbert.createPipeline({
        src: tempDir,
        dest: path.join(tempDir, "dist"),
        data: dataSource,
        pipelines: { templates: true },
      });

      await pipeline.build();

      // Verify output
      const output = await fs.readFile(path.join(tempDir, "dist", "index.html"), "utf8");

      expect(output).toBe("<h1>Test Page</h1><p>Integration test</p>");
    } finally {
      await fs.rm(tempDir, { recursive: true });
    }
  });
});
```

**End-to-End Testing:**

```javascript
describe("Complete Site Build", () => {
  it("should build entire site correctly", async () => {
    const fixtures = "./tests/fixtures/blog-site";
    const output = "./tests/output/blog-site";

    const pipeline = gilbert.createPipeline({
      src: path.join(fixtures, "src"),
      dest: output,
      data: new DataSource([path.join(fixtures, "data/**/*.json")]),
    });

    await pipeline.build();

    // Verify expected files exist
    const expectedFiles = ["index.html", "about/index.html", "posts/first-post/index.html", "assets/style.css", "assets/main.js"];

    for (const file of expectedFiles) {
      const exists = await fs
        .access(path.join(output, file))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    }

    // Verify content correctness
    const indexContent = await fs.readFile(path.join(output, "index.html"), "utf8");
    expect(indexContent).toContain("<title>My Blog</title>");
    expect(indexContent).toContain("<h1>Welcome</h1>");
  });
});
```

**Mono-repo Testing Structure:**

Gilbert uses a workspace-based testing approach with tests distributed across individual packages and centralized integration tests.

**Test Execution Options:**

```bash
# Run all tests across all workspaces (comprehensive but slower)
npm test

# Run specific workspace tests from root (preferred - no directory changes)
npm -w services/gilbert test              # Core engine tests
npm -w services/gilbert-file test         # Virtual file tests
npm -w services/gilbert-fs test           # Filesystem tests
npm -w services/gilbert-logger test       # Async logger tests
npm -w services/gilbert-cli test          # CLI tests

# Alternative: Run specific workspace tests (requires directory changes)
cd services/gilbert && npm test              # Core engine tests
cd services/gilbert-file && npm test         # Virtual file tests
cd services/gilbert-fs && npm test           # Filesystem tests
cd services/gilbert-logger && npm test       # Async logger tests
cd services/gilbert-cli && npm test          # CLI tests

# Run specific test types in gilbert workspace from root
npm -w services/gilbert run test:all         # All gilbert tests
npm -w services/gilbert exec -- node --test tests/ultimate.test.js    # Performance benchmark
npm -w services/gilbert exec -- node --test tests/templates.test.js   # TemplatePipeline tests
```

**Test Locations by Workspace:**

- **Root (`/tests/`)**: Cross-workspace integration tests and publish scenarios
- **`services/gilbert/tests/`**: Core engine tests including pipelines and performance
  - `integration.test.js`: End-to-end pipeline validation
  - `ultimate.test.js`: Performance benchmarks (target: 200+ pages/sec)
  - `templates.test.js`: TemplatePipeline functionality
  - `scripts.test.js`, `stylesheets.test.js`, `static-files.test.js`: Pipeline-specific tests
- **`services/gilbert-file/tests/`**: Virtual file object unit tests
- **`services/gilbert-fs/tests/`**: Filesystem integration tests
- **`services/gilbert-logger/tests/`**: Async logging functionality tests
- **`test-harness/`**: Real-world integration scenarios and mock testing

**Performance Testing:**

The `ultimate.test.js` serves as both a functional test and performance benchmark:

```bash
# Run performance benchmark
cd services/gilbert && node --test tests/ultimate.test.js

# Expected output: Processing time < 185ms for 29 files (target: 200+ pages/sec)
```

**Test Development Guidelines:**

- **Workspace Isolation**: Each workspace should have comprehensive unit tests for its public APIs
- **Integration Coverage**: Root integration tests validate cross-workspace interactions
- **Performance Monitoring**: Ultimate test tracks performance regressions
- **Mock Testing**: Use `test-harness/` for complex scenario validation without external dependencies
- **CI Compatibility**: All tests must pass in headless environments without filesystem dependencies

**Common Test Patterns:**

```javascript
// Gilbert pipeline testing pattern
import { Gilbert } from "@tforster/gilbert";
import { createMockDataStream, createMockTemplateStream } from "./fixtures/streams.js";

describe("Pipeline Integration", () => {
  it("should process data through pipeline", async () => {
    const gilbert = new Gilbert(config);
    const result = await gilbert.build(dataStream, templateStream);
    // Validate output...
  });
});
```

### Mono-repo Development

Best practices for developing Gilbert packages within the mono-repo structure, including versioning and dependency management.

**Versioning Conventions:**

- **New Projects**: All new Gilbert packages start with semantic version `0.1.0`
- **Development Phase**: Increment patch version (0.1.x) for development iterations
- **Pre-release Phase**: Use pre-release tags for testing (0.2.0-alpha.1, 0.2.0-beta.1)
- **First Publication**: Major version bumps from 0 to 1 only on first npm publish (1.0.0)

**Dependency Management with npm link:**

Gilbert uses npm link for local package dependencies during development to ensure consistency and avoid path-based imports that need modification before publishing.

```bash
# 1. Create global link for the new package
cd services/gilbert-newpackage
npm link

# 2. Link the package in consuming projects
cd ../gilbert
npm link @tforster/gilbert-newpackage

# 3. Update package.json with proper dependency
# Add to dependencies section:
"@tforster/gilbert-newpackage": "^0.1.0"

# 4. Use standard npm import syntax
import { someFunction } from "@tforster/gilbert-newpackage";
```

**Why npm link over relative paths:**

- **Consistency**: Same import syntax in development and production
- **Publishing Ready**: No import path changes required before npm publish
- **IDE Support**: Better TypeScript/VSCode IntelliSense with proper package names
- **Testing**: Validates package exports and dependencies correctly

**Workspace Structure:**

```text
Gilbert/
├── package.json              # Root workspace configuration
├── services/
│   ├── gilbert/              # Core engine (0.x.x)
│   ├── gilbert-file/         # Virtual file objects (0.x.x)
│   ├── gilbert-fs/           # Filesystem integration (0.x.x)
│   ├── gilbert-logger/       # Async logging (0.x.x)
│   └── gilbert-newpackage/   # New package (starts at 0.1.0)
```

### Debugging Techniques

Effective debugging strategies for Gilbert pipelines and data flows.

**Debug Configuration:**

```javascript
const pipeline = gilbert.createPipeline({
  src: "./src",
  dest: "./dist",
  debug: {
    logLevel: "verbose",
    logPipeline: true,
    logData: true,
    preserveTemp: true,
  },
  data: dataSource,
});
```

**Stream Debugging:**

```javascript
import { PassThrough } from "stream";

// Debug transform that logs file information
const debugTransform = new TransformStream({
  transform(file, controller) {
    console.log(`Processing: ${file.path}`);
    console.log(`Size: ${file.contents.length} bytes`);
    console.log(`Data keys: ${Object.keys(file.data || {})}`);

    controller.enqueue(file);
  },
});

// Insert debug transform in pipeline
const sourceStream = src("./src/**/*");
const debuggedStream = sourceStream.pipeThrough(debugTransform);
```

**Error Handling:**

```javascript
try {
  await pipeline.build();
} catch (error) {
  if (error.file) {
    console.error(`Error in file: ${error.file.path}`);
    console.error(`Line: ${error.line}, Column: ${error.column}`);
  }

  console.error(`Error type: ${error.name}`);
  console.error(`Message: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
}
```

**Data Source Debugging:**

```javascript
class DebugDataSource {
  constructor(originalDataSource) {
    this.original = originalDataSource;
  }

  async getData() {
    const data = await this.original.getData();

    console.log("Data Source Output:");
    console.log(`Keys: ${Object.keys(data)}`);
    console.log(`Total size: ${JSON.stringify(data).length} chars`);

    // Log sample data
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        console.log(`${key}: Array with ${value.length} items`);
      } else if (typeof value === "object") {
        console.log(`${key}: Object with keys: ${Object.keys(value)}`);
      } else {
        console.log(`${key}: ${typeof value} = ${value}`);
      }
    }

    return data;
  }
}
```

> **AI Note**: Debugging Gilbert streams requires understanding the asynchronous flow:
>
> - Use debug transforms to inspect files at different pipeline stages
> - Log data sources separately to verify template context
> - Preserve temporary files during development for inspection
> - Use source maps to trace errors back to original files
> - Consider breakpoints in transform functions for step-by-step debugging

### Performance Optimization

Strategies for optimizing Gilbert build performance and output quality.

**Build Performance Monitoring:**

```javascript
class PerformanceMonitor {
  constructor() {
    this.startTime = performance.now();
    this.stages = new Map();
  }

  mark(stage) {
    this.stages.set(stage, performance.now() - this.startTime);
  }

  report() {
    console.log("Build Performance Report:");
    for (const [stage, time] of this.stages) {
      console.log(`${stage}: ${time.toFixed(2)}ms`);
    }
  }
}

const monitor = new PerformanceMonitor();

const pipeline = gilbert.createPipeline({
  src: "./src",
  dest: "./dist",
  hooks: {
    beforeBuild: () => monitor.mark("Build Start"),
    afterTemplates: () => monitor.mark("Templates Complete"),
    afterScripts: () => monitor.mark("Scripts Complete"),
    afterStylesheets: () => monitor.mark("Stylesheets Complete"),
    afterBuild: () => {
      monitor.mark("Build Complete");
      monitor.report();
    },
  },
});
```

**Memory Optimization:**

```javascript
// Stream processing for large datasets
const optimizedPipeline = gilbert.createPipeline({
  src: "./src",
  dest: "./dist",
  streaming: {
    highWaterMark: 1, // Process one file at a time
    objectMode: true,
  },
  pipelines: {
    templates: {
      batchSize: 10, // Process templates in small batches
      cacheTemplates: false, // Don't cache compiled templates
    },
  },
});
```

**Selective Building:**

```javascript
// Build only changed files during development
import chokidar from "chokidar";

class IncrementalBuilder {
  constructor(pipeline) {
    this.pipeline = pipeline;
    this.lastBuild = new Map(); // file path -> modification time
  }

  async buildChanged(changedFiles) {
    const filesToBuild = changedFiles.filter((file) => {
      const stat = fs.statSync(file);
      const lastMod = this.lastBuild.get(file);

      if (!lastMod || stat.mtime > lastMod) {
        this.lastBuild.set(file, stat.mtime);
        return true;
      }
      return false;
    });

    if (filesToBuild.length > 0) {
      await this.pipeline.buildFiles(filesToBuild);
    }
  }
}
```

**Caching Strategy:**

```javascript
import crypto from "crypto";

class BuildCache {
  constructor(cacheDir = ".cache") {
    this.cacheDir = cacheDir;
    this.cache = new Map();
  }

  getKey(file) {
    const content = file.contents.toString();
    return crypto.createHash("md5").update(content).digest("hex");
  }

  async get(file) {
    const key = this.getKey(file);
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    try {
      const cachePath = path.join(this.cacheDir, `${key}.json`);
      const cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
      this.cache.set(key, cached);
      return cached;
    } catch {
      return null;
    }
  }

  async set(file, result) {
    const key = this.getKey(file);
    this.cache.set(key, result);

    const cachePath = path.join(this.cacheDir, `${key}.json`);
    await fs.writeFile(cachePath, JSON.stringify(result));
  }
}
```

> **AI Note**: Performance optimization in Gilbert focuses on stream efficiency:
>
> - Minimize memory usage by processing files individually rather than accumulating
> - Use caching for expensive operations like template compilation and image processing
> - Implement incremental builds for development workflows
> - Monitor build performance to identify bottlenecks
> - Consider parallel processing for independent operations

## Deployment Guide

Comprehensive deployment strategies for Gilbert-generated sites across different platforms and environments.

### Static Hosting Platforms

Deploy Gilbert sites to popular static hosting services with optimal configuration.

**Netlify Deployment:**

```yaml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[dev]
  command = "npm run develop"
  port = 3000
```

```javascript
// Build script for Netlify
import gilbert from "@tforster/gilbert";
import { DataSource } from "@tforster/gilbert";

const isProd = process.env.CONTEXT === "production";

const pipeline = gilbert.createPipeline({
  src: "./src",
  dest: "./dist",
  data: new DataSource(["./data/**/*.json", process.env.CMS_API_URL]),
  pipelines: {
    templates: true,
    scripts: { minify: isProd },
    stylesheets: { extractCritical: isProd },
    static: {
      imageOptimization: isProd,
      versioning: isProd ? { strategy: "hash" } : false,
    },
  },
});

await pipeline.build();
```

**Vercel Deployment:**

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "devCommand": "npm run develop",
  "framework": null,
  "regions": ["iad1", "sfo1"],
  "functions": {
    "src/api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  }
}
```

**GitHub Pages Deployment:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Pages
        uses: actions/configure-pages@v3

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: "./dist"

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

### Cloud Platform Deployment

Deploy Gilbert sites to major cloud platforms with CDN integration.

**AWS S3 + CloudFront:**

```javascript
// deploy-aws.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import mime from "mime-types";

class AWSDeployer {
  constructor(config) {
    this.s3 = new S3Client({ region: config.region });
    this.cloudfront = new CloudFrontClient({ region: config.region });
    this.bucket = config.bucket;
    this.distributionId = config.distributionId;
  }

  async deploy(buildDir) {
    const files = await this.getFiles(buildDir);

    // Upload files to S3
    for (const file of files) {
      await this.uploadFile(file);
    }

    // Invalidate CloudFront cache
    await this.invalidateCache();
  }

  async uploadFile(file) {
    const content = await readFile(file.path);
    const contentType = mime.lookup(file.key) || "application/octet-stream";

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: file.key,
        Body: content,
        ContentType: contentType,
        CacheControl: this.getCacheControl(file.key),
      })
    );
  }

  getCacheControl(key) {
    if (key.includes("/assets/")) {
      return "public, max-age=31536000, immutable"; // 1 year for assets
    }
    return "public, max-age=3600"; // 1 hour for content
  }

  async invalidateCache() {
    await this.cloudfront.send(
      new CreateInvalidationCommand({
        DistributionId: this.distributionId,
        InvalidationBatch: {
          Paths: { Quantity: 1, Items: ["/*"] },
          CallerReference: Date.now().toString(),
        },
      })
    );
  }
}
```

**Google Cloud Storage + CDN:**

```javascript
// deploy-gcp.js
import { Storage } from "@google-cloud/storage";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

class GCPDeployer {
  constructor(config) {
    this.storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.keyFile,
    });
    this.bucket = this.storage.bucket(config.bucketName);
  }

  async deploy(buildDir) {
    const files = await this.getFiles(buildDir);

    for (const file of files) {
      const fileObj = this.bucket.file(file.key);
      const content = await readFile(file.path);

      await fileObj.save(content, {
        metadata: {
          contentType: mime.lookup(file.key) || "application/octet-stream",
          cacheControl: this.getCacheControl(file.key),
        },
      });
    }
  }
}
```

### Serverless Deployment

Deploy Gilbert as serverless functions for dynamic content generation.

**Netlify Functions:**

```javascript
// netlify/functions/generate-site.js
import gilbert from "@tforster/gilbert";
import { src } from "@tforster/gilbert-github";

export const handler = async (event) => {
  try {
    const { repo, ref = "main" } = JSON.parse(event.body);

    // Source content from GitHub
    const sourceStream = src(repo, "**/*", {
      ref,
      token: process.env.GITHUB_TOKEN,
    });

    // Generate site
    const pipeline = gilbert.createPipeline({
      data: new DataSource([`https://api.example.com/data/${repo}`]),
      pipelines: {
        templates: true,
        scripts: { minify: true },
        stylesheets: { extractCritical: true },
      },
    });

    const files = [];
    await pipeline.stream(
      sourceStream,
      new WritableStream({
        write(file) {
          files.push({
            path: file.path,
            content: file.contents.toString(),
            contentType: mime.lookup(file.extname),
          });
        },
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files, message: "Site generated successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

**Cloudflare Workers:**

```javascript
// worker.js
import gilbert from "@tforster/gilbert";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const repo = url.searchParams.get("repo");

    if (!repo) {
      return new Response("Missing repo parameter", { status: 400 });
    }

    try {
      // Generate site on-demand
      const sourceStream = src(repo, "**/*", {
        token: env.GITHUB_TOKEN,
      });

      const pipeline = gilbert.createPipeline({
        data: new DataSource([`${env.API_BASE_URL}/data/${repo}`]),
      });

      // Stream response
      const responseStream = new ReadableStream({
        start(controller) {
          pipeline.stream(
            sourceStream,
            new WritableStream({
              write(file) {
                controller.enqueue(
                  new TextEncoder().encode(
                    JSON.stringify({
                      path: file.path,
                      content: file.contents,
                    }) + "\n"
                  )
                );
              },
              close() {
                controller.close();
              },
            })
          );
        },
      });

      return new Response(responseStream, {
        headers: { "Content-Type": "application/x-ndjson" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
```

### Container Deployment

Deploy Gilbert in containerized environments for scalable generation.

**Docker Configuration:**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S gilbert -u 1001
USER gilbert

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

```javascript
// server.js
import express from "express";
import gilbert from "@tforster/gilbert";
import { src } from "@tforster/gilbert-github";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post("/generate", async (req, res) => {
  try {
    const { repo, config } = req.body;

    const sourceStream = src(repo, "**/*", {
      token: process.env.GITHUB_TOKEN,
    });

    const pipeline = gilbert.createPipeline(config);
    const files = [];

    await pipeline.stream(
      sourceStream,
      new WritableStream({
        write(file) {
          files.push({
            path: file.path,
            content: file.contents,
            size: file.contents.length,
          });
        },
      })
    );

    res.json({ files, count: files.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Gilbert server running on port ${port}`);
});
```

**Kubernetes Deployment:**

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gilbert-generator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gilbert-generator
  template:
    metadata:
      labels:
        app: gilbert-generator
    spec:
      containers:
      - name: gilbert
        image: gilbert:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: gilbert-secrets
              key: github-token
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

apiVersion: v1
kind: Service
metadata:
  name: gilbert-service
spec:
  selector:
    app: gilbert-generator
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

> **AI Note**: Deployment considerations for Gilbert:
>
> - Choose deployment strategy based on content update frequency
> - Static hosting for content that changes infrequently
> - Serverless functions for on-demand generation
> - Container deployment for high-volume or complex processing
> - Always implement proper error handling and monitoring
> - Use environment-specific configurations for optimal performance

## Troubleshooting

Common issues and solutions when working with Gilbert, including debugging strategies and error resolution.

### Common Build Issues

**Stream Processing Errors:**

```shell
Error: Pipeline failed with unhandled promise rejection
ReadableStream is locked by another reader
```

**Solution:**

```javascript
// Ensure streams are properly managed
try {
  const sourceStream = src("./src/**/*");

  // Don't reuse streams - create new ones for each operation
  await sourceStream.pipeThrough(templateTransform).pipeTo(dest("./dist"));
} catch (error) {
  console.error("Pipeline error:", error);
  // Clean up any locked streams
  if (sourceStream.locked) {
    await sourceStream.cancel();
  }
}
```

### Performance Issues

**Memory Usage Issues:**

```javascript
// Optimize for large sites
const pipeline = gilbert.createPipeline({
  streaming: {
    highWaterMark: 1, // Process one file at a time
    objectMode: true,
  },
  pipelines: {
    templates: {
      cacheTemplates: false, // Don't cache compiled templates
      batchSize: 5, // Process in small batches
    },
  },
});
```

### Data Flow Debugging

**Template Context Issues:**

```javascript
// Debug template data
const debugTransform = new TransformStream({
  transform(file, controller) {
    if (file.extname === ".hbs") {
      console.log(`Template: ${file.path}`);
      console.log(`Data keys: ${Object.keys(file.data || {})}`);
      console.log(`Sample data:`, JSON.stringify(file.data, null, 2).slice(0, 200));
    }
    controller.enqueue(file);
  },
});
```

**Pipeline Flow Debugging:**

```javascript
// Trace file flow through pipelines
class PipelineTracer {
  constructor() {
    this.files = new Map();
  }

  trace(stage) {
    return new TransformStream({
      transform: (file, controller) => {
        const entry = this.files.get(file.path) || { path: file.path, stages: [] };
        entry.stages.push({
          stage,
          timestamp: Date.now(),
          size: file.contents?.length || 0,
        });
        this.files.set(file.path, entry);

        console.log(`${stage}: ${file.path} (${entry.size} bytes)`);
        controller.enqueue(file);
      },
    });
  }

  report() {
    for (const [path, entry] of this.files) {
      console.log(`\nFile: ${path}`);
      for (const stage of entry.stages) {
        console.log(`  ${stage.stage}: ${stage.timestamp}ms (${stage.size} bytes)`);
      }
    }
  }
}
```

### Error Recovery Strategies

**Graceful Degradation:**

```javascript
// Handle partial build failures
const resilientPipeline = gilbert.createPipeline({
  errorHandling: {
    strategy: "continue", // Don't stop on individual file errors
    logErrors: true,
    fallbackContent: (file, error) => {
      console.warn(`Failed to process ${file.path}: ${error.message}`);
      return `<!-- Error processing ${file.path}: ${error.message} -->`;
    },
  },
});
```

**Retry Logic:**

```javascript
// Retry failed operations
async function buildWithRetry(pipeline, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pipeline.build();
      return; // Success
    } catch (error) {
      console.warn(`Build attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw error; // Final attempt failed
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

## Advanced Topics

Advanced Gilbert features and patterns for complex use cases and custom integrations.

### Custom Pipeline Development

Create custom pipelines for specialized content processing needs.

**Custom Transform Stream:**

```javascript
class MarkdownPipeline extends TransformStream {
  constructor(options = {}) {
    super({
      transform: (file, controller) => {
        if (file.extname === '.md') {
          const processed = this.processMarkdown(file, options);
          controller.enqueue(processed);
        } else {
          controller.enqueue(file);
        }
      }
    });

    this.options = options;
  }

  processMarkdown(file, options) {
    const { marked } = await import('marked');

    // Configure marked with custom renderer
    const renderer = new marked.Renderer();
    renderer.heading = (text, level) => {
      const id = text.toLowerCase().replace(/\s+/g, '-');
      return `<h${level} id="${id}">${text}</h${level}>`;
    };

    marked.setOptions({
      renderer,
      highlight: options.highlight || this.defaultHighlight,
      gfm: true,
      breaks: false
    });

    const content = marked(file.contents.toString());

    return new GilbertFile({
      path: file.path.replace('.md', '.html'),
      contents: Buffer.from(content),
      data: file.data
    });
  }

  defaultHighlight(code, language) {
    const { highlight } = await import('highlight.js');
    if (language && highlight.getLanguage(language)) {
      return highlight.highlight(code, { language }).value;
    }
    return code;
  }
}
```

**Multi-Stage Pipeline:**

```javascript
class OptimizedImagePipeline {
  constructor(options) {
    this.options = options;
  }

  create() {
    return new TransformStream({
      transform: async (file, controller) => {
        if (this.isImage(file)) {
          const variants = await this.createVariants(file);
          for (const variant of variants) {
            controller.enqueue(variant);
          }
        } else {
          controller.enqueue(file);
        }
      },
    });
  }

  async createVariants(file) {
    const sharp = await import("sharp");
    const image = sharp(file.contents);
    const metadata = await image.metadata();

    const variants = [];

    // Create different sizes
    for (const size of this.options.sizes) {
      const resized = await image.resize(size.width, size.height, { fit: "inside" }).toBuffer();

      variants.push(
        new GilbertFile({
          path: this.getVariantPath(file.path, size),
          contents: resized,
          data: { ...file.data, width: size.width, height: size.height },
        })
      );
    }

    // Create WebP versions
    if (this.options.webp) {
      const webpBuffer = await image.webp({ quality: 85 }).toBuffer();
      variants.push(
        new GilbertFile({
          path: file.path.replace(/\.(jpg|jpeg|png)$/i, ".webp"),
          contents: webpBuffer,
          data: file.data,
        })
      );
    }

    return variants;
  }
}
```

### Stream Composition Patterns

Advanced patterns for combining and orchestrating multiple streams.

**Parallel Processing:**

```javascript
class ParallelPipeline {
  constructor(pipelines) {
    this.pipelines = pipelines;
  }

  create() {
    return new TransformStream({
      transform: async (file, controller) => {
        // Process file through all pipelines in parallel
        const results = await Promise.all(this.pipelines.map((pipeline) => this.processFile(file, pipeline)));

        // Emit all results
        for (const result of results.flat()) {
          controller.enqueue(result);
        }
      },
    });
  }

  async processFile(file, pipeline) {
    return new Promise((resolve, reject) => {
      const results = [];

      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(file);
          controller.close();
        },
      });

      const writable = new WritableStream({
        write(chunk) {
          results.push(chunk);
        },
        close() {
          resolve(results);
        },
        abort(error) {
          reject(error);
        },
      });

      readable.pipeThrough(pipeline).pipeTo(writable);
    });
  }
}
```

**Conditional Processing:**

```javascript
class ConditionalPipeline extends TransformStream {
  constructor(condition, truePipeline, falsePipeline) {
    super({
      transform: async (file, controller) => {
        const shouldProcess = await condition(file);
        const pipeline = shouldProcess ? truePipeline : falsePipeline;

        if (pipeline) {
          const processed = await this.processThroughPipeline(file, pipeline);
          controller.enqueue(processed);
        } else {
          controller.enqueue(file);
        }
      },
    });
  }

  async processThroughPipeline(file, pipeline) {
    // Implementation similar to parallel processing
    // but for single pipeline
  }
}

// Usage
const conditionalProcessor = new ConditionalPipeline(
  (file) => file.data.draft !== true, // Condition: not a draft
  productionPipeline, // True: full processing
  draftPipeline // False: minimal processing
);
```

### Plugin Architecture

Develop reusable plugins for Gilbert pipelines.

**Plugin Interface:**

```javascript
class GilbertPlugin {
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
  }

  // Plugin lifecycle hooks
  beforeBuild(context) {
    // Pre-build setup
  }

  createTransform() {
    // Return TransformStream instance
    throw new Error("Plugin must implement createTransform()");
  }

  afterBuild(context, results) {
    // Post-build cleanup or reporting
  }
}

// Example plugin
class SitemapPlugin extends GilbertPlugin {
  constructor(options) {
    super("sitemap", options);
    this.urls = [];
  }

  createTransform() {
    return new TransformStream({
      transform: (file, controller) => {
        if (file.path.endsWith(".html")) {
          this.urls.push({
            url: this.getUrl(file.path),
            lastmod: new Date().toISOString(),
          });
        }
        controller.enqueue(file);
      },
      flush: (controller) => {
        // Generate sitemap after all files processed
        const sitemap = this.generateSitemap();
        controller.enqueue(
          new GilbertFile({
            path: "/sitemap.xml",
            contents: Buffer.from(sitemap),
          })
        );
      },
    });
  }

  generateSitemap() {
    const urls = this.urls.map((url) => `  <url><loc>${url.url}</loc><lastmod>${url.lastmod}</lastmod></url>`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  }
}
```

> **AI Note**: Advanced Gilbert development focuses on stream composition and plugin architecture:
>
> - Custom pipelines should always implement Web API TransformStream interface
> - Use async/await patterns for complex transformations
> - Implement proper error handling and resource cleanup
> - Design plugins to be composable and reusable across projects
> - Consider performance implications of parallel vs sequential processing

## Contributing

Guidelines for contributing to Gilbert development, including development setup, coding standards, and submission process.

### Development Setup

**Prerequisites:**

- Node.js 18+ or Bun 1.0+
- Git
- Text editor with JavaScript/TypeScript support

**Getting Started:**

```bash
# Clone the repository
git clone https://github.com/tforster/gilbert.git
cd gilbert

# Install dependencies
npm install

# Run tests
npm test

# Start development mode
npm run develop
```

**Project Structure:**

```shell
gilbert/
├── services/
│   ├── gilbert/          # Core engine
│   ├── gilbert-file/     # Virtual file objects
│   ├── gilbert-fs/       # Filesystem integration
│   ├── gilbert-github/   # GitHub integration
│   └── gilbert-cli/      # Command line interface
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── fixtures/        # Test data
├── docs/                # Documentation
└── examples/            # Usage examples
```

### Coding Standards

**JavaScript/TypeScript Style:**

- Use ES modules (`import`/`export`)
- Prefer `const` over `let`, avoid `var`
- Use async/await instead of Promise chains
- Include JSDoc comments for public APIs
- **Use English spellings** (e.g., `colour`, `optimise`, `initialise`) rather than American spellings in both code and comments

**ES6 Class Conventions:**

- Use ES6 classes with private fields (`#field`) and methods (`#method()`) to encapsulate complexity
- Export classes as default exports from files named after the class
- **File naming**: Use PascalCase for class files (e.g., `MyWonderClass.js`) - uppercase first letter indicates the file exports a constructor
- **Usage pattern**: `const myWonderClass = new MyWonderClass(options)`
- **Target environments**: Modern evergreen browsers, Node.js 18+, Cloudflare Workers, Deno, Bun

**Example:**

```javascript
/**
 * Creates a new Gilbert pipeline with the specified configuration.
 * @param {Object} config - Pipeline configuration
 * @param {string} config.src - Source directory path
 * @param {string} config.dest - Destination directory path
 * @param {DataSource} config.data - Data source for templates
 * @returns {Pipeline} Configured pipeline instance
 */
export function createPipeline(config) {
  // Implementation
}
```

**Testing Guidelines:**

- Write tests for all new features
- Maintain high test coverage (>90%)
- Use descriptive test names
- Include integration tests for complex features

**Git Workflow:**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Submitting Changes

**Pull Request Process:**

1. Update documentation for new features (using English spellings: colour, optimise, realise, etc.)
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request review from maintainers

**Commit Message Format:**

```text
type(scope): description

body (optional)

footer (optional)
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Example:**

```text
feat(gilbert-fs): add support for glob patterns in src()

Implements glob pattern matching for file selection in the
filesystem integration layer. Supports standard glob syntax
including wildcards and directory traversal.

Closes #123
```

## Glossary

**Data Source**: Object or configuration that provides template context data from files, APIs, or other sources.

**Gilbert File**: Virtual file object that flows through Gilbert pipelines, containing path, content, and metadata.

**Gilbert Pipeline**: Stream-based processing system that transforms source files into output files through specialized transformations.

**Pipeline**: Individual processing stage that handles specific file types (templates, scripts, stylesheets, static files).

**Stream Composition**: Pattern of connecting multiple TransformStreams to create complex processing workflows.

**Template Engine**: Software component that combines templates with data to generate final output (Handlebars, Mustache, etc.).

**Transform Stream**: Web API stream that modifies data as it flows through, implementing the TransformStream interface.

**Web API Streams**: Standard streaming interface (ReadableStream, WritableStream, TransformStream) for processing data flows.

_This guide covers Gilbert's comprehensive feature set and development patterns. For additional help, see the [examples directory](../examples/) or [open an issue](https://github.com/tforster/gilbert/issues) on GitHub._
