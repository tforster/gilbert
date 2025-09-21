/**
 * Full Integration Test - Gilbert as intended
 * Tests Gilbert processing ALL file types together in one pipeline
 */

import { test, before } from "node:test";
import assert from "node:assert";
import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

const testDir = new URL(".", import.meta.url).pathname;
const srcDir = join(testDir, "src");
const distDir = join(testDir, "dist");

before(async () => {
  if (existsSync(distDir)) {
    await rm(distDir, { recursive: true, force: true });
  }
});

test("Gilbert full website build", async () => {
  assert.ok(existsSync(srcDir), "Source directory should exist");

  // Build entire website with Gilbert as intended - like performance test
  const config = {
    source: srcDir,
    destination: distDir,
  };

  const gilbert = new Gilbert(config);

  // Compile all content together
  await gilbert.compile({
    uris: GilbertFS.src("**/*.json", { base: resolve(srcDir, "data") }),
    templates: GilbertFS.src("**/*.hbs", { base: resolve(srcDir, "templates") }),
    scripts: [resolve(srcDir, "scripts", "main.js")],
    stylesheets: [resolve(srcDir, "stylesheets", "main.css")],
    staticFiles: GilbertFS.src("files/**/*", { base: srcDir }),
  });

  // Execute the build
  await gilbert.stream.pipeTo(GilbertFS.dest(distDir));

  // Verify website was built
  assert.ok(existsSync(distDir), "Website should be built");
  assert.ok(existsSync(join(distDir, "files")), "Static files should exist");
});
