# How to Deploy Your Site <!-- omit in toc -->

This guide covers deploying Gilbert-generated sites to static hosting platforms, cloud storage with CDN, serverless functions, and containers.

> [!TIP]
> For a complete end-to-end Cloudflare Workers example, see [Deploy to Cloudflare](./deploy-to-cloudflare.md).

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Static Hosting Platforms](#2-static-hosting-platforms)
  - [2.1 Netlify](#21-netlify)
  - [2.2 Vercel](#22-vercel)
  - [2.3 GitHub Pages](#23-github-pages)
- [3. Cloud Platform Deployment](#3-cloud-platform-deployment)
  - [3.1 AWS S3 + CloudFront](#31-aws-s3--cloudfront)
  - [3.2 Google Cloud Storage](#32-google-cloud-storage)
- [4. Serverless Deployment](#4-serverless-deployment)
  - [4.1 Netlify Functions](#41-netlify-functions)
  - [4.2 Cloudflare Workers](#42-cloudflare-workers)
- [5. Container Deployment](#5-container-deployment)
- [6. CI/CD Integration](#6-cicd-integration)

## 1. Prerequisites

- A working Gilbert project with a `build` script (see [Set Up Local Development](./local-development.md))
- Project-specific cloud provider credentials configured as environment variables

## 2. Static Hosting Platforms

### 2.1 Netlify

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

```javascript
// build.js — environment-aware Netlify build
import Gilbert from "@tforster/gilbert";
import GilbertFS from "@tforster/gilbert-fs";

const isProd = process.env.CONTEXT === "production";

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
  { debug: !isProd }
);

await gilbert.compile().pipeTo(outputAdapter.write("./dist"));
```

### 2.2 Vercel

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "devCommand": "npm run develop",
  "framework": null
}
```

### 2.3 GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Pages
        uses: actions/configure-pages@v3

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: "./dist"

      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v2
```

## 3. Cloud Platform Deployment

### 3.1 AWS S3 + CloudFront

```javascript
// deploy-aws.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import mime from "mime-types";

class AWSDeployer {
  constructor(config) {
    this.s3 = new S3Client({ region: config.region });
    this.cloudfront = new CloudFrontClient({ region: config.region });
    this.bucket = config.bucket;
    this.distributionId = config.distributionId;
  }

  async deploy(buildDir) {
    const files = await this.getFiles(buildDir);
    for (const file of files) {
      await this.uploadFile(file);
    }
    await this.invalidateCache();
  }

  async uploadFile(file) {
    const content = await readFile(file.path);
    const contentType = mime.lookup(file.key) || "application/octet-stream";

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: file.key,
        Body: content,
        ContentType: contentType,
        CacheControl: file.key.includes("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
      })
    );
  }

  async invalidateCache() {
    await this.cloudfront.send(
      new CreateInvalidationCommand({
        DistributionId: this.distributionId,
        InvalidationBatch: {
          Paths: { Quantity: 1, Items: ["/*"] },
          CallerReference: Date.now().toString(),
        },
      })
    );
  }
}
```

### 3.2 Google Cloud Storage

```javascript
// deploy-gcp.js
import { Storage } from "@google-cloud/storage";
import { readFile } from "fs/promises";
import mime from "mime-types";

class GCPDeployer {
  constructor(config) {
    this.storage = new Storage({ projectId: config.projectId, keyFilename: config.keyFile });
    this.bucket = this.storage.bucket(config.bucketName);
  }

  async deploy(buildDir) {
    const files = await this.getFiles(buildDir);
    for (const file of files) {
      const fileObj = this.bucket.file(file.key);
      const content = await readFile(file.path);
      await fileObj.save(content, {
        metadata: {
          contentType: mime.lookup(file.key) || "application/octet-stream",
          cacheControl: "public, max-age=3600",
        },
      });
    }
  }
}
```

## 4. Serverless Deployment

Gilbert's [Build vs. Publish Modes](../explanation/architecture.md#6-build-vs-publish-modes) are especially relevant in serverless contexts: omit the `scripts` and `stylesheets` pipelines (pre-built assets) and use only the template and static-files pipelines for content-only publishes.

### 4.1 Netlify Functions

```javascript
// netlify/functions/generate-site.js
import Gilbert from "@tforster/gilbert";
import GilbertGitHub from "@tforster/gilbert-github";

export const handler = async (event) => {
  try {
    const { repo, ref = "main" } = JSON.parse(event.body);

    const contentAdapter = new GilbertGitHub({ repo, branch: ref, token: process.env.GITHUB_TOKEN });
    const outputAdapter = new GilbertFS();

    const gilbert = new Gilbert({
      templates: contentAdapter.read("templates/**/*.hbs"),
      data: { source: contentAdapter.read("data/**/*.json") },
    });

    await gilbert.compile().pipeTo(outputAdapter.write("/tmp/dist"));

    return { statusCode: 200, body: JSON.stringify({ message: "Site generated successfully" }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
```

### 4.2 Cloudflare Workers

See [Deploy to Cloudflare](./deploy-to-cloudflare.md) for a complete example.

## 5. Container Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S gilbert -u 1001
USER gilbert

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

```javascript
// server.js — HTTP server wrapping Gilbert
import express from "express";
import Gilbert from "@tforster/gilbert";
import GilbertGitHub from "@tforster/gilbert-github";
import GilbertFS from "@tforster/gilbert-fs";

const app = express();
app.use(express.json());

app.post("/generate", async (req, res) => {
  try {
    const { repo } = req.body;
    const contentAdapter = new GilbertGitHub({ repo, token: process.env.GITHUB_TOKEN });
    const outputAdapter = new GilbertFS();

    const gilbert = new Gilbert({
      templates: contentAdapter.read("templates/**/*.hbs"),
      data: { source: contentAdapter.read("data/**/*.json") },
    });

    await gilbert.compile().pipeTo(outputAdapter.write("/tmp/dist"));
    res.json({ message: "Generated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString() }));

app.listen(process.env.PORT || 3000);
```

## 6. CI/CD Integration

```yaml
# .github/workflows/build-deploy.yml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Deploy to S3
        if: github.ref == 'refs/heads/main'
        run: aws s3 sync ./dist s3://${{ secrets.S3_BUCKET }} --delete
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

[← Back to How-To Guides](./README.md)
