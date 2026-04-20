# How to Debug and Optimise <!-- omit in toc -->

This guide covers diagnosing build issues, inspecting stream flows, resolving common errors, and improving build performance.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Enabling Debug Logging](#2-enabling-debug-logging)
- [3. Debugging Stream Flows](#3-debugging-stream-flows)
  - [3.1 Debug Transform](#31-debug-transform)
  - [3.2 Pipeline Tracer](#32-pipeline-tracer)
  - [3.3 Data Context Inspection](#33-data-context-inspection)
- [4. Common Build Issues](#4-common-build-issues)
- [5. Performance Optimisation](#5-performance-optimisation)
  - [5.1 Monitoring Build Time](#51-monitoring-build-time)
  - [5.2 Memory Optimisation](#52-memory-optimisation)
  - [5.3 Selective Pipeline Execution](#53-selective-pipeline-execution)
- [6. Error Recovery](#6-error-recovery)

## 1. Prerequisites

- `GILBERT_DEBUG=true` available as an environment variable
- Familiarity with Web API streams and GilbertFile objects (see [Architecture](../explanation/architecture.md))

## 2. Enabling Debug Logging

Gilbert uses the `gilbert-logger` package, which is controlled by the `debug` flag and the `GILBERT_DEBUG` environment variable:

```javascript
// Enable programmatically
const gilbert = new Gilbert(streams, { debug: true });
```

```bash
# Enable via environment variable
GILBERT_DEBUG=true node build.js
```

Debug logging is async (non-blocking) and compatible across all target runtimes.

## 3. Debugging Stream Flows

### 3.1 Debug Transform

Insert a debug transform at any point in the stream to log file information:

```javascript
const debugTransform = new TransformStream({
  transform(file, controller) {
    console.log(`Processing: ${file.path}`);
    console.log(`Content-Type: ${file.contentType}`);
    console.log(`Size: ${file.contents?.length ?? 0} bytes`);

    controller.enqueue(file);
  },
});

// Insert between source and destination
const sourceStream = adapter.read("**/*");
await sourceStream.pipeThrough(debugTransform).pipeTo(outputAdapter.write("./dist"));
```

### 3.2 Pipeline Tracer

Trace a file as it moves through multiple pipeline stages:

```javascript
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

        console.log(`${stage}: ${file.path}`);
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

### 3.3 Data Context Inspection

Verify template context data before rendering:

```javascript
const debugTransform = new TransformStream({
  transform(file, controller) {
    if (file.extname === ".hbs") {
      console.log(`Template: ${file.path}`);
      console.log(`Data keys: ${Object.keys(file.data || {})}`);
      console.log(`Sample:`, JSON.stringify(file.data, null, 2).slice(0, 200));
    }
    controller.enqueue(file);
  },
});
```

## 4. Common Build Issues

**`ReadableStream is locked by another reader`**

Streams cannot be reused. Create new adapter instances for each build call:

```javascript
// Bad — reusing stream objects
const stream = adapter.read("**/*");
await gilbert1.start();
await gilbert2.start(); // Will fail — stream already consumed

// Good — fresh adapter instances per build
const gilbert = new Gilbert({
  templates: new GilbertFS({ base: "./src/templates" }).read("**/*.hbs"),
  data: { source: new GilbertFS({ base: "./src/data" }).read("**/*.json") },
});
```

**`ERR_INVALID_STATE: Controller is already closed`**

This race condition occurs when a fast-completing pipeline closes the merge stream before slower pipelines finish. Fix: ensure all pipelines resolve before closing (already handled in the Gilbert core engine as of January 2025).

**`Error: Pipeline failed with unhandled promise rejection`**

```javascript
try {
  const stream = await gilbert.start();
  await stream.pipeTo(outputAdapter.write("./dist"));
} catch (error) {
  if (error.file) {
    console.error(`Error in file: ${error.file.path}`);
    console.error(`Line: ${error.line}, Column: ${error.column}`);
  }
  console.error(error.stack);
}
```

**Empty output / missing pages**

- Check that `data.json` has a `uris` property
- Verify each URI entry has a `webProducerKey` matching a template filename in your theme directory
- Enable `debug: true` and look for "Processing template: …" log entries

**Memory usage issues for large sites**

See [Memory Optimisation](#52-memory-optimisation) below.

## 5. Performance Optimisation

### 5.1 Monitoring Build Time

```javascript
const start = performance.now();
await gilbert.start().pipeTo(outputAdapter.write("./dist"));
const duration = performance.now() - start;
console.log(`Build completed in ${duration.toFixed(2)}ms`);
```

Target: under 200ms for complex projects (27+ files across all four pipelines). The established benchmark is 185ms for 29 files with authentic website content.

### 5.2 Memory Optimisation

```javascript
// Limit concurrent file processing
const gilbert = new Gilbert(
  {
    templates: templatesAdapter.read("**/*.hbs"),
    data: { source: dataAdapter.read("**/*.json") },
  },
  {
    debug: false, // Disable debug logging in production
  }
);
```

For very large sites, consider batch processing by splitting the data stream and running multiple Gilbert instances sequentially.

### 5.3 Selective Pipeline Execution

The fastest optimisation is to disable pipelines you do not need for a given build:

```javascript
// Content-only update — skip scripts and stylesheets
const gilbert = new Gilbert({
  templates: templatesAdapter.read("**/*.hbs"),
  data: { source: dataAdapter.read("**/*.json") },
  // No scripts, stylesheets, or staticFiles
});
```

See [Build vs. Publish Modes](../explanation/architecture.md#6-build-vs-publish-modes) for a full discussion.

## 6. Error Recovery

**Graceful continuation** — log errors and continue rather than aborting the entire build:

```javascript
const resilientTransform = new TransformStream({
  transform(file, controller) {
    try {
      // Process file
      controller.enqueue(processedFile);
    } catch (error) {
      console.warn(`Failed to process ${file.path}: ${error.message}`);
      // Enqueue a placeholder or skip the file
    }
  },
});
```

**Retry logic** for transient failures (e.g., CMS API timeouts):

```javascript
async function buildWithRetry(buildFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await buildFn();
      return;
    } catch (error) {
      console.warn(`Build attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

[← Back to How-To Guides](./README.md)
