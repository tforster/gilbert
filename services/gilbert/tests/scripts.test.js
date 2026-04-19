import { test, describe } from "node:test";
import assert from "node:assert";
import { existsSync } from "node:fs";
import { readdir, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootSrcDir = path.resolve(__dirname, "../../../tests/src");
const distDir = path.join(tmpdir(), "gilbert-scripts");

// Create GilbertFS adapter instance
const fsAdapter = new GilbertFS();

await describe("Gilbert Scripts Pipeline", { concurrency: 1 }, () => {
  const cleanDist = async () => {
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });
  };

  test("should process scripts with StopTheParty app structure", async () => {
    await cleanDist();

    const scriptsPath = path.join(rootSrcDir, "scripts");
    const entryPoints = [path.join(scriptsPath, "main.js")];

    const gilbert = new Gilbert(
      {
        scripts: entryPoints,
      },
      {
        debug: true,
      }
    );

    // Compile and pipe Gilbert output to filesystem destination using adapter
    await (await gilbert.compile()).pipeTo(fsAdapter.write(distDir));

    assert.ok(existsSync(distDir), "Output directory should exist");

    const files = await readdir(distDir);
    const jsFiles = files.filter((file) => file.endsWith(".js"));
    assert.ok(jsFiles.length > 0, "At least one JavaScript file should be generated");

    const mainJsPath = path.join(distDir, "main.js");
    assert.ok(existsSync(mainJsPath), "main.js should exist");

    const content = await readFile(mainJsPath, "utf8");
    assert.ok(content.includes("DOMContentLoaded"), "Generated script should contain DOMContentLoaded event listener");
  });

  test("should support custom esbuild options", async () => {
    await cleanDist();

    const scriptsPath = path.join(rootSrcDir, "scripts");
    const entryPoints = [path.join(scriptsPath, "main.js")];

    const gilbert = new Gilbert(
      {
        scripts: entryPoints,
        scriptsOptions: {
          minify: false,
          sourcemap: false,
        },
      },
      {
        debug: true,
      }
    );

    // Compile and pipe Gilbert output to filesystem destination using adapter
    await (await gilbert.compile()).pipeTo(fsAdapter.write(distDir));

    assert.ok(existsSync(distDir), "Output directory should exist");

    // Get files immediately after this specific test run
    const files = await readdir(distDir);
    const jsFiles = files.filter((file) => file.endsWith(".js"));
    assert.ok(jsFiles.length > 0, "At least one JavaScript file should be generated");

    // Should not have sourcemap files since sourcemap: false
    // Note: This test may see files from previous test runs, so we check the JS content instead
    const mainJsPath = path.join(distDir, "main.js");
    const content = await readFile(mainJsPath, "utf8");

    // Verify this is the unminified version by checking for sourcemap reference
    const hasSourcemapReference = content.includes("//# sourceMappingURL=");
    assert.strictEqual(hasSourcemapReference, false, "Unminified output should not reference sourcemap when disabled");

    assert.ok(existsSync(mainJsPath), "main.js should exist");

    // With minify: false, we should see readable code with proper formatting
    assert.ok(content.includes("new Main()"), "Unminified script should contain 'new Main()' instantiation");
    assert.ok(content.includes("DOMContentLoaded"), "Generated script should contain DOMContentLoaded event listener");
    // Check for unminified formatting (newlines and spaces)
    assert.ok(content.includes("\n"), "Unminified code should contain newlines");
    // Check for readable method names that wouldn't be present in minified code
    assert.ok(content.includes("initialize"), "Unminified code should contain readable method names");
  });
});
