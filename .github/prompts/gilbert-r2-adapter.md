# Gilbert R2 Adapter Development Prompt

**Date:** September 27, 2025  
**Purpose:** Comprehensive development guide for `gilbert-r2` adapter  
**Context:** Third Gilbert adapter for Cloudflare R2 storage using native Workers API

## Overview

Create a Gilbert adapter that streams static site assets directly to Cloudflare R2 storage using the native Workers binding API. This adapter leverages R2's stream-native `put()` method and strong consistency model to provide high-performance, cost-effective object storage for Gilbert-generated sites.

## Architecture Decision: Native R2 Workers API

After comprehensive research, **Cloudflare's native R2 Workers API** is now the recommended approach over S3 compatibility:

### Why Native R2 API vs S3 Compatibility

| Feature          | Native R2 Binding                   | S3 Compatibility           |
| ---------------- | ----------------------------------- | -------------------------- |
| **Performance**  | Direct binding, fastest             | HTTP requests, slower      |
| **Streaming**    | `put(key, readableStream)` built-in | Requires additional setup  |
| **Integration**  | Deep Workers ecosystem integration  | Generic S3 client          |
| **Features**     | Full R2 feature set, conditionals   | Limited to S3 subset       |
| **Dependencies** | Zero external dependencies          | Requires S3 SDK            |
| **Memory Usage** | Minimal, stream-optimized           | Higher due to SDK overhead |

### Native API Benefits

- **Stream-native**: `R2Bucket.put(key, readableStream)` directly supports Gilbert's streaming architecture
- **Strong consistency**: Read-after-write globally, perfect for CMS workflows
- **WinterCG compatible**: Uses only Web APIs, works in any Workers-compatible runtime
- **Rich metadata**: HTTP headers, custom metadata, ETags, integrity checksums
- **Zero egress costs**: No bandwidth charges for data retrieval

## Implementation Requirements

### Core Adapter Structure

Follow established Gilbert adapter patterns from `gilbert-fs` and `gilbert-github`:

```javascript
// gilbert-r2/lib/index.js
export default class GilbertR2 {
  constructor({ accountId, apiToken, bucketName, endpoint, options = {} }) {
    this.#accountId = accountId;
    this.#apiToken = apiToken;
    this.#bucketName = bucketName;
    this.#endpoint = endpoint || `https://${accountId}.r2.cloudflarestorage.com`;
    this.#options = {
      storageClass: "Standard", // 'Standard' or 'InfrequentAccess'
      cachePolicy: {
        // Default cache policies by file extension
        html: "public, s-maxage=300", // 5 minutes
        css: "public, s-maxage=86400", // 24 hours
        js: "public, s-maxage=86400", // 24 hours
        jpg: "public, s-maxage=604800", // 7 days
        jpeg: "public, s-maxage=604800", // 7 days
        png: "public, s-maxage=604800", // 7 days
        gif: "public, s-maxage=604800", // 7 days
        webp: "public, s-maxage=604800", // 7 days
        svg: "public, s-maxage=604800", // 7 days
        ico: "public, s-maxage=2592000", // 30 days
        woff: "public, s-maxage=2592000", // 30 days
        woff2: "public, s-maxage=2592000", // 30 days
        default: "public, s-maxage=3600", // 1 hour fallback
      },
      ...options,
    };
  }

  async write(readable) {
    // Direct streaming to R2 sink
    return readable.pipeTo(this.#createR2Sink());
  }

  // Read method not implemented (write-only adapter)
  async read() {
    throw new Error("gilbert-r2 is a write-only adapter");
  }
}
```

### Stream Processing Implementation

```javascript
#createR2Sink() {
  return new WritableStream({
    async write(gilbertFile) {
      if (!(gilbertFile instanceof GilbertFile)) {
        return; // Skip non-Gilbert files
      }

      // Validate file size before upload
      await this.#validateFileSize(gilbertFile);

      // Direct streaming upload to R2
      await this.#uploadToR2(gilbertFile);
    }
  });
}
```

### R2 Upload Implementation

#### Standard Upload (< 100 MiB)

```javascript
async #uploadToR2(gilbertFile) {
  const content = await gilbertFile.content();
  const metadata = this.#buildR2Metadata(gilbertFile);

  try {
    const result = await this.r2Bucket.put(gilbertFile.filePath, content, {
      httpMetadata: {
        contentType: gilbertFile.contentType,
        cacheControl: metadata.cacheControl,
        contentDisposition: metadata.contentDisposition,
        contentEncoding: metadata.contentEncoding,
        contentLanguage: metadata.contentLanguage
      },
      customMetadata: {
        uploadedBy: 'gilbert-r2',
        timestamp: new Date().toISOString(),
        version: gilbertFile.version || '1.0',
        ...metadata.custom
      },
      storageClass: this.#options.storageClass,
      // Optional: Include hash for integrity checking if provided by Gilbert core
      ...(gilbertFile.hash && {
        sha256: this.#hexToArrayBuffer(gilbertFile.hash)
      })
    });

    return {
      success: true,
      key: result.key,
      etag: result.etag,
      size: result.size
    };
  } catch (error) {
    throw new Error(`R2 upload failed for ${gilbertFile.filePath}: ${error.message}`);
  }
}
```

#### File Size Validation

```javascript
async #validateFileSize(gilbertFile) {
  // Check file size to enforce 100 MiB limit
  const contentLength = await this.#getContentLength(gilbertFile);

  if (contentLength > 100 * 1024 * 1024) { // > 100 MiB
    throw new Error(
      `File ${gilbertFile.filePath} is ${Math.round(contentLength / 1024 / 1024)}MiB. ` +
      `Files larger than 100MiB are not yet supported. ` +
      `Multipart upload support planned for future release.`
    );
  }
}

