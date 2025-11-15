# gilbert-r2

Cloudflare R2 adapter for Gilbert static site generator using Web API streams.

## Overview

`gilbert-r2` provides a write-only adapter for uploading generated static site files to Cloudflare R2 object storage. It uses Cloudflare's native R2 Worker API for optimal performance and supports streaming uploads with configurable cache control headers.

## Installation

```bash
npm install @tforster/gilbert-r2
```

## Usage

### With Cloudflare Worker Bindings (Recommended)

```javascript
import Gilbert from "@tforster/gilbert";
import GilbertGitHub from "@tforster/gilbert-github";
import GilbertR2 from "@tforster/gilbert-r2";

export default {
  async fetch(request, env) {
    // Create adapters
    const github = new GilbertGitHub({
      repo: "owner/repo",
      branch: "main",
    });

    const r2 = new GilbertR2({
      binding: env.BUCKET, // R2 binding from wrangler.toml
    });

    // Build and upload to R2
    const gilbert = new Gilbert({
      templates: github.read("**/*.hbs"),
      data: { source: github.read("**/*.json") },
    });

    await gilbert.compile().pipeTo(r2.write("/"));

    return new Response("Site published successfully");
  },
};
```

### Configuration in wrangler.toml

```toml
[[r2_buckets]]
bucket_name = "my-static-site"
binding = "BUCKET"
```

## API

### Constructor

```javascript
new GilbertR2(options);
```

**Options:**

- `binding` (R2Bucket, required): R2 bucket binding from Cloudflare Worker environment
- `bucket` (string, optional): Bucket name for reference
- `maxFileSize` (number, optional): Maximum file size in bytes (default: 100 MiB)

### Methods

#### `write(destination, options)`

Creates a WritableStream for uploading GilbertFile objects to R2.

**Parameters:**

- `destination` (string, optional): Path prefix in R2 bucket (default: "/")
- `options` (object, optional):
  - `prefix` (string): Alternative way to specify path prefix
  - `cacheControl` (object): Cache control configuration
    - `html` (number): Cache duration for HTML files in seconds (default: 3600 = 1 hour)
    - `assets` (number): Cache duration for assets in seconds (default: 31536000 = 1 year)
  - `customMetadata` (object): Custom metadata to attach to uploaded objects

**Returns:** `WritableStream<GilbertFile>`

**Example:**

```javascript
await gilbert.compile().pipeTo(
  r2.write("/", {
    cacheControl: {
      html: 300, // 5 minutes
      assets: 31536000, // 1 year
    },
    customMetadata: {
      version: "1.0.0",
      environment: "production",
    },
  })
);
```

#### `read()`

Not implemented. Throws an error explaining that this adapter is write-only.

## Features

- **Native R2 Streaming**: Uses Cloudflare's native R2 Worker API with streaming for optimal performance
- **Configurable Cache Control**: Set different cache durations for HTML vs static assets
- **Custom Metadata**: Attach custom metadata to uploaded objects
- **File Size Limits**: Enforces 100 MiB file size limit (configurable)
- **Runtime Agnostic**: Built on Web API streams for universal compatibility
- **Consistent API**: Follows Gilbert adapter interface specification

## Performance

Target: Upload 200 files in 4 seconds or less (accounting for network latency).

## Limitations

- Write-only adapter (read operations not supported in initial version)
- Maximum file size: 100 MiB per file (multipart uploads not implemented)
- Requires Cloudflare Worker environment with R2 bindings

## Related Packages

- [@tforster/gilbert](https://www.npmjs.com/package/@tforster/gilbert) - Core Gilbert engine
- [@tforster/gilbert-fs](https://www.npmjs.com/package/@tforster/gilbert-fs) - Filesystem adapter
- [@tforster/gilbert-github](https://www.npmjs.com/package/@tforster/gilbert-github) - GitHub adapter
- [@tforster/gilbert-file](https://www.npmjs.com/package/@tforster/gilbert-file) - Virtual file objects

## License

MIT © Troy Forster
