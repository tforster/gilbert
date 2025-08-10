# Architectural Decision Records

## ADR-001: Migration from Node.js Streams to Web API Streams

**Status:** Proposed  
**Date:** 2025-08-10  
**Deciders:** Development Team  
**Technical Story:** Enable Gilbert to run in Cloudflare Workers and other WinterCG-compatible runtimes

### Context

Gilbert is a static site generator built on Node.js streams for processing content pipelines. The project was created before Web API streams became widely available. To enable deployment in modern edge computing environments like Cloudflare Workers, Deno, and Bun, we need to evaluate migrating from Node.js streams to Web API streams.

### Decision

**PROPOSED:** Migrate Gilbert from Node.js streams to Web API streams to achieve runtime portability while maintaining current functionality.

### Rationale

#### Current Stream Usage Analysis

**Core Components Using Node.js Streams:**

1. **Main Gilbert Engine (`services/gilbert/lib/index.js`)**

   - Uses `Transform` stream as `mergeStream` to aggregate all pipeline outputs
   - Pipes multiple pipeline streams into the merge stream
   - Pattern: `pipeline.stream.pipe(this.mergeStream, { end: false })`

2. **Template Pipeline (`services/gilbert/lib/TemplatePipeline.js`)**

   - Creates `Readable` stream with `objectMode: true`
   - Uses `Writable` streams to consume data and theme inputs
   - Processes Handlebars templates and JSON data
   - Complex stream coordination with `Utils.streamsFinish()`

3. **Scripts Pipeline (`services/gilbert/lib/ScriptsPipeline.js`)**

   - Creates `Readable` stream for esbuild output
   - Processes JavaScript files through esbuild bundler
   - Pushes generated files to stream manually

4. **Stylesheets Pipeline (`services/gilbert/lib/StylesheetsPipeline.js`)**

   - Similar pattern to Scripts Pipeline
   - Uses `Readable` stream with esbuild processing
   - Handles PostCSS/Autoprefixer transformations

5. **Static Files Pipeline (`services/gilbert/lib/StaticFilesPipeline.js`)**

   - Uses `Transform` stream for pass-through processing
   - Modifies GilbertFile paths during transformation

6. **Stream Utilities (`services/gilbert/lib/StreamUtils.js`)**

   - Heavy use of `Transform` and `Writable` streams
   - File synchronization and filtering logic
   - Uses CommonJS (`require`) syntax

7. **Data Source (`services/gilbert/lib/DataSource.js`)**

   - Uses `Writable` streams to process data files
   - Handles JSON, GraphQL, and SQL file parsing
   - Also uses CommonJS syntax

8. **CLI Integration (`services/gilbert-cli/scripts/cli/index.js`)**
   - Uses `vinyl-fs` for file system streams
   - Pipes data through custom transform modules
   - Final output via `webproducer.mergeStream.pipe(dest)`

#### Critical Architecture Insight: GilbertFile

**✅ KEY ADVANTAGE: Gilbert already uses runtime-agnostic file objects!**

Gilbert uses `gilbert-file` (GilbertFile) as a **custom Vinyl replacement** that is **already runtime-agnostic**. This dramatically reduces migration complexity:

- **File abstraction layer exists**: GilbertFile handles path, contents, metadata
- **No Vinyl dependency**: Custom implementation avoids Node.js-specific code
- **Stream contents supported**: Can handle Buffer, Stream, or null contents
- **"Object mode" is just JavaScript objects**: No Node.js-specific stream features needed

#### Dependency Analysis

**✅ ALL Core Dependencies Are Runtime-Agnostic:**

- **`autoprefixer`**: CSS processing, promise-based API
- **`esbuild`**: Programmatic build tool, no streams dependency
- **`handlebars`**: String-based template compilation
- **`html-minifier`**: String-to-string transformation
- **`mime`**: Pure utility functions for MIME type detection
- **`postcss`**: Promise-based CSS processing pipeline
- **`gilbert-file`**: Custom runtime-agnostic file abstraction
- **`minimatch`**: Unused legacy dependency (can be removed)

**⚠️ CLI-Only Dependencies:**

- **`vinyl-fs`**: Node.js filesystem streams (CLI adapter needed)
- **`commander`**: CLI argument parsing (runtime-agnostic)

#### Revised Migration Complexity Assessment

**Low Complexity Areas (Easier than Expected):**

- ✅ **File Objects**: GilbertFile is already runtime-agnostic
- ✅ **Core Processing**: All build tools use promise-based APIs
- ✅ **Object Mode**: Just passing JavaScript objects through streams
- ✅ **Dependencies**: No streams-based dependencies in core

**Medium Complexity Areas:**

- **Stream Coordination**: Replace `Utils.streamsFinish()` with promise-based coordination
- **Pipeline Interfaces**: Update stream constructors and event patterns
- **Error Handling**: Convert event-based error handling to promise patterns

**Isolated High Complexity:**

- **CLI Compatibility**: Create adapter layer for `vinyl-fs` integration

#### Web API Streams Compatibility

**Advantages:**

- ✅ Native support in Cloudflare Workers, Deno, Bun
- ✅ Standardized across modern runtimes
- ✅ Better memory management for large files
- ✅ Promise-based APIs align with modern async patterns
- ✅ Built-in backpressure handling

**Challenges:**

- ❌ No direct equivalent to `objectMode: true`
- ❌ Different event model (no `pipe`, `unpipe` events)
- ❌ Transform patterns require different implementation
- ❌ Limited ecosystem compared to Node.js streams

