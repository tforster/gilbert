# Gilbert File Documentation

This documentation covers the Gilbert File virtual file system components.

## Components

- **[GilbertFile](./GilbertFile.md)** - Virtual file object for stream processing
- **[WebPath](./WebPath.md)** - Web API-compatible path utilities
- **[Complete API Reference](./API.md)** - Comprehensive API documentation

## Overview

Gilbert File provides a virtual file object system designed for modern JavaScript runtimes including Node.js, Bun, Deno, and Cloudflare Workers. It uses Web API streams for maximum compatibility and performance.

### Key Features

- **Web API Streams**: First-class support for ReadableStream
- **Runtime Agnostic**: Works across all modern JavaScript runtimes
- **Vinyl Compatible**: Drop-in replacement for Vinyl file objects
- **Type Safe**: Comprehensive JSDoc type definitions
- **Path Utilities**: Cross-platform path manipulation

### Quick Start

```javascript
import GilbertFile from '@tforster/gilbert-file';

// Create a virtual file
const file = new GilbertFile({
  path: '/src/example.txt',
  contents: new Uint8Array([72, 101, 108, 108, 111]) // "Hello"
});

console.log(file.path);        // "/src/example.txt"
console.log(file.size);        // 5
console.log(file.extname);     // ".txt"
console.log(file.contentType); // "text/plain"
```

## Generated Documentation

This documentation is automatically generated from JSDoc comments in the source code.
To regenerate: `npm run docs`
