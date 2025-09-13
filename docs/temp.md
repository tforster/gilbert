# Temporary Documentation Consolidation

**Purpose**: Consolidate all documentation content for reorganization into developer-guide.md

---

## SOURCE: Root README.md

### Overview/About Content

- Gilbert is a data-driven tool for highly performant production of websites and web applications
- Differs from typical static site generators:
  - **Data-driven**: Processes streams of data rather than filesystem tree of markdown files
  - **Streams based**: Uses readable, writeable and transformation streams for high speed processing with minimal memory
  - **Decoupled architecture**: Core as reusable NPM module accepting/returning streams
  - **Lean and Lightweight**: Only 6 dependencies, small footprint
  - **Uses Handlebars Templates**: Fast, familiar, generates multiple file types

### Performance Claims

- 200+ page site generation in under a second
- Serverless web publishing in about a second
- Uses Web Streams for portability across runtimes

### Usage Instructions

- Installation: `npm install @tforster/webproducer --save-dev`
- Basic operation: `npx webproducer [options]`
- CLI options (extensive list including paths, CSS options, pipeline disabling, etc.)

### Directory Structure

```shell
. (your project root)
└── src
    ├── data
    ├── fonts
    ├── images
    ├── scripts
    ├── stylesheets
    └── theme
        ├── common
        └── templates
```

### Migration Guide (0.9.0 to 1.0.0)

- New `uris` property structure
- `modelName` changed to `webProducerKey`
- Support for path separators in webProducerKey

### Known Issues

- html-minifier vulnerability (low risk for build-time usage)

---

## SOURCE: docs/developer-guide.md

### Philosophical Context

- **Mind's DOM concept**: Templates must be easily visualizable without cognitive overhead
- **Performance-First**: 200+ pages/second target with minimal memory footprint
- Simple token replacement vs complex template logic

### Core Architecture Details

- **Streams-Based Processing**: Node.js streams migrating to Web Streams for WinterCG compatibility
- **Pipeline Architecture**: Specialized pipelines for templates, scripts, stylesheets, static files
- **Virtual File System**: GilbertFile objects (custom Vinyl implementation) instead of filesystem operations

### Pipeline Responsibilities

- `TemplatePipeline`: Handlebars + data merging, HTML minification (requires full template pre-loading)
- `ScriptsPipeline`: esbuild bundling, ES module processing
- `StylesheetsPipeline`: PostCSS, autoprefixing, minification
- `StaticFilesPipeline`: Asset copying with mime type detection

### Development Workflows

- Local development commands and patterns
- Code style & formatting (ESLint, Prettier, specific style rules)
- Testing patterns using Node.js built-in test runner
- Debugging streams utilities and patterns

### Migration Guide: Web Streams

- Detailed patterns for converting from Node.js streams to Web Streams
- Target deployment: Cloudflare Workers for CMS webhooks

### Architectural Evolution

- **Historical**: Filesystem-bound tool using vinyl-fs
- **Modern**: Runtime-agnostic engine with integration adapters
- **Engine vs Integration**: Pure Web API streams core with environment-specific adapters

### Build vs. Publish Architecture

- **Building (Full Pipeline)**: Development, asset changes, CI/CD - all pipelines
- **Publishing (Content-Only)**: CMS updates, serverless environments - subset of pipelines
- **Design Rationale**: Minimal JS/CSS sites don't need asset rebuilds for content changes

---

## SOURCE: services/gilbert-file/README.md

### Package Overview

- Virtual file object for Gilbert text file compiler
- Inspired by Vinyl but more lightweight, no external dependencies except mime
- Web API compatible, runtime-agnostic
- 30+ tests, TypeScript support via JSDoc

### Features

- Web API streams compatibility
- Virtual file objects for stream processing
- Built-in path utilities
- MIME type detection
- Vinyl compatibility
- TypeScript support

### API Basics

