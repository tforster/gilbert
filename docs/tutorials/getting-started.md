# Getting Started with Gilbert <!-- omit in toc -->

Learning goal: by the end of this tutorial you will have Gilbert installed, understand its default project structure, and be able to build a site both from the command line and programmatically.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Quick Start](#2-quick-start)
- [3. Project Structure](#3-project-structure)
- [4. Basic Usage](#4-basic-usage)
  - [4.1 Command Line Interface](#41-command-line-interface)
  - [4.2 Programmatic API](#42-programmatic-api)
  - [4.3 Selective Pipeline Execution](#43-selective-pipeline-execution)
  - [4.4 Data Structure](#44-data-structure)
- [What You've Learned](#what-youve-learned)
- [Next Steps](#next-steps)

## 1. Prerequisites

- Node.js 24+
- Git
- Familiarity with the command line

## 2. Quick Start

The fastest way to see Gilbert in action is through the example project in the repository:

```bash
# Clone the repository
git clone git@github.com:tforster/webproducer.git
cd webproducer

# Install dependencies
npm install

# Try the example project
cd examples/getting-started
npx gilbert

# Review the generated output
ls -la dist/
```

For your own projects, install Gilbert as a development dependency:

```bash
npm install @tforster/gilbert --save-dev
```

**Quick Example: Basic programmatic usage**

```javascript
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

// Create adapter instances
const dataAdapter = new GilbertFS({ base: "./src/data" });
const templatesAdapter = new GilbertFS({ base: "./src/templates" });
const staticAdapter = new GilbertFS({ base: "./src" });
const outputAdapter = new GilbertFS();

// Configure Gilbert with streams-first constructor
const gilbert = new Gilbert(
  {
    templates: templatesAdapter.read("**/*.hbs"),
    data: { source: dataAdapter.read("**/*.json") },
    scripts: ["./src/scripts/main.js"],
    stylesheets: ["./src/stylesheets/main.css"],
    staticFiles: staticAdapter.read("images/**/*"),
  },
  {
    debug: true,
  }
);

// compile() returns ReadableStream directly
await gilbert.compile().pipeTo(outputAdapter.write("./dist"));
```

## 3. Project Structure

Gilbert follows a conventional project structure that separates content, templates, assets, and output:

```shell
. (your project root)
├── src/                          # Source directory (configurable)
│   ├── data/
│   │   └── data.json            # Page data and content
│   ├── theme/
│   │   ├── common/              # Shared template components
│   │   └── templates/           # Page templates (.hbs files)
│   ├── scripts/
│   │   └── main.js              # JavaScript entry points
│   ├── stylesheets/
│   │   └── main.css             # CSS entry points
│   ├── images/                  # Static assets
│   └── fonts/                   # Font files
└── dist/                        # Generated output (configurable)
    ├── index.html
    ├── about.html
    ├── main.js
    ├── main.css
    └── images/
```

**Key directories:**

- **`src/data/`** — JSON files defining pages and content. The main data file uses the `uris` property to map URL paths to page data.
- **`src/theme/`** — Handlebars templates (`.hbs` files). Template names correspond to `webProducerKey` values in your data.
- **`src/scripts/`** — JavaScript entry points processed by esbuild for bundling and optimisation.
- **`src/stylesheets/`** — CSS entry points processed by PostCSS with optional autoprefixing.
- **`src/images/`, `src/fonts/`** — Static assets copied to the output directory.

## 4. Basic Usage

### 4.1 Command Line Interface

```bash
# Basic operation with defaults
npx gilbert

# View all available options
npx gilbert --help

# Customise paths and options
npx gilbert \
  --data ./content/data.json \
  --theme ./templates/**/*.hbs \
  --scripts ./js/main.js \
  --css ./styles/main.css \
  --files ./assets/**/* \
  --out ./build
```

**Common CLI options:**

| Option              | Default                      | Description                           |
| :------------------ | :--------------------------- | :------------------------------------ |
| `--data [path]`     | `./src/data/data.json`       | Path to JSON data file                |
| `--theme [glob]`    | `./src/theme/**/*.hbs`       | Glob pattern for Handlebars templates |
| `--scripts [entry]` | `./src/scripts/main.js`      | JavaScript entry points               |
| `--css [entry]`     | `./src/stylesheets/main.css` | CSS entry points                      |
| `--files [glob]`    | `./src/images/**/*`          | Static file patterns                  |
| `--out [dir]`       | `./dist`                     | Output directory                      |

### 4.2 Programmatic API

```javascript
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const dataAdapter = new GilbertFS({ base: "./src/data" });
const templatesAdapter = new GilbertFS({ base: "./src/templates" });
const staticAdapter = new GilbertFS({ base: "./src" });
const outputAdapter = new GilbertFS();

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

await gilbert.compile().pipeTo(outputAdapter.write("./dist"));
```

### 4.3 Selective Pipeline Execution

Gilbert supports selective pipeline execution for faster iteration. Omit pipelines you do not need:

```javascript
// Only templates and static files (no scripts or stylesheets)
const gilbert = new Gilbert({
  templates: templatesAdapter.read("**/*.hbs"),
  data: { source: dataAdapter.read("**/*.json") },
  staticFiles: staticAdapter.read("images/**/*"),
  // scripts and stylesheets omitted
});

// Templates only — fastest for content-only updates
const gilbert = new Gilbert({
  templates: templatesAdapter.read("**/*.hbs"),
  data: { source: dataAdapter.read("**/*.json") },
});
```

### 4.4 Data Structure

Your `data.json` defines pages using the `uris` property:

```json
{
  "uris": {
    "/index": {
      "webProducerKey": "homepage",
      "title": "Welcome",
      "content": "Welcome to our site"
    },
    "/about": {
      "webProducerKey": "page",
      "title": "About Us",
      "content": "Learn about our company"
    }
  }
}
```

The `webProducerKey` maps to template files (`homepage.hbs`, `page.hbs`) in your theme directory.

## What You've Learned

- How to install and run Gilbert from the CLI
- Gilbert's default project structure and what each directory contains
- How to use the programmatic API with adapter instances
- How to omit pipelines for faster focused builds

## Next Steps

- [Architecture](../explanation/architecture.md) — understand how Gilbert's streams-based engine works
- [Packages Reference](../reference/packages.md) — full details on every gilbert-\* package
- [API Reference](../reference/api.md) — complete API documentation
- [Set Up Local Development](../how-to/local-development.md) — configure watch mode and hot-reload

[← Back to Tutorials](./README.md)
