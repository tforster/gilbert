# How to Set Up Local Development <!-- omit in toc -->

This guide describes how to configure Gilbert for local development, including watch mode and hot-reload patterns.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Project Setup](#2-project-setup)
- [3. Development Build Script](#3-development-build-script)
- [4. Watch Mode](#4-watch-mode)
- [5. Verification](#5-verification)
- [6. Troubleshooting](#6-troubleshooting)

## 1. Prerequisites

- Node.js 18+ (or Bun 1.0+)
- Gilbert installed as a dev dependency: `npm install @tforster/gilbert --save-dev`
- A project following the [default directory structure](../tutorials/getting-started.md#3-project-structure)

## 2. Project Setup

```shell
my-project/
├── src/
│   ├── templates/
│   ├── scripts/
│   ├── stylesheets/
│   └── static/
├── data/
│   └── data.json
├── dist/
└── package.json
```

## 3. Development Build Script

Create a build script (`build.js`) at your project root:

```javascript
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const dataAdapter = new GilbertFS({ base: "./src/data" });
const templatesAdapter = new GilbertFS({ base: "./src/templates" });
const staticAdapter = new GilbertFS({ base: "./src" });
const outputAdapter = new GilbertFS();

/**
 * Builds the site using all four pipelines.
 */
const buildSite = async () => {
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

  await gilbert.start().pipeTo(outputAdapter.write("./dist"));
  console.log("Build complete.");
};

buildSite();
```

Add to `package.json`:

```json
{
  "scripts": {
    "build": "node build.js"
  }
}
```

## 4. Watch Mode

Use `chokidar` to trigger incremental rebuilds when source files change:

```bash
npm install chokidar --save-dev
```

```javascript
import chokidar from "chokidar";

const watcher = chokidar.watch("./src", {
  ignored: /node_modules/,
  persistent: true,
});

watcher.on("change", async (path) => {
  console.log(`File changed: ${path}`);
  await buildSite();
});

// Initial build
await buildSite();
console.log("Watching for changes…");
```

## 5. Verification

After running `npm run build`, confirm the generated output:

```bash
ls -la dist/
# Expected: index.html, about.html, main.js, main.css, images/
```

Serve the output locally to test in a browser:

```bash
npx serve dist
```

## 6. Troubleshooting

**`ReadableStream is locked` error** — streams cannot be reused. Create new adapter instances for each build invocation rather than reusing the same stream objects.

**Empty `dist/` directory** — check that your data file's `uris` property references template names that exist in `src/templates/`. Enable `debug: true` in the Gilbert constructor to see which files are being processed.

**esbuild cannot find node_modules** — esbuild requires full filesystem access. Ensure you are running the build from the project root, not inside a Docker container with limited filesystem mounts.

[← Back to How-To Guides](./README.md)
