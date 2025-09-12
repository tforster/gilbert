# Copilot Instructions for Gilbert (WebProducer)

##2. **Runtime-Agnostic Engine**: Core engine uses only Web API streams (ReadableStream, TransformStream, WritableStream) 3. **Integration Layer Separation**: Environment-specific adapters handle filesystem or network I/O 4. **Selective Pipeline Execution**: Engine supports build vs. publish modes via pipeline configuration 5. **Streams-first**: **Migrating from Node.js streams to Web Streams** for WinterCG compatibility and runtime portability (Cloudflare Workers, Bun, Deno, etc.) 6. **Pipeline-based**: Separate pipelines for templates, scripts, stylesheets, and static files 7. **Virtual files**: Uses GilbertFile objects (custom Vinyl-like implementation) - already runtime-agnostic 8. **Data-driven**: Templates merge with pre-transformed JSON data (no data transformation within Gilbert) 9. **Performance-first**: Designed for 200+ pages/second generation with minimal memory footprintt Overview

Gilbert is a **streams-based, data-driven static site generator** that processes content through pipeline architectures. Unlike traditional file-based generators, Gilbert transforms data streams through specialized pipelines to generate HTML, CSS, and JavaScript with exceptional performance.

**CRITICAL CONTEXT**: Gilbert has evolved from a filesystem-bound tool to a **runtime-agnostic engine** designed for modern deployment environments including Cloudflare Workers. The engine distinguishes between **building** (full pipeline with filesystem) and **publishing** (content-only with Web Streams).

### Real-World Use Case: Stop The Party (STP)

Gilbert's architecture is being driven by StopTheParty.ca, which uses:

- **Pages CMS (pagescms.org)** - GitHub-based CMS for content management
- **GitHubBranchAsStream** - Custom Web Streams implementation for fetching content from GitHub
- **Cloudflare Workers** - Edge publishing environment for real-time content updates
- **Build vs. Publish distinction** - Heavy builds locally, fast content publishing on edge

### Build vs. Publish Architecture

**Building (Full Pipeline)**:

- **When**: Development, asset changes, CI/CD
- **Where**: Local filesystem or VMs with complete development environment
- **Pipelines**: ALL Gilbert pipelines (Templates, Scripts, Stylesheets, Static)
- **Requirements**: Full filesystem access for esbuild to read source + node_modules
- **Output**: Complete optimized static site

**Publishing (Content-Only Pipeline)**:

- **When**: Content changes, CMS updates, data-driven page updates
- **Where**: Serverless environments (Cloudflare Workers, edge functions)
- **Pipelines**: SUBSET - TemplatePipeline + selective StaticFilesPipeline only
- **Requirements**: Web API streams only, no filesystem dependencies
- **Output**: Updated HTML and content-related assets

**Design Rationale**: Sites use minimal client-side code, making asset rebuilds unnecessary for content changes. esbuild requires filesystem access, incompatible with serverless streams-only environments.

## Core Architecture

### Monorepo Structure (npm workspaces)

- **`services/gilbert`**: Main compiler engine with pipeline classes
- **`services/gilbert-file`**: Custom Vinyl-compatible file object (replaces vinyl dependency)
- **`services/gilbert-cli`**: Command-line interface using Commander.js. The CLI project is currently parked and not actively maintained.
- **`services/gilbert-github`**: GitHubBranchAsStream - Web Streams adapter for GitHub content
- **`services/gilbert-fs`**: Web API streams filesystem adapter using gilbert-file (for local builds). Similar to VinylFS but Web Streams-based. Supports both src and dest.

### Key Design Principles

1. **GilbertFile Objects in Web API Streams**: **FUNDAMENTAL ARCHITECTURE** - The entire Gilbert ecosystem operates on the principle that **GilbertFile objects flow through Web API streams**. All src() methods output `ReadableStream<GilbertFile>`, all pipelines accept and return `TransformStream<GilbertFile, GilbertFile>`, and all dest() methods accept `WritableStream<GilbertFile>`. This unified contract enables seamless composition and runtime portability.

