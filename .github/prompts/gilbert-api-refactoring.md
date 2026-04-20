# Gilbert API Refactoring: Streams-First Constructor + Data Middleware

## Objective

Refactor Gilbert's API to be more stream-native and add data middleware support while maintaining streaming performance for non-template pipelines.

## Current API (Before)

```javascript
const gilbert = new Gilbert({ debug: true });
await gilbert.compile({
  templates: templateStream,
  uris: dataStream,
  staticFiles: staticStream,
  scripts: ["./src/main.js"],
});
await gilbert.stream.pipeTo(output.write("./dist"));
```

## Target API (After)

```javascript
const gilbert = new Gilbert(
  {
    // Streams configuration (what to process)
    templates: templateAdapter.read("**/*.hbs"),
    data: {
      source: dataAdapter.read("**/*.json"),
      middleware: [myDataMiddleware], // Optional data transformation
    },
    static: staticAdapter.read("**/*"),
    scripts: ["./src/main.js"],
    stylesheets: ["./src/main.css"],
  },
  {
    // Processing configuration (how to process)
    debug: true,
    minify: true,
  }
);

// compile() returns ReadableStream directly
const stream = await gilbert.start();
await stream.pipeTo(output.write("./dist"));
```

## Technical Requirements

### 1. Constructor Signature Change

**Current:** `new Gilbert(config)`
**Target:** `new Gilbert(streams, config = {})`

- `streams` object contains pipeline source streams and middleware
- `config` object contains processing options (debug, minify, etc.)
- Maintain backward compatibility temporarily with deprecation warnings

### 2. Compile Method Returns Stream

**Current:** `await gilbert.compile(params); await gilbert.stream.pipeTo(...)`
**Target:** `await gilbert.start().pipeTo(...)`

- `compile()` should return `this.stream` directly
- Remove need for separate `gilbert.stream` access
- Start all pipeline processing when `compile()` is called

### 3. Data Middleware Implementation

**Architecture:**

```javascript
// Data middleware function signature
const middleware = (files) => {
  // files: Array<GilbertFile> - all data files in memory
  // return: Array<GilbertFile> - transformed files (can be 1:1, 1:many, many:1)
  return transformedFiles;
};

// Usage in streams config
data: {
  source: dataAdapter.read("**/*.json"),
  middleware: [middleware1, middleware2] // Applied in sequence
}
```

**Performance Requirements:**

- Middleware only affects template pipeline (data + templates)
- Static files, scripts, stylesheets stream immediately (no middleware impact)
- Templates and data processing can be parallelized where possible
- Accept performance trade-off: middleware requires collecting all data files before processing

### 4. Stream Configuration Schema

```javascript
{
  // Template pipeline (requires both templates and data)
  templates: ReadableStream<GilbertFile>, // .hbs files
  data: {
    source: ReadableStream<GilbertFile>, // .json files
    middleware?: Array<Function>          // Optional transformations
  },
  
  // Other pipelines (no middleware support initially)
  static: ReadableStream<GilbertFile>,    // Static assets
  scripts: Array<string>,                 // Entry points
  stylesheets: Array<string>              // Entry points
}
```

## Implementation Steps

### Phase 1: Constructor Refactoring

1. **Update Gilbert constructor**:
   - Accept `(streams, config)` parameters
   - Store streams configuration in private field
   - Move stream initialization logic as needed
   - Add backward compatibility layer

2. **Update compile method**:
   - Remove `params` parameter (use constructor streams instead)
   - Return `this.stream` directly
   - Start all pipeline processing based on constructor config

3. **Update pipeline initialization**:
   - Use `this.#streams` instead of compile `params`
   - Maintain parallel pipeline execution
   - Ensure static files stream immediately

### Phase 2: Data Middleware Implementation

1. **Create middleware processing logic**:

   ```javascript
   async #processDataMiddleware(dataStream, middlewareArray) {
     if (!middlewareArray?.length) return dataStream;
     
     // Collect all data files
     const files = [];
     const collector = new WritableStream({
       write(file) { files.push(file); }
     });
     await dataStream.pipeTo(collector);
     
     // Apply middleware in sequence
     let processedFiles = files;
     for (const middleware of middlewareArray) {
       processedFiles = await middleware(processedFiles);
     }
     
     // Convert back to stream
     return new ReadableStream({
       start(controller) {
         for (const file of processedFiles) {
           controller.enqueue(file);
         }
         controller.close();
       }
     });
   }
   ```

