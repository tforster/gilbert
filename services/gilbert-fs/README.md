# Gilbert FS

A Web API WritableStream implementation for writing GilbertFile objects to the local filesystem. Part of the Gilbert static site generator ecosystem.

## Overview

Gilbert FS provides filesystem integration for Gilbert when running in local development environments. It implements the Web API WritableStream interface to seamlessly write virtual files (GilbertFile objects) to the local filesystem.

## Features

- **Web API Streams**: Uses standard WritableStream for broad compatibility
- **Automatic Directory Creation**: Creates nested directories as needed
- **Multiple Content Types**: Supports Uint8Array, ReadableStream, and null contents
- **Path Resolution**: Handles relative and absolute file paths correctly
- **Runtime Agnostic**: Works with Node.js, Bun, and Deno

## Installation

```bash
npm install @tforster/gilbert-fs
```

## Usage

### Basic File Writing

```javascript
import GilbertFS from "@tforster/gilbert-fs";

// Create a destination stream
const dest = new GilbertFS({ base: "./dist" });

// Or use the static factory method
const dest = GilbertFS.dest("./dist");

// Write files via pipeTo (recommended)
await fileStream.pipeTo(dest);

// Or write individual files
const writer = dest.getWriter();
await writer.write({
  path: "/index.html",
  contents: new Uint8Array(Buffer.from("<html>Hello World</html>")),
  isDirectory: () => false,
});
await writer.close();
```

### Integration with Gilbert

```javascript
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const gilbert = new Gilbert({ relativeRoot: "./src" });

// Configure Gilbert with your content
await gilbert.compile({
  uris: { data: dataStream, theme: templateStream },
  scripts: { entryPoints: ["./src/main.js"] },
  stylesheets: { entryPoints: ["./src/styles.css"] },
});

// Write output to filesystem
await gilbert.stream.pipeTo(new GilbertFS({ base: "./dist" }));
```

## API

### Constructor

```javascript
new GilbertFS(options);
```

**Options:**

- `base` (string): Base directory path for writing files. Defaults to `"./dist"`

### Static Methods

#### `GilbertFS.dest(base, options)`

Factory method for creating a GilbertFS WritableStream.

**Parameters:**

- `base` (string): Base directory path
- `options` (Object): Additional options

**Returns:** GilbertFS instance

#### `GilbertFS.src()`

**Status:** Not yet implemented - throws error

Planned for future releases to provide filesystem reading capabilities.

## File Handling

### Supported Content Types

- **Uint8Array**: Raw binary data (most common)
- **ReadableStream**: Streaming content (converted to Uint8Array)
- **null/undefined**: Empty files

### Directory Handling

Files with `isDirectory() === true` are automatically skipped. GilbertFS focuses on writing file content, not creating empty directories.

### Path Resolution

All file paths are resolved relative to the `base` directory:

```javascript
// With base: "./dist"
{
  path: "/css/styles.css";
} // → ./dist/css/styles.css
{
  path: "js/main.js";
} // → ./dist/js/main.js
```

## Environment Support

**Local Development:**

- ✅ Node.js (primary target)
- ✅ Bun
- ✅ Deno

**Serverless/Edge:**

- ❌ Cloudflare Workers (no filesystem access)
- ❌ Edge Functions (no filesystem access)

For serverless environments, use `@tforster/gilbert-cloudflare` or similar adapters.

## Error Handling

GilbertFS includes comprehensive error handling:

- Validates file objects and required properties
- Creates directories recursively as needed
- Logs errors with context information
- Gracefully handles stream errors

## Development

```bash
# Run tests
npm test

# Test with Node.js built-in test runner
node --test tests/**/*.test.js
```

## License

MIT License - see LICENSE file for details.

## Related Packages

- [`@tforster/gilbert`](../gilbert) - Main Gilbert static site generator
- [`@tforster/gilbert-file`](../gilbert-file) - Virtual file object system
- [`@tforster/gilbert-github`](../gilbert-github) - GitHub integration for content

Part of the [Gilbert](https://github.com/tforster/webproducer) ecosystem.
