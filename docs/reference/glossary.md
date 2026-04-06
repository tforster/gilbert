# Glossary <!-- omit in toc -->

Definitions for terms used throughout the Gilbert documentation.

## Table of Contents <!-- omit in toc -->

- [1. Terms](#1-terms)

## 1. Terms

**Data Source**
An object or configuration that provides template context data from files, APIs, or other sources. Data sources are consumed by the TemplatePipeline as `ReadableStream<GilbertFile>`.

**GilbertFile**
A virtual file object that flows through Gilbert pipelines, containing path, content, and metadata. Analogous to a Vinyl file but implemented as a runtime-agnostic plain JavaScript class. See [GilbertFile API](./api.md#2-gilbertfile).

**Gilbert Pipeline**
A stream-based processing system that transforms source files into output files through specialised transformations. Gilbert has four built-in pipelines: Template, Scripts, Stylesheets, and Static Files.

**Middleware**
An async function that receives the complete array of data `GilbertFile` objects and returns a transformed array. Used for cross-file operations such as pagination, global navigation data, or SEO metadata generation.

**Mind's DOM**
Gilbert's template philosophy: developers must be able to easily visualise and mentally render templates without cognitive overhead. Achieved by restricting Handlebars usage to simple token replacement, `{{#if}}`, and `{{#each}}`.

**Pipeline**
An individual processing stage within Gilbert that handles a specific file type (templates, scripts, stylesheets, or static files). Each pipeline is a Web API stream composition.

**ReadableStream**
A Web API standard stream interface for reading data sequentially. All Gilbert adapter `read()` methods return `ReadableStream<GilbertFile>`.

**Stream Composition**
The pattern of connecting multiple TransformStreams to create complex, reusable processing workflows. Gilbert encourages stream composition over monolithic processing.

**Template Engine**
The software component that combines Handlebars templates with data to generate output files. Gilbert currently supports Handlebars (`.hbs`) templates.

**TransformStream**
A Web API stream that reads from one end and writes to the other, transforming data as it passes through. Gilbert pipelines and middleware implement the TransformStream interface.

**URI key**
A path-like string (e.g., `/about`) used as a key in the `uris` object of the data file. The URI key determines the output file path (`about.html`) and is matched with a template via `webProducerKey`.

**Virtual File System**
Gilbert's use of in-memory GilbertFile objects instead of direct filesystem operations. This enables processing content from any source (filesystem, APIs, databases) through a consistent interface.

**Web API Streams**
The standard streaming interface (ReadableStream, WritableStream, TransformStream) defined by the WHATWG Streams specification. Gilbert's engine uses only Web API streams to ensure compatibility across Node.js, Bun, Deno, Cloudflare Workers, and other WinterCG-compatible runtimes.

**webProducerKey**
A property in each data record that maps to the corresponding Handlebars template filename. For example, `"webProducerKey": "homepage"` causes Gilbert to render the data using `homepage.hbs`.

**WinterCG**
Web-interoperable Runtimes Community Group — the standards body that defines the minimum Web API surface that JavaScript server runtimes must implement. Gilbert targets WinterCG compatibility to ensure broad runtime portability.

**WritableStream**
A Web API standard stream interface for writing data. All Gilbert adapter `write()` methods return `WritableStream<GilbertFile>`.

[← Back to Reference](./README.md)