async #getContentLength(gilbertFile) {
  // Get content length without consuming the stream
  return gilbertFile.size || (await gilbertFile.content()).length || 0;
}
```

### Configuration and Authentication

#### Required Configuration

Since this adapter uses Worker bindings, the primary configuration is in `wrangler.toml`:

```toml
# wrangler.toml - Worker binding configuration
r2_buckets = [
  { binding = "ASSETS_BUCKET", bucket_name = "your-actual-bucket-name" }
]
```

Optionally, you may want environment variables for other purposes:

```bash
# Optional: For development or testing outside Workers environment
R2_BINDING_NAME=ASSETS_BUCKET

# Optional: Custom cache policies or other adapter settings
R2_STORAGE_CLASS=Standard
```

#### Flexible Configuration

````javascript
// Support multiple configuration sources (env vars, secrets, etc.)
constructor(config = {}) {
  // Note: accountId and apiToken are not needed for worker bindings
  // Only bucketName is required to identify the binding
  this.#bucketName = config.bucketName || config.binding || 'ASSETS_BUCKET';

  if (!this.#bucketName) {
    throw new Error(
      'Missing required R2 binding name. Provide bucketName or binding ' +
      'in config object to match wrangler.toml binding.'
    );
  }

  // Remove accountId and apiToken - not needed for worker bindings
  // Gilbert projects can source these from environment, secrets manager, etc.
}
```#### R2 Worker Binding Setup

**Required**: Worker bindings are necessary to use R2's native streaming API. The adapter expects the R2 bucket to be bound in `wrangler.toml`:

```toml
# wrangler.toml (publishing worker configuration)
r2_buckets = [
  { binding = "ASSETS_BUCKET", bucket_name = "your-actual-bucket-name" }
]
````

```javascript
// Adapter initialization - gets bucket from worker environment
#initializeR2Binding(env) {
  // Use the binding name from wrangler.toml
  const bindingName = this.#bucketName || 'ASSETS_BUCKET';

  if (env && env[bindingName]) {
    this.r2Bucket = env[bindingName];
    return;
  }

  throw new Error(
    `R2 bucket binding '${bindingName}' not found. ` +
    `Ensure bucket is bound in wrangler.toml: ` +
    `r2_buckets = [{ binding = "${bindingName}", bucket_name = "your-bucket" }]`
  );
}
```

> [!IMPORTANT]
>
> The `bucketName` in constructor config should match the `binding` name in wrangler.toml, not the actual bucket name. This prevents contradicting wrangler.toml settings.### Error Handling and Retry Logic

```javascript
async #uploadWithRetry(gilbertFile, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await this.#uploadToR2(gilbertFile);
    } catch (error) {
      lastError = error;

      // Determine if error is retryable
      if (this.#isRetryableError(error) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await this.#sleep(delay);
        continue;
      }

      // Non-retryable error or max retries exceeded
      throw error;
    }
  }

  throw lastError;
}

