# Gilbert <!-- omit in toc -->

Gilbert is a data-driven static site generator built on Web API streams. It generates content by
merging structured data with Handlebars templates, processing scripts and stylesheets through esbuild,
and passing static assets through unchanged — all via a single concurrent pipeline that completes a
complex 200+ page site in well under a second.

> [!IMPORTANT]
> **Full documentation is in [`docs/`](./docs/README.md).** Tutorials, how-to guides, API reference,
> and architectural explanations are all there, organised by the
> [Diátaxis framework](https://diataxis.fr/).

## Table of Contents <!-- omit in toc -->

- [About](#about)
- [Features](#features)
- [Packages](#packages)
- [Quick Start](#quick-start)
- [API](#api)
- [Change Log](#change-log)
- [Code of Conduct](#code-of-conduct)
- [Contributing](#contributing)
- [Meta](#meta)

## About

Gilbert is a streams-based, data-driven static site generator designed for modern deployment
environments. Rather than walking a tree of markdown files, Gilbert accepts a stream of JSON data
and merges it with in-memory Handlebars templates, generating each page on the fly.

- **Data-driven**: Content is structured data — a JSON stream where each record maps a URI to a
  template key and its data properties. This approach supports arbitrarily complex information
  architectures without a rigid filesystem convention.

- **Web API streams**: All I/O flows through the
  [WHATWG Streams API](https://streams.spec.whatwg.org/) (`ReadableStream`, `TransformStream`,
  `WritableStream`). There are no Node.js stream dependencies in the core engine, making Gilbert
  portable across Node.js ≥20, Deno, Bun, and Cloudflare Workers.

- **Concurrent pipelines**: Templates, Scripts, Stylesheets, and Static Files run as four
  concurrent pipelines. A validated 200+ page build with all four pipelines completes in ~400ms
  on a modest workstation.

- **Decoupled adapters**: Gilbert core accepts and returns streams. Filesystem I/O, GitHub API
  access, and Cloudflare R2 uploads are all separate adapter packages. Any `ReadableStream<GilbertFile>`
  is a valid source; any `WritableStream<GilbertFile>` is a valid destination.

## Features

- **Template pipeline** — Handlebars templates; includes/partials via `{{> component}}`; built-in
  HTML minification via a zero-dependency custom minifier that outperforms `html-minifier-terser`
- **Scripts pipeline** — esbuild bundling, tree-shaking, and minification; source maps; configurable
  target (default `esnext`); full esbuild options passthrough
- **Stylesheets pipeline** — esbuild CSS bundling; PostCSS Autoprefixer support; font/asset loaders;
  source maps
- **Static files pipeline** — pass-through with folder structure preservation; no filesystem
  coupling in the core engine
- **Data middleware** — array-based transformation pipeline applied to all data before rendering
  begins; enables markdown-to-HTML conversion, content enrichment, pagination, and global navigation
  across the full dataset
- **Custom MIME module** — zero audit vulnerabilities; correct content-type derivation from file
  extension on every path rename
- **`GilbertFile` object model** — `path`, `base`, `relative`, `contents` (`Uint8Array` or
  `ReadableStream`), `contentType`, `clone()`, async `toString()`, `toBuffer()`; `ReadableStream.tee()`
  ensures stream independence on clone
- **`webProducerKey`** — data convention that maps a URI record to its Handlebars template; supports
  path separators for component-based architectures (e.g. `"webProducerKey": "/admin/report/report"`)
- **Programmatic API** — `gilbert.compile()` returns a `ReadableStream` directly; pipe it anywhere
- **Zero audit vulnerabilities** — all third-party dependencies audited; custom replacements used
  where vulnerabilities existed

## Packages

| Package                                                  | Description                                       |
| -------------------------------------------------------- | ------------------------------------------------- |
| [`@tforster/gilbert`](./services/gilbert/)               | Core engine — orchestrates all four pipelines     |
| [`@tforster/gilbert-file`](./services/gilbert-file/)     | `GilbertFile` virtual file object                 |
| [`@tforster/gilbert-fs`](./services/gilbert-fs/)         | Filesystem adapter (read/write via glob patterns) |
| [`@tforster/gilbert-github`](./services/gilbert-github/) | GitHub repository source adapter                  |
| [`@tforster/gilbert-glob`](./services/gilbert-glob/)     | Shared glob pattern matching utilities            |
| [`@tforster/gilbert-logger`](./services/gilbert-logger/) | Lightweight async logger; zero dependencies       |
| [`@tforster/gilbert-r2`](./services/gilbert-r2/)         | Cloudflare R2 destination adapter                 |

See the [packages reference](./docs/reference/packages.md) for full API details.

## Quick Start

```shell
npm install @tforster/gilbert @tforster/gilbert-file @tforster/gilbert-fs
```

```js
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const dataAdapter = new GilbertFS({ base: "./src/data" });
const templatesAdapter = new GilbertFS({ base: "./src/templates" });

const gilbert = new Gilbert({
  data: { source: dataAdapter.read("**/*.json") },
  templates: templatesAdapter.read("**/*.hbs"),
  scripts: ["./src/scripts/main.js"],
  stylesheets: ["./src/stylesheets/main.css"],
  staticFiles: new GilbertFS({ base: "./src/files" }).read("**/*"),
});

await gilbert.compile();
await gilbert.stream.pipeTo(new GilbertFS({ base: "./dist" }).write("./dist"));
```

For a full walkthrough, see the [Getting Started tutorial](./docs/tutorials/getting-started.md).

## API

Full API documentation is in [`docs/reference/api.md`](./docs/reference/api.md).

The core entry point is `gilbert.compile()`, which returns a `ReadableStream<GilbertFile>` directly.
Content sources are not limited to the filesystem — any `ReadableStream<GilbertFile>` is a valid
input, including `gilbert-github` (GitHub API) and custom adapters (REST APIs, databases, headless
CMS systems).

## Change Log

See [CHANGELOG.md](./CHANGELOG.md) for more information.

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for more information.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

## Meta

Troy Forster — [@tforster](https://github.com/tforster) — <troy@tforster.com>

See [LICENSE](./LICENSE.txt) for more information.

<https://github.com/tforster/gilbert>
