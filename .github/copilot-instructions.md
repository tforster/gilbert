# Gilbert Instructions

Codebase-specific guidance for AI agents working on the Gilbert monorepo. These rules supplement the
general code style defined in `code-style.instructions.md`.

## 1. Architecture Fundamentals

Gilbert's core contract: **GilbertFile objects flow through Web API streams**.

- All adapter `read()` methods return `ReadableStream<GilbertFile>`
- All adapter `write()` methods accept `WritableStream<GilbertFile>`
- Pipelines have asymmetric patterns — do not assume they all expose the same interface:
  - `TemplatePipeline` — `constructor(options, dataStream, templatesStream)`, async `build()`, exposes `this.stream` (ReadableStream)
  - `ScriptsPipeline` / `StylesheetsPipeline` — `constructor(entryPoints, options)`, `async getReadableStream()` returns a ReadableStream directly
  - `StaticFilesPipeline` — `constructor()`, exposes `this.transformStream` (TransformStream)
- `TemplatePipeline` must load ALL templates into memory during `build()` before data processing begins — any data URI can reference any template in any order
- Main Gilbert API entry point is `gilbert.compile()` which returns a `ReadableStream` directly

## 2. Engine vs Integration Boundary

Gilbert distinguishes strictly between **engine** (pure Web Streams) and **integration** (environment-specific adapters).

- Engine code in `services/gilbert/` must use **only** Web API streams (ReadableStream, TransformStream, WritableStream)
- Never use Node.js-specific APIs (`fs`, `path`, `Buffer`) inside the core engine
- Integration adapters (`gilbert-fs`, `gilbert-github`, `gilbert-r2`) handle environment-specific I/O
- Never mix filesystem operations with core engine logic

## 3. GilbertFile Conventions

GilbertFile objects are the core data structure flowing through all Gilbert streams.

- Always use `new GilbertFile(options)` constructor — do not use object literals
- Set `options.cwd = "/"` for consistent virtual filesystem behaviour
- Contents can be `Buffer`, `Uint8Array`, or `ReadableStream` — choose based on context
- Use the `clone()` method for transformations inside pipeline handlers:
  ```javascript
  controller.enqueue(file.clone({ path: newPath, contents: newContents }));
  ```
- Content-type is **always** derived from the current `path` extension — it is never preserved across path renames
- Path properties follow standard conventions: absolute `path`, `base` directory, computed `relative` (read-only)

## 4. Templates: Minimal Handlebars Logic

Templates must use **minimal Handlebars logic only**: `{{variable}}`, `{{#if}}`, `{{#each}}`.

- Never add complex helpers, nested partials, or computed logic inside templates
- If template logic becomes complex, move it to data transformation middleware upstream
- This constraint ensures consistent performance and maintainable, easily readable templates

## 5. Performance Benchmark

The project targets **sub-200ms builds** for complex projects (validated at 189ms for 27 files across all 4 concurrent pipelines).

- Always benchmark changes against this target — use `console.time()` around pipeline operations
- Profile memory with `process.memoryUsage()` for changes that touch data loading
- Reject changes that significantly impact performance without corresponding functionality gains

## 6. Data Middleware

Data middleware trades performance for cross-file operations.

- Only `TemplatePipeline` uses middleware — all other pipelines stream without buffering
- Middleware collects all data files into memory before template rendering begins
- Use middleware only for features that genuinely require knowledge of the full dataset (pagination, global nav, tag systems)

## 7. Build vs Publish Modes

Gilbert supports selective pipeline execution to optimise for different deployment scenarios.

**Full build** (local development, CI/CD with filesystem access):

```javascript
const gilbert = new Gilbert({
  templates: templatesAdapter.read("**/*.hbs"),
  data: { source: dataAdapter.read("**/*.json") },
  scripts: ["./src/main.js"],
  stylesheets: ["./src/main.css"],
  staticFiles: staticAdapter.read("**/*"),
});
```

**Publishing mode** (serverless / edge — content changes only):

```javascript
const gilbert = new Gilbert({
  templates: templatesAdapter.read("**/*.hbs"),
  data: { source: dataAdapter.read("**/*.json") },
  staticFiles: staticAdapter.read("content-assets/**/*"),
  // scripts and stylesheets omitted — assets pre-built
});
```