#isRetryableError(error) {
  // Retry on network errors, rate limits, temporary server errors
  const retryableMessages = [
    'network error',
    'timeout',
    'rate limited',
    'temporary failure'
  ];

  const errorMessage = error.message.toLowerCase();
  return retryableMessages.some(msg => errorMessage.includes(msg));
}
```

### Hash Handling

```javascript
#hexToArrayBuffer(hexString) {
  // Convert hex string to ArrayBuffer for R2 hash validation
  // This handles hashes calculated by Gilbert core
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes.buffer;
}
```

### Metadata Mapping

```javascript
#buildR2Metadata(gilbertFile) {
  const metadata = {
    custom: {}
  };

  // Apply cache policy based on file extension
  const ext = gilbertFile.filePath.split('.').pop()?.toLowerCase();
  metadata.cacheControl = this.#options.cachePolicy[ext] || this.#options.cachePolicy.default;

  // Add custom metadata from Gilbert file
  if (gilbertFile.metadata) {
    metadata.custom = { ...gilbertFile.metadata };
  }

  return metadata;
}
```

## Testing Strategy

### Unit Tests (Node.js Test Runner)

```javascript
// gilbert-r2/tests/unit/index.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import GilbertR2 from "../../lib/index.js";
import { GilbertFile } from "@tforster/gilbert-file";

describe("GilbertR2", () => {
  it("validates required configuration", () => {
    assert.throws(() => new GilbertR2(), /Missing required R2 binding name/);

    assert.doesNotThrow(
      () =>
        new GilbertR2({
          bucketName: "ASSETS_BUCKET",
        })
    );
  });

  it("processes stream correctly", async () => {
    // Mock R2 bucket binding
    const mockR2 = {
      put: async (key, stream, options) => ({
        key,
        etag: '"abc123"',
        size: 1024,
      }),
    };

    const adapter = new GilbertR2({
      bucketName: "ASSETS_BUCKET",
    });
    adapter.r2Bucket = mockR2;

    const testFile = new GilbertFile({
      filePath: "test.html",
      content: "<html>test</html>",
      contentType: "text/html",
    });

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(testFile);
        controller.close();
      },
    });

    await adapter.write(readable);

    // Test passes if no errors thrown
    assert.ok(true);
  });

  it("enforces file size limit", async () => {
    const adapter = new GilbertR2({
      bucketName: "ASSETS_BUCKET",
    });

    // Mock large file
    const largeFile = new GilbertFile({
      filePath: "large.bin",
      content: new ArrayBuffer(101 * 1024 * 1024), // 101 MiB
    });

    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(largeFile);
        controller.close();
      },
    });

    await assert.rejects(adapter.write(readable), /Files larger than 100MiB/);
  });
});
```

### Worker Integration Tests

```javascript
// gilbert-r2/tests/worker-integration/test-runner.js
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