2. **Runtime-Agnostic Engine**: Core engine uses only Web API streams (ReadableStream, TransformStream, WritableStream)
3. **Integration Layer Separation**: Environment-specific adapters handle filesystem or network I/O
4. **Selective Pipeline Execution**: Engine supports build vs. publish modes via pipeline configuration
5. **Streams-first**: **Migrating from Node.js streams to Web Streams** for WinterCG compatibility and runtime portability (Cloudflare Workers, Bun, Deno, etc.)
6. **Pipeline-based**: Separate pipelines for templates, scripts, stylesheets, and static files
7. **Virtual files**: Uses GilbertFile objects (custom Vinyl-like implementation) - already runtime-agnostic
8. **Data-driven**: Templates merge with pre-transformed JSON data (no data transformation within Gilbert)
9. **Performance-first**: Designed for 200+ pages/second generation with minimal memory footprint

### Architecture Evolution

**Historical**: Tightly coupled to local Node.js environment via vinyl-fs for inputs/outputs
**Current Migration**: Converting from Node.js streams to Web API streams throughout engine
**Target**: Pure Web Streams engine with environment-specific integration adapters

**Integration Pattern**:

```javascript
// Engine: Pure Web Streams (target architecture)
gilbert.compile({
  uris: { data: webDataStream, theme: webTemplateStream },
  files: { stream: webStaticStream }
});

// Integration: Environment adapters
const localAdapter = nodeStreamsToWebStreams(vfs.src(...));
const gitHubFiles = gilbertGithub({ ... }); // streams files from a Github repo and branch
const cloudflareAdapter = githubBranchAsStream.dataStream;
```

### Critical Components

#### Pipeline Classes (`services/gilbert/lib/`)

- `TemplatePipeline.js`: Handlebars template processing with data merging
- `ScriptsPipeline.js`: JavaScript bundling via esbuild
- `StylesheetsPipeline.js`: CSS processing with PostCSS/Autoprefixer
- `StaticFilesPipeline.js`: Static asset copying
- `Utils.js`: Core utilities including `vinyl()` factory for GilbertFile creation

#### GilbertFile Object (`services/gilbert-file/`)

- Custom implementation replacing Vinyl dependency
- Manages virtual file system with path resolution
- Handles content types, stat objects, and file history
- Use `Utils.vinyl(options)` factory method, not direct constructor

## Development Workflows

### Local Development Setup

```bash
# Install from monorepo root (uses npm workspaces implicit linking)
npm install
```

### Testing

- Uses Node.js built-in test runner (`node:test`)
- Run tests: `npm test` in individual packages
- Test files: `**/*.test.js` pattern

## Critical Patterns

### Data Structure Convention

JSON data uses `uris` property for page definitions where the object key (e.g. /index) is the final URI in the site and the object value is data that is replaced in the handlebars template indicated by the webProducerKey. **Data must arrive pre-transformed** - Gilbert does not perform data transformation.

```json
{
  "uris": {
    "/index": { "webProducerKey": "homepage", ... },
    "/about": { "webProducerKey": "page", ... }
  }
}
```

### Template Resolution

- `webProducerKey` maps to `.hbs` files in theme directory
- Supports path separators: `"admin/report/detail"` → `admin/report/detail.hbs`
- Templates use minimal Handlebars logic (if/then, loops only). Note that the choice to use if/then and loops only is to ensure extremely fast processing **and** allow developers to easily load the template into their "mind's DOM". Templates with complex embedded logic are inherintly difficult to visualise, develop and debug. This does imply that the data must be properly formated first and is a key differentiator between Gilbert and all other static site generators.

### Stream Processing Pattern

