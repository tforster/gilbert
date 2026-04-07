/**
 * Full Integration Test - Gilbert as intended
 * Tests Gilbert processing ALL file types together in one pipeline
 */

import { test, before } from "node:test";
import assert from "node:assert";
import { rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";

import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

const testDir = new URL(".", import.meta.url).pathname;
const srcDir = resolve(testDir, "../../../tests/src");
const distDir = join(tmpdir(), "gilbert-full");

// Create GilbertFS adapter instances
const dataAdapter = new GilbertFS({ base: resolve(srcDir, "data") });
const templatesAdapter = new GilbertFS({ base: resolve(srcDir, "templates") });
const staticAdapter = new GilbertFS({ base: srcDir });
const outputAdapter = new GilbertFS();

before(async () => {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
});

test("Gilbert full website build", async () => {
  assert.ok(existsSync(srcDir), "Source directory should exist");

  // Build entire website with Gilbert as intended - like performance test
  const gilbert = new Gilbert(
    {
      templates: templatesAdapter.read("**/*.hbs"),
      data: {
        source: dataAdapter.read("**/*.json"),
      },
      scripts: [resolve(srcDir, "scripts", "main.js")],
      stylesheets: [resolve(srcDir, "stylesheets", "main.css")],
      staticFiles: staticAdapter.read("files/**/*"),
    },
    {
      debug: true,
    }
  );

  // Compile and execute the build using adapter
  await (await gilbert.compile()).pipeTo(outputAdapter.write(distDir));

  // Verify website was built
  assert.ok(existsSync(distDir), "Website should be built");
  assert.ok(existsSync(join(distDir, "files")), "Static files should exist");
});
