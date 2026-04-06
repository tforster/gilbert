# Gilbert R2 Adapter — RSP <!-- omit in toc -->

**Status:** In Progress
**Feature:** Cloudflare R2 storage adapter for Gilbert (`@tforster/gilbert-r2`)

This document captures the requirements, specification, and implementation plan for the Gilbert R2 adapter — a `WritableStream<GilbertFile>` implementation that writes generated site files to Cloudflare R2 object storage.

## Table of Contents <!-- omit in toc -->

- [Requirements](#requirements)
- [Specification](#specification)
- [Plan](#plan)

## Requirements

### 1. Feature Overview

The Gilbert R2 adapter enables Gilbert to write generated site assets directly to Cloudflare R2 object storage, supporting the serverless publishing workflow described in [Deploy to Cloudflare](../how-to/deploy-to-cloudflare.md).

- **Primary purpose**: provide a `WritableStream<GilbertFile>` adapter backed by R2, following the standard [adapter interface](./adapter-interface.md)
- **Target users**: developers deploying Gilbert-generated sites to Cloudflare Workers + R2
- **Problem solved**: eliminates the need for a filesystem intermediary step when publishing from a Cloudflare Worker

### 2. Functional Requirements

_To be completed._

### 3. Technical Requirements

- Must implement the [adapter interface](./adapter-interface.md) — specifically the `write(destination)` method returning `WritableStream<GilbertFile>`
- Must operate within the Cloudflare Workers runtime (Web API streams, no Node.js-specific APIs)
- Must use the R2 `put()` API to write objects with correct `Content-Type` headers derived from `GilbertFile.contentType`
- Should support optional prefix configuration on the constructor

### 4. Integration Requirements

_To be completed._

### 5. User Experience Requirements

_To be completed._

### 6. Constraints and Assumptions

- R2 bindings are provided via the Cloudflare Worker environment object (`env.BUCKET`)
- Content-type is always derived from `GilbertFile.contentType` (which in turn uses the file extension)
- No read capability required in the initial implementation

### 7. Success Criteria

- All existing `services/gilbert-r2/tests/` pass
- The [Deploy to Cloudflare](../how-to/deploy-to-cloudflare.md) example works end-to-end using this adapter

### 8. Future Considerations

- A `read()` method for reading from R2 (useful for cache-warming or incremental deploy scenarios)
- Support for batch writes using R2 multi-part upload for large sites

## Specification

_To be completed._

## Plan

_To be completed._

[← Back to Reference](./README.md)
