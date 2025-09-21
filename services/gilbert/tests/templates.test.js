import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readdir, readFile, rm } from "node:fs/promises";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths
const srcDir = resolve("./tests/src");
const templatesDir = resolve(srcDir, "templates");
const dataDir = resolve(srcDir, "data");
const distDir = resolve("./tests/dist");

describe("Gilbert Template Pipeline", () => {
  test("should process templates and generate HTML files", async () => {
    // Clean output directory and ensure it exists
    await rm(distDir, { recursive: true, force: true });

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with templates and data
    const params = {
      uris: GilbertFS.src("**/*.json", { base: dataDir }),
      templates: GilbertFS.src("**/*.hbs", { base: templatesDir }),
    };

    // Compile through Gilbert
    await gilbert.compile(params);

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(distDir));

    // Basic verification - check if any HTML files were generated
    const files = await readdir(distDir);
    const htmlFiles = files.filter((f) => f.endsWith(".html"));

    assert.ok(htmlFiles.length > 0, "Should generate at least one HTML file");
    console.log(`Generated ${htmlFiles.length} HTML files: ${htmlFiles.join(", ")}`);
  });

  test("should populate template variables with data from JSON files", async () => {
    // Clean output directory and ensure it exists
    await rm(distDir, { recursive: true, force: true });

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with templates and data
    const params = {
      uris: GilbertFS.src("**/*.json", { base: dataDir }),
      templates: GilbertFS.src("**/*.hbs", { base: templatesDir }),
    };

    // Compile through Gilbert
    await gilbert.compile(params);
    await gilbert.stream.pipeTo(GilbertFS.dest(distDir));

    // Test specific file: homepage
    const homepageData = JSON.parse(await readFile(resolve(dataDir, "homepage.json"), "utf8"));
    const homepageOutput = await readFile(resolve(distDir, "index.html"), "utf8");

    // Verify template variables were replaced with data values
    assert.ok(homepageOutput.includes(homepageData.title), `Homepage should contain title: "${homepageData.title}"`);
  });
});
