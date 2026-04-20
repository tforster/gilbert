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
const distDir = path.join(tmpdir(), "gilbert-stylesheets");

// Create GilbertFS adapter instance
const fsAdapter = new GilbertFS();

await describe("Gilbert Stylesheets Pipeline", { concurrency: 1 }, () => {
  const cleanDist = async () => {
    await rm(distDir, { recursive: true, force: true });
    await mkdir(distDir, { recursive: true });
  };

  test("should process stylesheets with StopTheParty app structure", async () => {
    await cleanDist();

    const stylesheetsPath = path.join(rootSrcDir, "stylesheets");
    const entryPoints = [path.join(stylesheetsPath, "main.css")];

    const gilbert = new Gilbert(
      {
        stylesheets: entryPoints,
      },
      {
        debug: true,
      }
    );

    // Compile and pipe Gilbert output to filesystem destination using adapter
    await (await gilbert.start()).pipeTo(fsAdapter.write(distDir));

    assert.ok(existsSync(distDir), "Output directory should exist");

    const files = await readdir(distDir);
    const cssFiles = files.filter((file) => file.endsWith(".css"));
    assert.ok(cssFiles.length > 0, "At least one CSS file should be generated");

    const mainCssPath = path.join(distDir, "main.css");
    assert.ok(existsSync(mainCssPath), "main.css should exist");

    const content = await readFile(mainCssPath, "utf8");
    // Check for minified CSS (no unnecessary whitespace)
    assert.ok(content.length > 0, "Generated CSS should contain content");
    // Minified CSS typically doesn't have newlines
    assert.ok(!content.includes("\n  "), "Generated CSS should be minified");
  });

  test("should support custom esbuild options", async () => {
    await cleanDist();

    const stylesheetsPath = path.join(rootSrcDir, "stylesheets");
    const entryPoints = [path.join(stylesheetsPath, "main.css")];

    const gilbert = new Gilbert(
      {
        stylesheets: entryPoints,
        stylesheetsOptions: {
          minify: false,
          sourcemap: false,
        },
      },
      {
        debug: true,
      }
    );

    // Compile and pipe Gilbert output to filesystem destination using adapter
    await (await gilbert.start()).pipeTo(fsAdapter.write(distDir));

    assert.ok(existsSync(distDir), "Output directory should exist");

    const files = await readdir(distDir);
    const cssFiles = files.filter((file) => file.endsWith(".css"));
    assert.ok(cssFiles.length > 0, "CSS files should be generated");

    // Should not have sourcemap files since sourcemap: false
    // Note: This test may see files from previous test runs, so we check the CSS content instead
    const mainCssPath = path.join(distDir, "main.css");
    assert.ok(existsSync(mainCssPath), "main.css should exist");

    const content = await readFile(mainCssPath, "utf8");

    // Verify this is the unminified version by checking for sourcemap reference
    const hasSourcemapReference = content.includes("/*# sourceMappingURL=");
    assert.strictEqual(hasSourcemapReference, false, "Unminified CSS should not reference sourcemap when disabled");

    // With minify: false, we should see readable CSS with proper formatting
    assert.ok(content.includes("\n"), "Unminified CSS should contain newlines");
    assert.ok(content.length > 0, "Generated CSS should contain content");
  });
});
