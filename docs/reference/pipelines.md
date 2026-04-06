# Pipelines Reference <!-- omit in toc -->

Gilbert's pipeline system processes different asset types through specialised stream transformations. Each pipeline handles specific file types and provides configurable processing options.

## Table of Contents <!-- omit in toc -->

- [1. Template Pipeline](#1-template-pipeline)
- [2. Scripts Pipeline](#2-scripts-pipeline)
- [3. Stylesheets Pipeline](#3-stylesheets-pipeline)
- [4. Static Files Pipeline](#4-static-files-pipeline)

## 1. Template Pipeline

Processes Handlebars template files by merging them with data and producing minified HTML output.

**Supported file types**: `.hbs`, `.handlebars`

**Constructor**: `new TemplatePipeline(options, dataStream, templatesStream)`

**Key behaviours:**

- Templates are loaded fully into memory during `build()` before data processing begins — this is required because any data URI can reference any template in any order
- The `webProducerKey` in each data record maps to the corresponding template filename
- HTML output is minified using the custom cross-runtime `SimpleHtmlMinifier`

**Configuration** (controlled by Gilbert core engine — not set directly):

```javascript
// TemplatePipeline is instantiated by Gilbert core engine.
// Templates are Handlebars files processed automatically.
// No direct configuration options; controlled via the Gilbert constructor.
```

**Processing flow:**

1. All `.hbs` templates loaded into memory
2. Data stream consumed — each data record processed in sequence
3. Template selected via `webProducerKey`
4. Handlebars compilation with partial support
5. HTML minification via SimpleHtmlMinifier
6. Output file enqueued onto the readable stream

## 2. Scripts Pipeline

Processes JavaScript files with bundling, transpilation, and optimisation via esbuild.

**Supported file types**: `.js` (entry points only — dependencies resolved by esbuild)

**Constructor**: `new ScriptsPipeline(entryPoints, esbuildOptions)`

**Key behaviours:**

- esbuild does not support streaming input — entry points are filesystem paths
- Output GilbertFile objects are created with `cwd: "/"` virtual root pattern
- Source maps are generated as separate GilbertFile objects in the stream

**Default esbuild configuration:**

```javascript
{
  target: ["esnext"],
  bundle: true,
  minify: true,
  sourcemap: true,   // Note: 'sourcemap' not 'sourceMaps'
  format: "iife",
  write: false,      // Always false for Web API streams
  metafile: true,
  treeShaking: true,
}
```

**Custom configuration example:**

```javascript
const scriptsPipeline = new ScriptsPipeline(["./src/scripts/main.js"], {
  target: ["es2020"],
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: true,
});
```

**Processing flow:**

1. Module dependency analysis
2. Bundle entry point identification
3. Transpilation and transformation
4. Code optimisation and tree-shaking
5. Source map generation
6. GilbertFile objects created and enqueued

## 3. Stylesheets Pipeline

Processes CSS files with PostCSS integration, optional autoprefixing, and minification via esbuild.

**Supported file types**: `.css` (entry points only — imports resolved by esbuild)

**Constructor**: `new StylesheetsPipeline(entryPoints, esbuildOptions)`

**Key behaviours:**

- esbuild resolves `@import` statements and bundles all CSS into a single output file
- Optional PostCSS autoprefixing via the `autoprefixCss` option (custom Gilbert extension to esbuild options)
- Source maps generated as separate GilbertFile objects

**Default esbuild configuration:**

```javascript
{
  target: ["es2020"],
  bundle: true,
  minify: true,
  sourcemap: true,
  write: false,      // Always false for Web API streams
  metafile: true,
  loader: {
    ".eot": "file",
    ".ttf": "dataurl",
    ".woff": "file",
    ".svg": "file",
  },
  autoprefixCss: true, // Custom Gilbert option — enables PostCSS autoprefixer
}
```

**Processing flow:**

1. Import dependency resolution
2. CSS bundling via esbuild
3. PostCSS plugin execution (autoprefixing if enabled)
4. Optimisation and minification
5. GilbertFile objects created and enqueued

## 4. Static Files Pipeline

Handles binary assets, images, fonts, and any other static resources. Implements a simple pass-through — files are copied from input to output without modification.

**Supported file types**: all file types (no discrimination)

**Constructor**: `new StaticFilesPipeline()`

**Key behaviours:**

- Pure pass-through — GilbertFile objects flow unchanged from input to output
- MIME type / content-type is set by GilbertFile based on file extension
- Path management is handled entirely by the GilbertFS adapter `base` option, not by this pipeline

**Configuration:**

```javascript
// No configuration options — simple pass-through TransformStream
const staticPipeline = new StaticFilesPipeline();
// Exposes: staticPipeline.transformStream (TransformStream)
```

**Processing flow:**

1. File type detection (via GilbertFile.contentType)
2. Binary content streaming (Uint8Array)
3. Pass-through to output stream

[← Back to Reference](./README.md)
