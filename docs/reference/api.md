# API Reference <!-- omit in toc -->

Comprehensive API documentation for all Gilbert packages and their exported interfaces.

## Table of Contents <!-- omit in toc -->

- [1. Core Engine — Gilbert](#1-core-engine--gilbert)
- [2. GilbertFile](#2-gilbertfile)
- [3. Filesystem Integration — GilbertFS](#3-filesystem-integration--gilbertfs)
- [4. GitHub Integration — GilbertGitHub](#4-github-integration--gilbertgithub)
- [5. Pipeline Configuration](#5-pipeline-configuration)

## 1. Core Engine — Gilbert

**`new Gilbert(streams, options)`**

Creates a new Gilbert instance with the specified streams configuration.

```javascript
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const gilbert = new Gilbert(
  {
    templates: templatesAdapter.read("**/*.hbs"),
    data: { source: dataAdapter.read("**/*.json") },
    scripts: ["./src/scripts/main.js"],
    stylesheets: ["./src/stylesheets/main.css"],
    staticFiles: staticAdapter.read("images/**/*"),
  },
  { debug: true }
);
```

**Parameters:**

| Parameter                 | Type             | Description                             |
| :------------------------ | :--------------- | :-------------------------------------- |
| `streams.templates`       | `ReadableStream` | Handlebars template files               |
| `streams.data.source`     | `ReadableStream` | Data files stream                       |
| `streams.data.middleware` | `Function[]`     | Optional data transformation middleware |
| `streams.scripts`         | `string[]`       | JavaScript entry point paths (optional) |
| `streams.stylesheets`     | `string[]`       | CSS entry point paths (optional)        |
| `streams.staticFiles`     | `ReadableStream` | Static files stream (optional)          |
| `options.debug`           | `boolean`        | Enable debug logging via gilbert-logger |

**Returns:** `Gilbert` — Gilbert instance

**`gilbert.start()`**

Compiles all configured content through the appropriate pipelines.

```javascript
// Compile and pipe to output
await gilbert.start().pipeTo(outputAdapter.write("./dist"));
```

**Parameters:** none

**Returns:** `Promise<ReadableStream<GilbertFile>>` — stream of generated files

## 2. GilbertFile

**`new GilbertFile(options)`**

Creates a new virtual file object.

```javascript
import GilbertFile from "@tforster/gilbert-file";

const file = new GilbertFile({
  path: "/src/index.html",
  contents: Buffer.from("<html>...</html>"),
  cwd: "/",
});
```

**Constructor options:**

| Option     | Type                                     | Description                                            |
| :--------- | :--------------------------------------- | :----------------------------------------------------- |
| `path`     | `string`                                 | Absolute file path                                     |
| `contents` | `Buffer \| Uint8Array \| ReadableStream` | File content                                           |
| `cwd`      | `string`                                 | Current working directory (use `"/"` for virtual root) |
| `base`     | `string`                                 | Base directory for relative path calculation           |

**Properties:**

| Property      | Type                                     | Description                               |
| :------------ | :--------------------------------------- | :---------------------------------------- |
| `path`        | `string`                                 | Absolute file path                        |
| `base`        | `string`                                 | Base directory                            |
| `relative`    | `string`                                 | Computed relative path (read-only)        |
| `contents`    | `Buffer \| Uint8Array \| ReadableStream` | File content                              |
| `extname`     | `string`                                 | File extension derived from path          |
| `basename`    | `string`                                 | Filename without extension                |
| `dirname`     | `string`                                 | Directory portion of path                 |
| `contentType` | `string`                                 | MIME type based on current file extension |

**Methods:**

| Method              | Returns           | Description                                                  |
| :------------------ | :---------------- | :----------------------------------------------------------- |
| `clone(overrides?)` | `GilbertFile`     | Creates a copy of the file, optionally overriding properties |
| `isBuffer()`        | `boolean`         | Returns true if contents is a Buffer                         |
| `toString()`        | `Promise<string>` | Resolves contents to a UTF-8 string                          |
| `toBuffer()`        | `Promise<Buffer>` | Resolves contents to a Buffer                                |

## 3. Filesystem Integration — GilbertFS

**`new GilbertFS(options?)`**

Creates a filesystem adapter instance.

```javascript
import GilbertFS from "@tforster/gilbert-fs";

const adapter = new GilbertFS({
  base: "./src", // Base path for relative calculations (default: process.cwd())
});
```

**`adapter.read(patterns, options?)`**

Creates a `ReadableStream<GilbertFile>` from the filesystem.

```javascript
const sourceStream = adapter.read("**/*.html", {
  base: "./src",
});
```

| Parameter      | Type                 | Description                                |
| :------------- | :------------------- | :----------------------------------------- |
| `patterns`     | `string \| string[]` | Glob pattern(s) for file selection         |
| `options.base` | `string`             | Override base path for this read operation |

**Returns:** `ReadableStream<GilbertFile>`

**`adapter.write(directory)`**

Creates a `WritableStream<GilbertFile>` that saves files to the filesystem.

```javascript
const outputStream = adapter.write("./dist");
```

| Parameter   | Type     | Description           |
| :---------- | :------- | :-------------------- |
| `directory` | `string` | Output directory path |

**Returns:** `WritableStream<GilbertFile>`

## 4. GitHub Integration — GilbertGitHub

**`new GilbertGitHub(options)`**

Creates a GitHub adapter instance.

```javascript
import GilbertGitHub from "@tforster/gilbert-github";

const adapter = new GilbertGitHub({
  repo: "owner/repository",
  branch: "main",
  token: process.env.GITHUB_TOKEN,
});
```

**Constructor options:**

| Option   | Type     | Description                                                 |
| :------- | :------- | :---------------------------------------------------------- |
| `repo`   | `string` | Repository in `owner/name` format (required)                |
| `branch` | `string` | Git branch (default: `"main"`)                              |
| `token`  | `string` | GitHub API authentication token (optional for public repos) |

**`adapter.read(patterns, options?)`**

Creates a `ReadableStream<GilbertFile>` from a GitHub repository.

```javascript
const templateStream = adapter.read("templates/**/*.hbs", {
  branch: "feature-branch",
});
```

| Parameter        | Type                 | Description                               |
| :--------------- | :------------------- | :---------------------------------------- |
| `patterns`       | `string \| string[]` | Glob pattern(s) to match repository files |
| `options.branch` | `string`             | Override branch for this read operation   |
| `options.token`  | `string`             | Override token for this read operation    |

**Returns:** `ReadableStream<GilbertFile>`

## 5. Pipeline Configuration

### 5.1 TemplatePipeline

```javascript
// Instantiated by Gilbert core engine — not used directly.
// Constructor: new TemplatePipeline(options, dataStream, templatesStream)
// No direct configuration; controlled via the Gilbert constructor.
```

### 5.2 ScriptsPipeline

```javascript
// Constructor: new ScriptsPipeline(entryPoints, esbuildOptions)
// esbuildOptions passed directly to esbuild.build()
{
  target: ["esnext"],   // ES target version (array format required)
  bundle: true,         // Enable module bundling
  minify: true,         // Enable code minification
  sourcemap: true,      // Generate source maps (note: 'sourcemap' not 'sourceMaps')
  format: "iife",       // Output format
  write: false,         // Always false for Web API streams
  metafile: true,       // Generate build metadata
  treeShaking: true,    // Enable dead code elimination
}
```

### 5.3 StylesheetsPipeline

```javascript
// Constructor: new StylesheetsPipeline(entryPoints, esbuildOptions)
// esbuildOptions passed directly to esbuild.build()
{
  target: ["es2020"],   // Browser compatibility target
  bundle: true,         // Enable CSS bundling
  minify: true,         // Enable CSS minification
  sourcemap: true,      // Generate source maps
  write: false,         // Always false for Web API streams
  metafile: true,       // Generate build metadata
  loader: {
    ".eot": "file",
    ".ttf": "dataurl",
    ".woff": "file",
    ".svg": "file",
  },
  autoprefixCss: true,  // Custom Gilbert option — enable PostCSS autoprefixer
}
```

### 5.4 StaticFilesPipeline

```javascript
// Constructor: new StaticFilesPipeline()
// No configuration options — simple pass-through TransformStream.
// Exposes: this.transformStream (TransformStream)
```

[← Back to Reference](./README.md)