Rationale: `ScriptsPipeline` and `StylesheetsPipeline` require filesystem access (esbuild reads `node_modules`), making them incompatible with serverless environments.

## 8. Package-Specific Guidance

### gilbert (core engine)

- Avoid Node.js-specific APIs — maintain runtime portability across Node.js, Bun, Deno, and Cloudflare Workers
- Pipeline coordination happens through stream merging and composition in `WebStreamUtils`

### gilbert-file

- `clone()` is the correct pattern for pipeline transformations — do not construct new `GilbertFile` objects from scratch when transforming an existing file unless path or cwd must change

### gilbert-fs

- Constructor pattern: `new GilbertFS({ base: "./src" })`
- `adapter.read(globPattern)` returns `ReadableStream<GilbertFile>`
- `adapter.write(destination)` returns `WritableStream<GilbertFile>`
- Output path is computed from `file.relative` — the `base` option on the constructor controls this

### gilbert-github

- Returns Web API streams compatible with the Gilbert engine
- Handles GitHub API authentication and rate limiting internally
- Primary use case: webhook-triggered publishing from a GitHub-backed CMS
- Transforms GitHub API file structure into `GilbertFile` objects

### gilbert-cli

> [!WARNING]
> The CLI (`gilbert-cli`) is currently stale and non-functional. Focus development on the core engine and programmatic API. The CLI is a convenience wrapper over `gilbert` + `gilbert-fs` and should not be used as a reference for current patterns.

## 9. Pipeline-Specific Constraints

### ScriptsPipeline

- esbuild does **not** support streaming input — entry points must be filesystem paths
- Always set `write: false` in esbuild options to receive output as buffers (not written to disk)
- Output `GilbertFile` objects are created with `cwd: "/"` virtual root convention
- Source maps are emitted as separate `GilbertFile` objects in the stream

### StylesheetsPipeline

- esbuild resolves `@import` and bundles all CSS before optional PostCSS autoprefixing
- The `autoprefixCss: true` option is a **custom Gilbert extension** to esbuild options — not a native esbuild flag
- Source maps are emitted as separate `GilbertFile` objects

### TemplatePipeline

- Output paths are computed from the URI key in each data record (e.g., `/about` → `about.html`)
- Partials are registered via `handlebars.partials = this.#templates` — all templates act as potential partials
- Error handling must preserve source location information for debugging

## 10. Custom Pipeline Development

Custom pipelines must implement the Web API `TransformStream` interface.

- Use `async`/`await` inside `transform()` handlers for asynchronous operations
- Implement proper error handling — unhandled rejections inside a `TransformStream` will silently stall the stream
- Call `controller.enqueue()` for every output file; use `controller.error()` to propagate failures
- Design pipelines to be composable: accept configuration in the constructor, expose no side-effects between files

## 11. Programmatic API Usage

- Prefer the streaming API over CLI subprocess calls for all programmatic usage
- Content sources are not limited to the filesystem — provide any `ReadableStream<GilbertFile>` as input
- Sources include: `gilbert-fs` (local disk), `gilbert-github` (GitHub API), custom adapters (CMS APIs, databases)

## 12. Local Development Patterns

- Enable source maps for all pipelines whilst debugging (`sourcemap: true` in esbuild options)
- Disable minification for faster local builds: `{ minify: false }` in esbuild options
- Use `GILBERT_DEBUG=true` to enable verbose pipeline logging and to cache CMS API responses

## 13. CMS Integration Patterns

- CMS APIs return structured data that must be transformed into the `uris` format Gilbert expects
- Use Web API `fetch` for all CMS HTTP requests to maintain compatibility across Node.js and Cloudflare Workers
- Implement incremental builds by comparing content timestamps when working with large datasets
- Cache CMS responses locally during development to reduce API calls and rate-limit exposure

## 14. Deployment Strategy

- **Static hosting** — for sites where content changes infrequently (GitHub Pages, S3, Netlify)
- **Serverless functions** — for on-demand generation triggered by CMS webhooks (Cloudflare Workers, Lambda)
- **Container deployment** — for high-volume or complex processing with sustained load
- Never hardcode credentials — always use environment variables or secrets management
