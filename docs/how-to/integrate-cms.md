# How to Integrate a Headless CMS <!-- omit in toc -->

This guide shows how to connect Gilbert to headless CMS platforms as data sources, with examples for Contentful and Strapi.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Contentful Integration](#2-contentful-integration)
- [3. Strapi Integration](#3-strapi-integration)
- [4. Verification](#4-verification)
- [5. Troubleshooting](#5-troubleshooting)

## 1. Prerequisites

- A working Gilbert project (see [Getting Started](../tutorials/getting-started.md))
- API credentials for your CMS platform
- Understanding of Gilbert's [data middleware system](../explanation/architecture.md#3-data-middleware-system) if you need cross-file transformations

## 2. Contentful Integration

```bash
npm install contentful
```

```javascript
// contentful-source.js
import { createClient } from "contentful";
import GilbertFile from "@tforster/gilbert-file";

class ContentfulDataSource {
  constructor(config) {
    this.client = createClient({
      space: config.spaceId,
      accessToken: config.accessToken,
    });
  }

  /**
   * Fetches all content entries and returns a ReadableStream of GilbertFile objects.
   * @returns {ReadableStream}
   */
  read() {
    return new ReadableStream({
      start: async (controller) => {
        const entries = await this.client.getEntries();

        const data = {
          uris: {},
          posts: entries.items.filter((item) => item.sys.contentType.sys.id === "blogPost"),
          pages: entries.items.filter((item) => item.sys.contentType.sys.id === "page"),
          config: {
            siteTitle: "My Site",
            buildTime: new Date().toISOString(),
          },
        };

        // Build uris from pages
        for (const page of data.pages) {
          data.uris[`/${page.fields.slug}`] = {
            webProducerKey: page.fields.template ?? "page",
            ...page.fields,
          };
        }

        const file = new GilbertFile({
          path: "/data/data.json",
          contents: Buffer.from(JSON.stringify(data, null, 2)),
          cwd: "/",
        });

        controller.enqueue(file);
        controller.close();
      },
    });
  }
}

// Usage
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const contentful = new ContentfulDataSource({
  spaceId: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

const templatesAdapter = new GilbertFS({ base: "./src/templates" });
const outputAdapter = new GilbertFS();

const gilbert = new Gilbert({
  templates: templatesAdapter.read("**/*.hbs"),
  data: { source: contentful.read() },
});

await gilbert.start().pipeTo(outputAdapter.write("./dist"));
```

**Custom Handlebars helpers** for Contentful rich text or date formatting:

```javascript
import Handlebars from "handlebars";

Handlebars.registerHelper("formatDate", (date) => new Date(date).toLocaleDateString("en-CA"));
Handlebars.registerHelper("excerpt", (text, length = 150) => text.substring(0, length) + "…");
```

## 3. Strapi Integration

```javascript
// strapi-source.js
import GilbertFile from "@tforster/gilbert-file";

class StrapiDataSource {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Fetches content from Strapi and returns a ReadableStream of GilbertFile objects.
   * @returns {ReadableStream}
   */
  read() {
    return new ReadableStream({
      start: async (controller) => {
        const headers = {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        };

        const [articles, categories] = await Promise.all([
          fetch(`${this.baseUrl}/api/articles?populate=*`, { headers }).then((r) => r.json()),
          fetch(`${this.baseUrl}/api/categories`, { headers }).then((r) => r.json()),
        ]);

        const data = {
          uris: {},
          articles: articles.data,
          categories: categories.data,
          navigation: categories.data.map((cat) => ({
            title: cat.attributes.name,
            url: `/category/${cat.attributes.slug}/`,
          })),
        };

        // Map articles to uris
        for (const article of articles.data) {
          data.uris[`/articles/${article.attributes.slug}`] = {
            webProducerKey: "article",
            ...article.attributes,
          };
        }

        const file = new GilbertFile({
          path: "/data/data.json",
          contents: Buffer.from(JSON.stringify(data, null, 2)),
          cwd: "/",
        });

        controller.enqueue(file);
        controller.close();
      },
    });
  }
}
```

## 4. Verification

After running your build:

1. Check `dist/` for generated HTML files corresponding to your CMS content slugs
2. Verify the page titles and content match what is in the CMS
3. Test with `GILBERT_DEBUG=true` to see which templates are being selected for each data record

## 5. Troubleshooting

**No pages generated** — confirm your data adapter returns a `ReadableStream` emitting at least one `GilbertFile` whose contents is valid JSON with a `uris` property.

**Template not found for `webProducerKey`** — check that the value of `webProducerKey` in your data exactly matches the template filename (without `.hbs` extension) in your templates directory.

**CMS API rate limit exceeded** — implement local caching of the CMS response to a JSON file during development, switching to the live API only for production builds.

[← Back to How-To Guides](./README.md)
