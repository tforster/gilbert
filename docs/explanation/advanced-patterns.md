# Advanced Patterns <!-- omit in toc -->

This document explains advanced Gilbert capabilities — custom pipeline development, stream composition patterns, and plugin architecture. These patterns are for teams that need to extend Gilbert beyond its built-in pipelines.

## Table of Contents <!-- omit in toc -->

- [1. Custom Pipeline Development](#1-custom-pipeline-development)
  - [1.1 Single-File Transform](#11-single-file-transform)
  - [1.2 One-to-Many Transform](#12-one-to-many-transform)
- [2. Stream Composition Patterns](#2-stream-composition-patterns)
  - [2.1 Parallel Processing](#21-parallel-processing)
  - [2.2 Conditional Processing](#22-conditional-processing)
- [3. Plugin Architecture](#3-plugin-architecture)
  - [3.1 Plugin Interface](#31-plugin-interface)
  - [3.2 Sitemap Plugin Example](#32-sitemap-plugin-example)
- [Further Reading](#further-reading)

## 1. Custom Pipeline Development

Custom pipelines are Web API `TransformStream` implementations. They receive `GilbertFile` objects and enqueue zero or more `GilbertFile` objects per input file.

### 1.1 Single-File Transform

The simplest case: transform one file into one output file (e.g., a Markdown renderer):

```javascript
import GilbertFile from "@tforster/gilbert-file";
import { marked } from "marked";

class MarkdownPipeline extends TransformStream {
  constructor(options = {}) {
    super({
      transform: async (file, controller) => {
        if (file.extname === ".md") {
          const html = marked(await file.toString());
          controller.enqueue(
            file.clone({
              path: file.path.replace(".md", ".html"),
              contents: Buffer.from(html),
            })
          );
        } else {
          controller.enqueue(file);
        }
      },
    });
  }
}

// Usage
await markdownSource.read("**/*.md").pipeThrough(new MarkdownPipeline()).pipeTo(outputAdapter.write("./dist"));
```

### 1.2 One-to-Many Transform

Produce multiple output files per input file (e.g., responsive image variants):

```javascript
class ResponsiveImagePipeline {
  constructor(sizes = [320, 640, 1280]) {
    this.sizes = sizes;
  }

  create() {
    return new TransformStream({
      transform: async (file, controller) => {
        const isImage = /\.(jpg|jpeg|png)$/i.test(file.path);

        if (!isImage) {
          controller.enqueue(file);
          return;
        }

        const { default: sharp } = await import("sharp");

        for (const width of this.sizes) {
          const resized = await sharp(await file.toBuffer())
            .resize(width)
            .toBuffer();

          controller.enqueue(
            new GilbertFile({
              path: file.path.replace(/(\.\w+)$/, `-${width}$1`),
              contents: resized,
              cwd: "/",
            })
          );
        }
      },
    });
  }
}
```

## 2. Stream Composition Patterns

### 2.1 Parallel Processing

Process a file through multiple independent pipelines simultaneously, collecting all results:

```javascript
class ParallelPipeline {
  constructor(pipelines) {
    this.pipelines = pipelines;
  }

  create() {
    return new TransformStream({
      transform: async (file, controller) => {
        const results = await Promise.all(this.pipelines.map((pipeline) => this.#processFile(file, pipeline)));

        for (const result of results.flat()) {
          controller.enqueue(result);
        }
      },
    });
  }

  async #processFile(file, pipeline) {
    return new Promise((resolve, reject) => {
      const results = [];

      new ReadableStream({
        start(controller) {
          controller.enqueue(file);
          controller.close();
        },
      })
        .pipeThrough(pipeline)
        .pipeTo(
          new WritableStream({
            write(chunk) {
              results.push(chunk);
            },
            close() {
              resolve(results);
            },
            abort(error) {
              reject(error);
            },
          })
        );
    });
  }
}
```

### 2.2 Conditional Processing

Route files through different pipelines based on a predicate:

```javascript
class ConditionalPipeline extends TransformStream {
  /**
   * @param {Function} condition - async (file) => boolean
   * @param {TransformStream} truePipeline - pipeline when condition is true
   * @param {TransformStream} [falsePipeline] - pipeline when condition is false
   */
  constructor(condition, truePipeline, falsePipeline = null) {
    super({
      transform: async (file, controller) => {
        const pipeline = (await condition(file)) ? truePipeline : falsePipeline;

        if (pipeline) {
          const processed = await this.#processThroughPipeline(file, pipeline);
          controller.enqueue(processed);
        } else {
          controller.enqueue(file);
        }
      },
    });
  }
}

// Usage: skip draft pages
const conditionalProcessor = new ConditionalPipeline(
  async (file) => {
    const data = JSON.parse(await file.toString());
    return data.draft !== true;
  },
  productionPipeline,
  null // pass drafts through unchanged
);
```

## 3. Plugin Architecture

### 3.1 Plugin Interface

Plugins wrap a `TransformStream` with optional lifecycle hooks:

```javascript
class GilbertPlugin {
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
  }

  /** Called before the build starts. */
  beforeBuild(context) {}

  /**
   * Returns a TransformStream.
   * @returns {TransformStream}
   */
  createTransform() {
    throw new Error(`Plugin "${this.name}" must implement createTransform()`);
  }

  /** Called after the build completes. */
  afterBuild(context, results) {}
}
```

### 3.2 Sitemap Plugin Example

A plugin that observes all generated HTML files and appends a `sitemap.xml` to the output stream:

```javascript
class SitemapPlugin extends GilbertPlugin {
  #urls = [];
  #baseUrl;

  constructor(options) {
    super("sitemap", options);
    this.#baseUrl = options.baseUrl ?? "https://example.com";
  }

  createTransform() {
    return new TransformStream({
      transform: (file, controller) => {
        if (file.path.endsWith(".html")) {
          this.#urls.push({
            url: `${this.#baseUrl}${file.relative}`,
            lastmod: new Date().toISOString(),
          });
        }
        controller.enqueue(file);
      },

      flush: (controller) => {
        const urls = this.#urls.map((u) => `  <url><loc>${u.url}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n");

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

        controller.enqueue(
          new GilbertFile({
            path: "/sitemap.xml",
            contents: Buffer.from(sitemap),
            cwd: "/",
          })
        );
      },
    });
  }
}

// Usage
const sitemapPlugin = new SitemapPlugin({ baseUrl: "https://mysite.com" });

await gilbert.start().pipeThrough(sitemapPlugin.createTransform()).pipeTo(outputAdapter.write("./dist"));
```

## Further Reading

- [Architecture](./architecture.md) — core stream model and pipeline system
- [Pipelines Reference](../reference/pipelines.md) — built-in pipeline specifications
- [API Reference](../reference/api.md) — GilbertFile and adapter APIs

[← Back to Explanation](./README.md)
