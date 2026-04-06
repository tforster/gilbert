# ADR-001: Migration from Node.js Streams to Web API Streams <!-- omit in toc -->

**Status:** Accepted (implementation complete as of September 2025)
**Date:** 2025-08-10
**Deciders:** Development Team

This document records the decision to migrate Gilbert from Node.js streams to Web API streams and explains the reasoning behind it.

## Table of Contents <!-- omit in toc -->

- [1. Background](#1-background)
- [2. Decision](#2-decision)
- [3. Core Rationale](#3-core-rationale)
  - [3.1 Why Migration Was Simpler Than Expected](#31-why-migration-was-simpler-than-expected)
  - [3.2 Web API Streams Advantages](#32-web-api-streams-advantages)
  - [3.3 Migration Patterns](#33-migration-patterns)
- [4. Alternatives Considered](#4-alternatives-considered)
- [5. Consequences](#5-consequences)
- [6. Related Decisions](#6-related-decisions)
- [7. References](#7-references)

## 1. Background

Gilbert was originally built on Node.js streams for processing content pipelines. The project predated the widespread availability of Web API streams. To enable deployment in modern edge computing environments — Cloudflare Workers, Deno, and Bun — a migration from Node.js streams to Web API streams was required.

**The goal**: enable the same Gilbert codebase to run in local development (Node.js), serverless (Cloudflare Workers), and emerging runtimes without code changes.

## 2. Decision

**Accepted**: migrate Gilbert from Node.js streams to Web API streams to achieve runtime portability while maintaining current functionality.

## 3. Core Rationale

### 3.1 Why Migration Was Simpler Than Expected

The initial complexity assessment was significantly reduced by two key architectural advantages already present in the codebase:

1. **GilbertFile was already runtime-agnostic** — the custom virtual file abstraction had no Node.js-specific dependencies. "Object mode" in streams is just passing JavaScript objects; GilbertFile works identically through Web API streams.

2. **All core dependencies were already runtime-agnostic** — esbuild, Handlebars, PostCSS, and html-minifier all use promise-based APIs with no streams dependency. Only `vinyl-fs` in the CLI used Node.js streams, and that was already isolated in the integration layer.

**Revised complexity assessment:**

| Area                                           | Assessment                                      |
| :--------------------------------------------- | :---------------------------------------------- |
| File objects (GilbertFile)                     | ✅ Already runtime-agnostic                     |
| Core processing (esbuild, PostCSS, Handlebars) | ✅ Promise-based APIs, no change needed         |
| "Object mode" streaming                        | ✅ Just JavaScript objects                      |
| Unused `minimatch` dependency                  | Removable during migration                      |
| Stream coordination utilities                  | Medium — replace event-based with promise-based |
| CLI filesystem integration                     | Isolated — adapter layer only                   |

### 3.2 Web API Streams Advantages

- Native support in Cloudflare Workers, Deno, and Bun
- Standardised across modern runtimes (WinterCG)
- Better memory management for large files
- Promise-based APIs align with modern async patterns
- Built-in backpressure handling

### 3.3 Migration Patterns

**ReadableStream:**

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
    controller.enqueue(gilbertFileObject);
    controller.close();
  },
});
```

**TransformStream:**

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

**Stream coordination:**

```javascript
// Before: Event-based (Utils.streamsFinish)
await Utils.streamsFinish([stream1, stream2]);

// After: Promise-based
await Promise.all([stream1.pipeTo(sink1), stream2.pipeTo(sink2)]);
```

## 4. Alternatives Considered

| Option                            | Decision          | Reason                                                                         |
| :-------------------------------- | :---------------- | :----------------------------------------------------------------------------- |
| Dual API (Node.js + Web API)      | Rejected          | Maintenance overhead outweighs benefits given favourable existing architecture |
| Runtime detection (auto-select)   | Rejected          | Adds complexity; clean migration is preferable                                 |
| External adapter library          | Partially adopted | Used only for CLI Node.js compatibility layer                                  |
| Status quo (keep Node.js streams) | Rejected          | Prevents deployment to modern edge computing platforms                         |

## 5. Consequences

**Positive:**

- Enables deployment to Cloudflare Workers and edge computing platforms
- Future-proofs the codebase with standardised APIs
- Aligns with WinterCG standards for maximum compatibility
- Maintains current functionality with no breaking changes to the core engine
- No dependency changes needed for core processing logic (esbuild, PostCSS, Handlebars)

**Negative:**

- API changes for any direct stream consumers upgrading from legacy versions
- CLI requires an adapter layer for Node.js filesystem compatibility
- Learning curve for developers unfamiliar with Web Streams API

**Neutral:**

- CLI maintains full functionality via adapter
- Documentation updates required but scope is manageable
- Testing strategy now covers multiple runtimes

## 6. Related Decisions

- ADR-002: CLI Compatibility Strategy _(planned)_
- ADR-003: Testing Strategy for Multi-Runtime Support _(planned)_

## 7. References

- [Web Streams API Specification](https://streams.spec.whatwg.org/)
- [WinterCG Runtime Keys](https://runtime-keys.proposal.wintercg.org/)
- [Cloudflare Workers Streams Documentation](https://developers.cloudflare.com/workers/runtime-apis/streams/)
- [Node.js Web Streams Documentation](https://nodejs.org/api/webstreams.html)

[← Back to Explanation](./../README.md)
