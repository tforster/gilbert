import { test, describe } from "node:test";
import assert from "node:assert";
import { existsSync } from "node:fs";
import { readdir, readFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

describe("Gilbert Scripts Pipeline", () => {
  const cleanDist = async () => {
    const distPath = path.join(__dirname, "dist");
    try {
      await rm(distPath, { recursive: true, force: true });
      await mkdir(distPath, { recursive: true });
    } catch {
      await mkdir(distPath, { recursive: true });
    }
  };

  test("should process scripts with StopTheParty app structure", async () => {
    await cleanDist();

    const gilbert = new Gilbert({ debug: true });
    const scriptsPath = path.join(__dirname, "app", "scripts");
    const entryPoints = [path.join(scriptsPath, "main.js")];

    await gilbert.compile({
      scripts: entryPoints,
    });

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(path.join(__dirname, "dist", "test1")));

    const outputDir = path.join(__dirname, "dist", "test1");
    assert.ok(existsSync(outputDir), "Output directory should exist");

    const files = await readdir(outputDir);
    const jsFiles = files.filter((file) => file.endsWith(".js"));
    assert.ok(jsFiles.length > 0, "At least one JavaScript file should be generated");

    const mainJsPath = path.join(outputDir, "main.js");
    assert.ok(existsSync(mainJsPath), "main.js should exist");

    const content = await readFile(mainJsPath, "utf8");
    assert.ok(content.includes("DOMContentLoaded"), "Generated script should contain DOMContentLoaded event listener");
  });

  test("should support custom esbuild options", async () => {
    await cleanDist();

    const gilbert = new Gilbert({ debug: true });
    const scriptsPath = path.join(__dirname, "app", "scripts");
    const entryPoints = [path.join(scriptsPath, "main.js")];

    // Compile with custom esbuild options - disable minification
    await gilbert.compile({
      scripts: entryPoints,
      scriptsOptions: {
        minify: false,
        sourcemap: false,
      },
    });

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(path.join(__dirname, "dist", "test2")));

    const outputDir = path.join(__dirname, "dist", "test2");
    assert.ok(existsSync(outputDir), "Output directory should exist");

    const files = await readdir(outputDir);
    const jsFiles = files.filter((file) => file.endsWith(".js"));
    assert.ok(jsFiles.length > 0, "At least one JavaScript file should be generated");

    // Should not have sourcemap files since sourcemap: false
    const mapFiles = files.filter((file) => file.endsWith(".js.map"));
    assert.strictEqual(mapFiles.length, 0, "No sourcemap files should be generated when disabled");

    const mainJsPath = path.join(outputDir, "main.js");
    assert.ok(existsSync(mainJsPath), "main.js should exist");

    const content = await readFile(mainJsPath, "utf8");
    // With minify: false, we should see readable code with proper formatting
    assert.ok(content.includes("new Main()"), "Unminified script should contain 'new Main()' instantiation");
    assert.ok(content.includes("DOMContentLoaded"), "Generated script should contain DOMContentLoaded event listener");
    // Check for unminified formatting (newlines and spaces)
    assert.ok(content.includes("\n"), "Unminified code should contain newlines");
    // Check for readable method names that wouldn't be present in minified code
    assert.ok(content.includes("initialize"), "Unminified code should contain readable method names");
  });
});