describe("Gilbert R2 Worker Integration", () => {
  let workerProcess;
  const workerUrl = "http://localhost:8787";

  before(async () => {
    // Start wrangler dev
    workerProcess = spawn("npx", ["wrangler", "dev"], {
      cwd: new URL("./worker/", import.meta.url).pathname,
      stdio: "pipe",
    });

    // Wait for worker to be ready
    await waitForWorker(workerUrl);
  });

  after(() => {
    if (workerProcess) {
      workerProcess.kill();
    }
  });

  it("processes Gilbert pipeline and uploads to R2", async () => {
    const response = await fetch(`${workerUrl}/test-publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "<html><body>Test content</body></html>",
        path: "test.html",
      }),
    });

    assert.equal(response.status, 200);

    const result = await response.json();
    assert.ok(result.success);
    assert.ok(result.uploaded);
  });

  it("validates file in R2 bucket", async () => {
    const response = await fetch(`${workerUrl}/check-r2/test.html`);
    assert.equal(response.status, 200);

    const content = await response.text();
    assert.match(content, /Test content/);
  });
});

async function waitForWorker(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch (error) {
      // Worker not ready yet
    }
    await setTimeout(1000);
  }
  throw new Error("Worker failed to start");
}
```

### Worker Test Project Structure

```shell
gilbert-r2/tests/worker-integration/
├── wrangler.jsonc              # Worker configuration
├── package.json                # Worker dependencies
├── src/
│   ├── index.js               # Test worker implementation
│   └── test-data/             # Sample Gilbert content
└── test-runner.js             # Integration test runner
```

### Test Worker Configuration

```jsonc
// gilbert-r2/tests/worker-integration/wrangler.jsonc
{
  "name": "gilbert-r2-test-worker",
  "main": "src/index.js",
  "compatibility_date": "2025-09-27",
  "r2_buckets": [
    {
      "binding": "ASSETS_BUCKET",
      "bucket_name": "gilbert-r2-test-bucket",
    },
  ],
  "vars": {
    "ENVIRONMENT": "test",
  },
}
```

### Test Worker Implementation

```javascript
// gilbert-r2/tests/worker-integration/src/index.js
import Gilbert from "@tforster/gilbert";
import GilbertGithub from "@tforster/gilbert-github";
import GilbertR2 from "../../../lib/index.js";
import { GilbertFile } from "@tforster/gilbert-file";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response("OK");
    }

    // Test publish endpoint
    if (url.pathname === "/test-publish" && request.method === "POST") {
      const body = await request.json();

      try {
        // Create Gilbert instance with R2 adapter
        const gilbert = new Gilbert({
          adapters: [
            {
              name: "r2-test",
              adapter: GilbertR2,
              config: {
                bucketName: "ASSETS_BUCKET",
              },
            },
          ],
        });

        // Initialize adapter with worker environment
        const adapter = gilbert.adapters.get("r2-test");
        adapter.initializeR2Binding(env);

        // Create test file
        const testFile = new GilbertFile({
          filePath: body.path,
          content: body.content,
          contentType: "text/html",
        });

        // Process through Gilbert
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(testFile);
            controller.close();
          },
        });

        await adapter.write(readable);

        return Response.json({
          success: true,
          uploaded: body.path,
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        );
      }
    }

    // Check R2 content endpoint
    if (url.pathname.startsWith("/check-r2/")) {
      const key = url.pathname.replace("/check-r2/", "");

      try {
        const object = await env.ASSETS_BUCKET.get(key);
        if (!object) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(object.body, {
          headers: {
            "Content-Type": object.httpMetadata.contentType || "text/plain",
          },
        });
      } catch (error) {
        return new Response(error.message, { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 });
  },
};
```

## Package Configuration

### package.json

```json
{
  "name": "@tforster/gilbert-r2",
  "version": "1.0.0",
  "description": "Gilbert adapter for Cloudflare R2 storage using native Workers API",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": "./lib/index.js"
  },
  "scripts": {
    "test": "node --test tests/unit/**/*.test.js",
    "test:watch": "node --test --watch tests/unit/**/*.test.js",
    "test:integration": "node tests/worker-integration/test-runner.js",
    "test:all": "npm run test && npm run test:integration",
    "lint": "eslint lib tests",
    "build": "echo 'No build step required for ES modules'",
    "prepack": "npm run lint && npm run test:all"
  },
  "keywords": ["gilbert", "static-site-generator", "cloudflare", "r2", "storage", "streaming", "web-streams"],
  "dependencies": {
    "@tforster/gilbert-file": "^1.0.0",
    "@tforster/gilbert-logger": "^1.0.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0"
  },
  "peerDependencies": {
    "@tforster/gilbert": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### README.md Structure

````markdown
# @tforster/gilbert-r2

Gilbert adapter for Cloudflare R2 storage using the native Workers API.

## Features

- **Stream-native uploads** using R2's native `put(key, readableStream)` API
- **Strong consistency** - content immediately available after upload
- **Zero egress costs** - no bandwidth charges for data retrieval
- **WinterCG compatible** - works in Cloudflare Workers and compatible runtimes
- **Hash support** - uses hashes calculated by Gilbert core for integrity checking
- **Smart caching headers** - automatic cache policies based on file type
- **Retry logic** - robust error handling with exponential backoff

## Installation

```bash
npm install @tforster/gilbert-r2
```
````

## Configuration

### Worker Binding Setup

Configure your `wrangler.toml` file:

```toml
r2_buckets = [
  { binding = "ASSETS_BUCKET", bucket_name = "your-actual-bucket-name" }
]
```

### Gilbert Configuration

```javascript
// config.js - Gilbert project configuration
import GilbertR2 from "@tforster/gilbert-r2";

export default {
  adapters: [
    {
      name: "r2-publishing",
      adapter: GilbertR2,
      config: {
        bucketName: "ASSETS_BUCKET", // Must match wrangler.toml binding name
        options: {
          storageClass: "Standard", // or "InfrequentAccess"
          // Custom cache policies (optional)
          cachePolicy: {
            html: "public, s-maxage=60", // Override default
            pdf: "public, s-maxage=86400", // Add new file type
            json: "public, s-maxage=300", // Add API responses
            default: "public, s-maxage=1800", // Override default
          },
        },
      },
    },
  ],
};
```

> [!NOTE]
>
> Developers can source configuration from environment variables, secrets managers, or any other method within their Gilbert config file.

## Usage Examples

[Detailed usage examples...]

## API Reference

[Complete API documentation...]

## Success Criteria

### Primary Goals

- [ ] **Native R2 Integration**: Uses Cloudflare R2 Workers binding API exclusively
- [ ] **Stream-Native**: Direct `readableStream` to `R2Bucket.put()` without buffering
- [ ] **Gilbert Compatible**: Follows established adapter patterns and interfaces
- [ ] **File Size Enforcement**: Hard 100 MiB limit with clear error messages
- [ ] **Hash Integration**: Uses hashes provided by Gilbert core for integrity checking
- [ ] **Error Resilience**: Comprehensive error handling with retry logic
- [ ] **Zero Dependencies**: Uses only Web APIs and Gilbert ecosystem packages

### Secondary Goals

- [ ] **Smart Metadata**: Automatic cache headers and content type detection
- [ ] **Storage Class Support**: Configurable Standard vs InfrequentAccess storage
- [ ] **Custom Metadata**: Support for user-defined metadata on uploaded objects
- [ ] **Comprehensive Testing**: Unit tests, integration tests, and CI validation
- [ ] **Developer Experience**: Clear documentation, examples, and error messages

### Future Enhancements (Post-MVP)

- [ ] **Multipart Upload Support**: For files > 100 MiB using Durable Objects
- [ ] **Conditional Uploads**: ETag-based conditional operations
- [ ] **Batch Operations**: Optimized batch uploading for large site deployments
- [ ] **Progress Tracking**: Upload progress callbacks for monitoring
- [ ] **Regional Optimization**: Location hints for optimal performance

## Performance Considerations

- **Memory Usage**: Stream-based processing to stay within Workers 128MB limit
- **Upload Speed**: Direct R2 binding is faster than S3 HTTP compatibility
- **Error Recovery**: Exponential backoff prevents overwhelming R2 on failures
- **Metadata Efficiency**: Minimal metadata to reduce request overhead

## Security Notes

- **API Token Handling**: Never log tokens, use environment variables
- **Content Type Validation**: Ensure appropriate content types for security
- **Path Sanitization**: Validate file paths to prevent directory traversal
- **Error Information**: Avoid exposing sensitive details in error messages

This comprehensive adapter will provide Gilbert users with high-performance, cost-effective static site publishing to Cloudflare R2, leveraging the platform's native streaming capabilities and global distribution network.

---

**Implementation Priority**: High - foundational adapter for Cloudflare ecosystem integration  
**Complexity**: Medium - straightforward streaming with robust error handling  
**Dependencies**: Minimal - Gilbert ecosystem packages only
