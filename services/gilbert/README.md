# Gilbert Core Engine

Gilbert is a **streams-based, data-driven static site generator** designed for exceptional performance in modern deployment environments. The core engine provides the foundation for processing content streams through specialized pipelines to generate HTML, CSS, and JavaScript with remarkable speed and efficiency.

## Table of Contents

- [Gilbert Core Engine](#gilbert-core-engine)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
    - [Key Features](#key-features)
  - [Prerequisites](#prerequisites)
  - [Usage](#usage)
  - [Documentation](#documentation)

## Overview

Gilbert's core engine transforms data streams through specialized pipelines, targeting **200+ pages per second** generation with minimal memory footprint. Unlike traditional file-based generators, Gilbert is:

- **Data-driven**: Processes streams of data rather than filesystem trees
- **Runtime-agnostic**: Uses Web API streams for compatibility across Node.js, Bun, Deno, and Cloudflare Workers
- **Performance-first**: Optimized for high-speed processing with minimal memory requirements
- **Modular**: Core engine as a reusable module that accepts and returns streams

### Key Features

- **Stream-based Processing**: Web API streams (ReadableStream, TransformStream, WritableStream) for runtime portability
- **Pipeline Architecture**: Specialized pipelines for templates, scripts, stylesheets, and static files
- **Virtual File System**: GilbertFile objects for in-memory processing and testing
- **Selective Execution**: Build vs. Publish modes for different deployment scenarios
- **Template Philosophy**: "Mind's DOM" - simple, visualizable templates using minimal Handlebars logic

## Prerequisites

Requirements for building, testing, and deploying Gilbert projects. Note the versions were current at the time of writing. Later versions should work but YMMV.

- **[Node.js 18.0+](https://nodejs.org/)**: JavaScript runtime environment. Gilbert uses Web API streams available in Node.js 18+.
- **[npm 9.0+](https://www.npmjs.com/)**: Package manager for dependency installation and script execution.
- **[Git 2.34+](https://git-scm.com/)**: Version control system for source code management.

## Usage

1. Clone the Gilbert monorepo:

   ```bash
   git clone git@github.com:tforster/webproducer.git
   cd webproducer
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Navigate to the gilbert service:

   ```bash
   cd services/gilbert
   ```

4. Link for local development:
   ```bash
   npm link
   ```

## Documentation

For comprehensive documentation, see the [Gilbert Developer Guide](../../docs/developer-guide-working.md), which covers:

- **Getting Started**: Quick setup and basic usage patterns
- **Core Architecture**: Detailed explanation of stream processing and pipeline architecture
- **API Reference**: Complete API documentation for all packages
- **Integration Patterns**: Local development, serverless, CI/CD, and CMS workflows
- **Migration Guides**: Moving from other static site generators
- **Development Workflows**: Testing, debugging, and performance optimization
- **Deployment Guide**: Static hosting, cloud platforms, and containerized deployment
- **Advanced Topics**: Custom pipelines, stream composition, and plugin development