2. **Update template pipeline integration**:
   - Process data middleware before TemplatePipeline creation
   - Parallelize template loading with data collection
   - Maintain streaming performance for other pipelines

3. **Add JSDoc types for middleware**:
   ```javascript
   /**
    * @typedef {Function} DataMiddleware
    * @param {GilbertFile[]} files - Array of data files
    * @returns {GilbertFile[]} Transformed files array
    */
   ```

### Phase 3: Testing & Validation

1. **Update existing tests**:
   - Modify test files to use new API
   - Ensure all existing functionality works
   - Add performance regression tests

2. **Add middleware tests**:
   - Test basic middleware functionality
   - Test middleware chaining
   - Test performance characteristics
   - Test error handling

3. **Create migration examples**:
   - Document API migration path
   - Provide before/after examples
   - Update developer guide

## Backward Compatibility Strategy

### Temporary Support (v1.x)

```javascript
// Support both APIs temporarily
constructor(streamsOrConfig, config = {}) {
  if (this.#isLegacyCall(streamsOrConfig)) {
    // Legacy: new Gilbert(config)
    console.warn('Gilbert: Legacy constructor deprecated. Use new Gilbert(streams, config)');
    this.#config = streamsOrConfig;
    this.#streams = {};
  } else {
    // New: new Gilbert(streams, config)
    this.#streams = streamsOrConfig;
    this.#config = config;
  }
}

compile(params) {
  if (params) {
    // Legacy: gilbert.compile(params)
    console.warn('Gilbert: Legacy compile(params) deprecated. Use new constructor API');
    return this.#legacyCompile(params);
  } else {
    // New: gilbert.start()
    return this.#newCompile();
  }
}
```

### Migration Timeline

- **v1.0**: Implement new API with legacy support
- **v1.1**: Add deprecation warnings for legacy usage
- **v2.0**: Remove legacy API support

## Performance Expectations

### Without Middleware
```text
0ms:   Static files streaming ✅
0ms:   Scripts/stylesheets processing starts ✅
0ms:   Templates loading starts ✅
20ms:  First HTML file streams ✅
30ms:  Scripts/stylesheets streaming ✅
```

### With Middleware

```text
0ms:   Static files streaming ✅ (no impact)
0ms:   Scripts/stylesheets processing starts ✅ (no impact)
0ms:   Templates loading + data collection (parallel) ✅
50ms:  Data middleware processing complete
55ms:  First HTML file streams ✅ (delayed by middleware)
60ms:  Scripts/stylesheets streaming ✅ (no impact)
```

## Error Handling Requirements

1. **Middleware errors**: Should fail fast and provide clear error messages
2. **Stream errors**: Should be propagated correctly through pipeline
3. **Configuration errors**: Should validate streams configuration at constructor time
4. **Backward compatibility**: Legacy API errors should remain unchanged

## Documentation Updates Required

1. **API Reference**: Update all method signatures and examples
2. **Developer Guide**: Add middleware section with real-world examples
3. **Migration Guide**: Document transition from old to new API
4. **Performance Guide**: Document middleware performance implications

## Success Criteria

- [ ] New API works for all existing Gilbert functionality
- [ ] Data middleware system functional with real-world examples
- [ ] Static files, scripts, stylesheets maintain streaming performance
- [ ] All existing tests pass with updated API calls
- [ ] Performance regression tests show no degradation for non-middleware usage
- [ ] Documentation fully updated with new API patterns
- [ ] Backward compatibility layer functional with deprecation warnings

## Files to Modify

### Core Files
- `services/gilbert/lib/index.js` - Main Gilbert class
- `services/gilbert/lib/TemplatePipeline.js` - Template processing integration

### Test Files
- `services/gilbert/tests/*.test.js` - Update all test files
- Add new middleware test file

### Documentation
- `docs/developer-guide.md` - API documentation
- `docs/adr.md` - Architecture decision record
- `README.md` - Update examples

## Risk Mitigation

1. **Git tag current state**: Create `pre-api-refactor` tag before starting
2. **Feature branch**: Work in dedicated branch for easy rollback
3. **Incremental testing**: Test each phase before proceeding
4. **Performance monitoring**: Validate streaming performance at each step
5. **Backward compatibility**: Ensure legacy API continues working during transition

This refactoring will make Gilbert significantly more stream-native and developer-friendly while adding powerful data transformation capabilities through middleware.