#### Technical Feasibility

**✅ HIGH VIABILITY - Significantly simpler than initially assessed**

**Favorable Architecture Factors:**

1. **Runtime-Agnostic File Abstraction**: GilbertFile eliminates the major complexity
2. **No Streams Dependencies**: All processing tools use promise-based APIs
3. **Clean Separation**: Stream layer is just transport, not data processing
4. **Modern Codebase**: Already uses ES modules and modern patterns

**Viable Migration Approaches:**

1. **Direct Stream Constructor Replacement:**

   ```javascript
   // Before: Node.js Readable
   this.stream = new Readable({
     objectMode: true,
     read() {
       this.push(null);
     },
   });

   // After: Web ReadableStream
   this.stream = new ReadableStream({
     start(controller) {
       // GilbertFile objects work exactly the same!
       // controller.enqueue(gilbertFileObject);
       controller.close();
     },
   });
   ```

2. **Transform Stream Migration:**

   ```javascript
   // Before: Node.js Transform
   new Transform({
     objectMode: true,
     transform(chunk, encoding, callback) {
       callback(null, processedChunk);
     },
   });

   // After: Web TransformStream
   new TransformStream({
     transform(chunk, controller) {
       controller.enqueue(processedChunk);
     },
   });
   ```

3. **Stream Coordination Replacement:**

   ```javascript
   // Before: Event-based coordination
   await Utils.streamsFinish([stream1, stream2]);

   // After: Promise-based coordination
   await Promise.all([streamToPromise(stream1), streamToPromise(stream2)]);
   ```

4. **CLI Compatibility Layer:**
   - Create utility to convert between Web API and Node.js streams
   - Maintain `vinyl-fs` compatibility for filesystem operations
   - Enable seamless CLI operation in Node.js environment

### Implementation Strategy

**Phase 1: Foundation (1-2 weeks)**

- Create Web API stream utilities and helpers
- Implement stream coordination utilities (replace `Utils.streamsFinish()`)
- Build Node.js ↔ Web API stream adapters for CLI
- Update CommonJS modules to ES modules

**Phase 2: Core Pipeline Migration (2-3 weeks)**

- Migrate `StaticFilesPipeline` (simplest - Transform → TransformStream)
- Update `ScriptsPipeline` and `StylesheetsPipeline` (Readable → ReadableStream)
- Migrate `TemplatePipeline` (most complex stream coordination)
- Update main Gilbert engine merge stream logic
- Migrate `StreamUtils` and `DataSource`

**Phase 3: Integration & Testing (1 week)**

- CLI adapter integration and testing
- Comprehensive test suite for both Node.js and target runtimes
- Performance validation and optimization
- Documentation and example updates

**Total Estimated Timeline: 4-6 weeks** (significantly reduced from initial assessment)

### Risks and Mitigation

**Risks:**

1. **Breaking Changes:** Existing consumers may need updates
2. **Performance Impact:** Web API streams may have different characteristics
3. **Feature Gaps:** Some Node.js stream features have no Web API equivalent
4. **Ecosystem Compatibility:** Third-party stream-based tools may not work

**Mitigation:**

1. **Versioning:** Use major version bump with clear migration path
2. **Adapter Layer:** Provide compatibility utilities for transition period
3. **Feature Parity:** Document and implement alternatives for missing features
4. **Testing:** Comprehensive test suite covering both runtime environments

### Consequences

**Positive:**

- ✅ Enables deployment to Cloudflare Workers and edge computing platforms
- ✅ Future-proofs codebase with standardized APIs
- ✅ Maintains current functionality with minimal breaking changes
- ✅ Leverages existing runtime-agnostic architecture (GilbertFile)
- ✅ Significantly simpler migration than initially expected
- ✅ No dependency changes needed for core processing logic
- ✅ Aligns with WinterCG standards for maximum compatibility

**Negative:**

- ❌ Moderate development effort required (4-6 weeks)
- ❌ Some API changes for direct stream consumers
- ❌ CLI requires adapter layer for Node.js compatibility
- ❌ Learning curve for developers unfamiliar with Web Streams

**Neutral:**

- 📋 CLI maintains full backward compatibility via adapter
- 📋 Documentation updates needed but scope is manageable
- 📋 Testing strategy needs to cover multiple runtimes
- 📋 Can remove unused dependencies (`minimatch`) during migration

### Alternatives Considered

1. **Dual API Support:** Maintain both Node.js and Web API streams

   - **Rejected:** Maintenance overhead outweighs benefits given existing favorable architecture

2. **Runtime Detection:** Auto-select stream implementation based on environment

   - **Rejected:** Adds complexity; clean migration path is preferable

3. **External Adapter Library:** Use existing libraries to bridge streams

   - **Partially Adopted:** Will use for CLI Node.js compatibility

4. **Status Quo:** Keep Node.js streams only
   - **Rejected:** Prevents deployment to modern edge computing platforms

### Related Decisions

- ADR-002: CLI Compatibility Strategy (Future)
- ADR-003: Testing Strategy for Multi-Runtime Support (Future)

### References

- [Web Streams API Specification](https://streams.spec.whatwg.org/)
- [WinterCG Runtime Keys](https://runtime-keys.proposal.wintercg.org/)
- [Cloudflare Workers Streams Documentation](https://developers.cloudflare.com/workers/runtime-apis/streams/)
- [Node.js Stream to Web Streams](https://nodejs.org/api/webstreams.html)

---

_Last Updated: 2025-08-10_
