# How to Migrate to Gilbert <!-- omit in toc -->

This guide provides migration paths for teams adopting Gilbert from other static site generators or upgrading between major Gilbert versions.

## Table of Contents <!-- omit in toc -->

- [1. Upgrading from 0.9.0 to 1.0.0](#1-upgrading-from-090-to-100)
  - [1.1 New uris Property](#11-new-uris-property)
  - [1.2 webProducerKey Replaces modelName](#12-webproducerkey-replaces-modelname)
- [2. Migrating from Other Static Site Generators](#2-migrating-from-other-static-site-generators)
  - [2.1 Key Conceptual Differences](#21-key-conceptual-differences)
- [3. Migrating from Node.js Streams to Web API Streams](#3-migrating-from-nodejs-streams-to-web-api-streams)

## 1. Upgrading from 0.9.0 to 1.0.0

### 1.1 New uris Property

Pre-1.0.0 had URI keys at the top level of the data structure:

```json
{
  "/index": { "title": "Home" },
  "/about": { "title": "About" }
}
```

From 1.0.0, URI keys are nested under the `uris` property:

```json
{
  "uris": {
    "/index": { "title": "Home", "webProducerKey": "homepage" },
    "/about": { "title": "About", "webProducerKey": "page" }
  }
}
```

### 1.2 webProducerKey Replaces modelName

The `modelName` property has been renamed to `webProducerKey`.

**Before:**

```json
{ "/contact": { "modelName": "contact-page" } }
```

**After:**

```json
{ "uris": { "/contact": { "webProducerKey": "contact-page" } } }
```

`webProducerKey` now also supports path separators, so templates can be organised in subdirectories:

```json
{ "uris": { "/blog/post": { "webProducerKey": "blog/post" } } }
```

This maps to `src/theme/blog/post.hbs`.

## 2. Migrating from Other Static Site Generators

> [!NOTE]
> Detailed migration guides for Jekyll, Gatsby, Hugo, and Eleventy are planned for a future release. The section below outlines the key conceptual differences to guide your migration planning.

### 2.1 Key Conceptual Differences

| Aspect             | Traditional SSGs        | Gilbert                                                      |
| :----------------- | :---------------------- | :----------------------------------------------------------- |
| Data model         | File-per-page Markdown  | Centralised JSON data with `uris` map                        |
| Templates          | Markdown + front matter | Handlebars templates keyed by `webProducerKey`               |
| Asset pipeline     | Built-in or plugin      | esbuild (JS/CSS), pass-through (static)                      |
| Deployment context | Build-time only         | Build mode + serverless publish mode                         |
| Runtime            | Node.js                 | WinterCG-compatible (Node.js, Deno, Bun, Cloudflare Workers) |

The most significant conceptual shift is moving from **file-centric** (one Markdown file = one page) to **data-centric** (one JSON key in `uris` = one page). Gilbert does not process Markdown files natively — Markdown rendering should be done as a [data middleware](../explanation/architecture.md#3-data-middleware-system) step before template rendering.

## 3. Migrating from Node.js Streams to Web API Streams

If you are upgrading custom integrations or adapters that use the legacy Node.js streams API, see [ADR-001: Web API Streams Migration](../explanation/adr-001-web-api-streams.md) for the full rationale and migration patterns.

[← Back to How-To Guides](./README.md)