```javascript
import GilbertFile from "@tforster/gilbert-file";

const file = new GilbertFile({
  path: "/path/to/file.txt",
  contents: new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
});
```

### Documentation Generation

- `npm run docs` to generate
- `npm run docs:watch` for watch mode
- Comprehensive API reference available

---

## SOURCE: services/gilbert-fs/README.md

### Package Overview

- Web API WritableStream for writing GilbertFile objects to local filesystem
- Part of Gilbert ecosystem for local development environments
- Implements standard WritableStream interface

### Features

- Web API Streams standard
- Automatic directory creation
- Multiple content type support (Uint8Array, ReadableStream, null)
- Path resolution handling
- Runtime agnostic (Node.js, Bun, Deno)

### Usage Patterns

```javascript
import GilbertFS from "@tforster/gilbert-fs";

// Static factory method
const dest = GilbertFS.dest("./dist");

// Write files via pipeTo
await fileStream.pipeTo(dest);
```

### Integration with Gilbert

- Shows how to use with main Gilbert compiler
- Pipeline configuration examples

### Environment Support

- ✅ Local: Node.js, Bun, Deno
- ❌ Serverless: Cloudflare Workers, Edge Functions (no filesystem)
- Suggests adapter packages for serverless

### Error Handling

- Comprehensive validation
- Directory creation
- Context logging
- Stream error handling

---

## SOURCE: AGENTS.md

### Agent Protocols

- Diary update protocol with datestamping
- Context awareness requirements
- Session summary guidelines
- Prompting standards following agents.md spec

### Gilbert Project Context Summary

- Streams-based, data-driven static site generator
- Web API streams core
- Integration adapters pattern
- GilbertFile object pipelines
- Project history in docs/diary.md

---

## SOURCE: .github/copilot-instructions.md

### Status

- DEPRECATED file pointing to AGENTS.md
- Contains diary update protocol (duplicated in AGENTS.md)
- Should be ignored for content purposes

---

## CONTENT ANALYSIS

### Duplications Identified

1. **Agent protocols**: Both AGENTS.md and .github/copilot-instructions.md
2. **Architecture overview**: README.md and developer-guide.md overlap
3. **Web Streams migration**: Mentioned in multiple places
4. **Pipeline descriptions**: Scattered across files
5. **Installation/usage**: Basic patterns repeated

### Missing/Scattered Content

1. **Complete API documentation**: Mentioned but not consolidated
2. **Integration patterns**: Scattered across service READMEs
3. **Testing strategies**: Only in developer-guide
4. **Deployment patterns**: Incomplete across files
5. **Troubleshooting**: Not systematically documented

### Content Quality Assessment

- **Strong**: Architecture explanations, philosophy, migration guidance
- **Weak**: API reference completeness, integration examples, troubleshooting
- **Inconsistent**: Terminology, depth of coverage across packages

---

## RECOMMENDATIONS FOR REORGANIZATION

### Proposed Document Structure

#### 1. Root README.md (Light)

- Brief project description
- Quick start/installation
- Link to developer guide
- Basic CLI usage

#### 2. Service README.md files (Light)

- Package-specific installation
- Basic usage example
- Link to developer guide for details
- Package-specific features only

#### 3. docs/developer-guide.md (Comprehensive)

- Complete technical documentation
- All architecture details
- All API references
- Integration patterns
- Testing strategies
- Troubleshooting guide

#### 4. Specialized docs/

- docs/migration-guide.md (Web Streams migration)
- docs/deployment-guide.md (Environment-specific patterns)
- docs/api-reference.md (Complete API docs) OR integrate into developer-guide

### Content Organization Strategy

1. **Consolidate duplicated architecture content** into single authoritative section
2. **Create progressive disclosure**: Overview → Details → Reference
3. **Standardize terminology** across all documents
4. **Add missing integration examples** and troubleshooting content
5. **Maintain consistency** between package READMEs and main documentation

Does this analysis capture the current state accurately? Should we proceed with creating this document structure?
