# gilbert-file

gilbert-file implements a virtual file object that can be used by the Gilbert text file compiler. gilbert-file was inspired by Vinyl as earlier versions of Gilbert relied heavily upon Vinyl and VinylFS. However, gilbert-file is a more lightweight implementation that does not require the Vinyl library. It also provides a more flexible interface for file operations, allowing for easier integration with the Gilbert compiler.

Since gilbert-file is a subset of the VinylFile interface it is free of external dependencies, other than the mime library for detecting and setting mime types. It also does not suffer from extremely outdated libraries and comes with more than 30 tests.

## Features

- **Web API Compatible**: Uses Web API streams for runtime-agnostic compatibility
- **Virtual File Objects**: Represents files in memory for stream processing pipelines
- **Path Utilities**: Built-in Web API-compatible path manipulation utilities
- **MIME Type Detection**: Automatic content type detection based on file extensions
- **Vinyl Compatibility**: Maintains compatibility with existing Vinyl-based workflows
- **TypeScript Support**: Comprehensive JSDoc type definitions for excellent IDE support

## Installation

```bash
npm install @tforster/gilbert-file
```

## Quick Start

```javascript
import GilbertFile from "@tforster/gilbert-file";

// Create a virtual file
const file = new GilbertFile({
  path: "/path/to/file.txt",
  contents: new Uint8Array([72, 101, 108, 108, 111]), // "Hello"
});

console.log(file.path); // '/path/to/file.txt'
console.log(file.size); // 5
console.log(file.contentType); // 'text/plain'
console.log(file.extname); // '.txt'
```

## Documentation

Comprehensive API documentation is available:

- **Generate docs**: `npm run docs`
- **View docs**: Open `docs/index.html` in your browser
- **Watch mode**: `npm run docs:watch` (regenerates on file changes)

The documentation includes:

- Complete API reference for `GilbertFile` class
- `WebPath` utility functions
- Usage examples and type definitions
- Integration guides

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate documentation
npm run docs
```
