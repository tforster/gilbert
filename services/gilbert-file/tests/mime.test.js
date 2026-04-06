// mime.test.js — Unit tests for the getMimeType utility function

import { describe, it } from "node:test";
import assert from "node:assert";

import getMimeType from "../lib/mime.js";

describe("getMimeType", { concurrency: 1 }, () => {
  it("should return the correct type for common web extensions", () => {
    assert.strictEqual(getMimeType(".html"), "text/html");
    assert.strictEqual(getMimeType(".css"), "text/css");
    assert.strictEqual(getMimeType(".js"), "text/javascript");
    assert.strictEqual(getMimeType(".json"), "application/json");
    assert.strictEqual(getMimeType(".xml"), "text/xml");
  });

  it("should accept extensions without a leading dot", () => {
    assert.strictEqual(getMimeType("html"), "text/html");
    assert.strictEqual(getMimeType("png"), "image/png");
  });

  it("should return image MIME types for common image extensions", () => {
    assert.strictEqual(getMimeType(".png"), "image/png");
    assert.strictEqual(getMimeType(".jpg"), "image/jpeg");
    assert.strictEqual(getMimeType(".jpeg"), "image/jpeg");
    assert.strictEqual(getMimeType(".gif"), "image/gif");
    assert.strictEqual(getMimeType(".svg"), "image/svg+xml");
    assert.strictEqual(getMimeType(".webp"), "image/webp");
    assert.strictEqual(getMimeType(".avif"), "image/avif");
  });

  it("should return font MIME types", () => {
    assert.strictEqual(getMimeType(".woff"), "font/woff");
    assert.strictEqual(getMimeType(".woff2"), "font/woff2");
    assert.strictEqual(getMimeType(".ttf"), "font/ttf");
  });

  it("should return the Handlebars template MIME type", () => {
    assert.strictEqual(getMimeType(".hbs"), "text/x-handlebars-template");
  });

  it("should return application/octet-stream for unknown extensions", () => {
    // .notarealext is not in any MIME database
    assert.strictEqual(getMimeType(".notarealext"), "application/octet-stream");
    assert.strictEqual(getMimeType(".unknown"), "application/octet-stream");
  });

  it("should return application/octet-stream for an empty string", () => {
    assert.strictEqual(getMimeType(""), "application/octet-stream");
  });

  it("should return application/wasm for .wasm", () => {
    assert.strictEqual(getMimeType(".wasm"), "application/wasm");
  });

  it("should return text/markdown for .md", () => {
    assert.strictEqual(getMimeType(".md"), "text/markdown");
  });
});