```javascript
// All pipelines follow this pattern
const pipeline = new TemplatePipeline(options, dataStream, themeStream);
await pipeline.prep(); // Load and parse dependencies
pipeline.build(); // Process and emit to stream
```

### File Object Creation

```javascript
// Always use Utils.vinyl() factory
import { vinyl } from "./Utils.js";
const file = vinyl({ path: "/index.html", contents: Buffer.from(html) });
```

## Dependencies & Integration

### Workspace Dependencies

- `gilbert` depends on `@tforster/gilbert-file` using standard npm dependency (not `workspace:` protocol)
- Uses implicit npm workspace linking for local development

### External Dependencies

- **esbuild**: JavaScript bundling and minification
- **handlebars**: Template processing
- **postcss/autoprefixer**: CSS processing
- **html-minifier**: HTML optimization
- **mime**: Content-type detection

### Known Issues

- `html-minifier` has known vulnerability (low risk for build-time usage)
- Project transitioning from Vinyl to custom GilbertFile implementation

## Common Tasks

### Performance Considerations

- **Maintain 200+ pages/second target**: Always consider performance impact when making changes
- **Memory efficiency**: Use streams to avoid loading entire datasets into memory
- **Virtual filesystem**: Keep `options.cwd` as "/" for consistent path resolution

### Web Streams Migration (WinterCG Compatibility)

**URGENT PRIORITY**: Converting Gilbert engine from Node.js streams to Web API streams

**Target runtimes**: Cloudflare Workers, Bun, Deno, Node.js
**Migration strategy**:

- Phase 1: Create Web API stream utilities and coordination helpers
- Phase 2: Convert TemplatePipeline (most critical for STP publishing)
- Phase 3: Convert remaining pipelines and main engine
- Phase 4: Remove Node.js stream dependencies

**Current Status**: Active migration in progress on `web-api-streams` branch

**Use case**: Enable webhook-triggered CMS publishing in Cloudflare Workers for StopTheParty.ca
**Real-world constraint**: Must integrate with existing GitHubBranchAsStream (already Web API streams)

**Development Approach**: Mock test harness + incremental pipeline migration

- Create mock STP publishing scenario for testing
- Convert pipelines one at a time starting with TemplatePipeline
- Test each converted pipeline against mock before proceeding

**Key Files for Migration**:

- `services/gilbert/lib/index.js` - Main engine merge stream logic
- `services/gilbert/lib/TemplatePipeline.js` - Template processing (highest priority)
- `services/gilbert/lib/StaticFilesPipeline.js` - Static file processing
- `services/gilbert/lib/Utils.js` - Stream coordination utilities
- `services/gilbert/lib/StreamUtils.js` - Stream utilities (may be deprecated)

### Adding New Pipeline

1. Extend base pipeline pattern in `services/gilbert/lib/`
2. Implement `prep()` and `build()` methods
3. Register in main Gilbert class (`index.js`)
4. **Use Web Streams** for new pipeline implementations

### Debugging Streams

- Use `Utils.streamLog()` for stream event debugging
- Check `options.cwd` is always "/" for virtual filesystem consistency
- Verify file paths are properly resolved via `path.resolve()`

### Publishing Packages

```bash
# Publish dependency first
cd services/gilbert-file && npm publish
cd ../gilbert && npm publish
cd ../gilbert-cli && npm publish
```

Always maintain version compatibility between workspace packages when publishing.

## Additional AI Prompts

**Primary Documentation**: The main `docs/developer-guide.md` serves both humans and AI agents with unified documentation patterns using AI-specific callouts.

**Specialized Prompts**: For task-specific guidance, check the `docs/.prompts/` folder:

- `architecture.md` - Deep dive into pipeline architecture and stream processing
- `performance.md` - Performance optimization patterns and benchmarking
- Task templates for common development scenarios

This project follows a docs-as-code philosophy where AI instructions evolve alongside engineering documentation to ensure they stay current with each commit.
