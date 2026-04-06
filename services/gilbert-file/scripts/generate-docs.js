#!/usr/bin/env node

/**
 * Documentation generator for gilbert-file
 * Generates separate markdown files for better organization
 */

import fs from "fs/promises";
import path from "path";
import jsdoc2md from "jsdoc-to-markdown";

const OUTPUT_DIR = "../../docs/gilbert-file";
const LIB_DIR = "./lib";

async function generateDocs() {
  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Generate comprehensive API documentation
    // eslint-disable-next-line no-console
    console.log("Generating API documentation...");
    const apiDocs = await jsdoc2md.render({
      files: `${LIB_DIR}/**/*.js`,
      "heading-depth": 2,
      "module-index-format": "list",
      "global-index-format": "list",
    });

    await fs.writeFile(path.join(OUTPUT_DIR, "API.md"), apiDocs);

    // Generate individual class documentation
    // eslint-disable-next-line no-console
    console.log("Generating GilbertFile class documentation...");
    const gilbertFileDocs = await jsdoc2md.render({
      files: `${LIB_DIR}/index.js`,
      "heading-depth": 1,
      "no-cache": true,
    });

    await fs.writeFile(path.join(OUTPUT_DIR, "GilbertFile.md"), gilbertFileDocs);

    // eslint-disable-next-line no-console
    console.log("Generating WebPath class documentation...");
    const webPathDocs = await jsdoc2md.render({
      files: `${LIB_DIR}/WebPath.js`,
      "heading-depth": 1,
      "no-cache": true,
    });

    await fs.writeFile(path.join(OUTPUT_DIR, "WebPath.md"), webPathDocs);

    // Create index file
    const indexContent = `# Gilbert File Documentation

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

\`\`\`javascript
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
\`\`\`

## Generated Documentation

This documentation is automatically generated from JSDoc comments in the source code.
To regenerate: \`npm run docs\`
`;

    await fs.writeFile(path.join(OUTPUT_DIR, "README.md"), indexContent);

    // eslint-disable-next-line no-console
    console.log("✅ Documentation generated successfully!");
    // eslint-disable-next-line no-console
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    // eslint-disable-next-line no-console
    console.log("📄 Generated files:");
    // eslint-disable-next-line no-console
    console.log("   - README.md (overview)");
    // eslint-disable-next-line no-console
    console.log("   - GilbertFile.md (main class)");
    // eslint-disable-next-line no-console
    console.log("   - WebPath.md (utilities)");
    // eslint-disable-next-line no-console
    console.log("   - API.md (complete reference)");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("❌ Error generating documentation:", error);
    process.exit(1);
  }
}

generateDocs();
