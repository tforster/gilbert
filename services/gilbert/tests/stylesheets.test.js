import { test, describe } from "node:test";
import assert from "node:assert";
import { existsSync } from "node:fs";
import { readdir, readFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe("Gilbert Stylesheets Pipeline", () => {
  const cleanDist = async () => {
    const distPath = path.join(__dirname, "dist");
    try {
      await rm(distPath, { recursive: true, force: true });
      await mkdir(distPath, { recursive: true });
    } catch {
      await mkdir(distPath, { recursive: true });
    }
  };

  test("should process stylesheets with StopTheParty app structure", async () => {
    await cleanDist();

    const gilbert = new Gilbert({ debug: true });
    const stylesheetsPath = path.join(__dirname, "src", "stylesheets");
    const entryPoints = [path.join(stylesheetsPath, "main.css")];

    // Compile through Gilbert
    await gilbert.compile({
      stylesheets: entryPoints,
    });

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(path.join(__dirname, "dist")));

    const outputDir = path.join(__dirname, "dist");
    assert.ok(existsSync(outputDir), "Output directory should exist");

    const files = await readdir(outputDir);
    const cssFiles = files.filter((file) => file.endsWith(".css"));
    assert.ok(cssFiles.length > 0, "At least one CSS file should be generated");

    const mainCssPath = path.join(outputDir, "main.css");
    assert.ok(existsSync(mainCssPath), "main.css should exist");

    const content = await readFile(mainCssPath, "utf8");
    // Check for minified CSS (no unnecessary whitespace)
    assert.ok(content.length > 0, "Generated CSS should contain content");
    // Minified CSS typically doesn't have newlines
    assert.ok(!content.includes("\n  "), "Generated CSS should be minified");
  });

  test("should support custom esbuild options", async () => {
    await cleanDist();

    const gilbert = new Gilbert({ debug: true });
    const stylesheetsPath = path.join(__dirname, "src", "stylesheets");
    const entryPoints = [path.join(stylesheetsPath, "main.css")];

    // Compile with custom esbuild options - disable minification
    await gilbert.compile({
      stylesheets: entryPoints,
      stylesheetsOptions: {
        minify: false,
        sourcemap: false,
      },
    });

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(path.join(__dirname, "dist")));

    const outputDir = path.join(__dirname, "dist");
    assert.ok(existsSync(outputDir), "Output directory should exist");

    const files = await readdir(outputDir);
    const cssFiles = files.filter((file) => file.endsWith(".css"));
    assert.ok(cssFiles.length > 0, "CSS files should be generated");

    // Should not have sourcemap files since sourcemap: false
    const mapFiles = files.filter((file) => file.endsWith(".css.map"));
    assert.strictEqual(mapFiles.length, 0, "No sourcemap files should be generated when disabled");

    const mainCssPath = path.join(outputDir, "main.css");
    assert.ok(existsSync(mainCssPath), "main.css should exist");

    const content = await readFile(mainCssPath, "utf8");
    // With minify: false, we should see readable CSS with proper formatting
    assert.ok(content.includes("\n"), "Unminified CSS should contain newlines");
    assert.ok(content.length > 0, "Generated CSS should contain content");
  });
});
