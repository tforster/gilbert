import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readdir, readFile, rm, mkdir } from "node:fs/promises";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths
const TEST_SRC_DIR = resolve("./tests/src");
const TEMPLATES_DIR = resolve(TEST_SRC_DIR, "templates");
const DATA_DIR = resolve(TEST_SRC_DIR, "data");
const TEST_OUTPUT_DIR = resolve("./tests/dist-templates");

describe("Gilbert Template Pipeline", () => {
  test("should process templates and generate HTML files", async () => {
    // Clean output directory and ensure it exists
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with templates and data
    const params = {
      uris: GilbertFS.src("**/*.json", { base: DATA_DIR }),
      templates: GilbertFS.src("**/*.hbs", { base: TEMPLATES_DIR }),
    };

    // Compile through Gilbert
    await gilbert.compile(params);

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    // Basic verification - check if any HTML files were generated
    const files = await readdir(TEST_OUTPUT_DIR);
    const htmlFiles = files.filter((f) => f.endsWith(".html"));

    assert.ok(htmlFiles.length > 0, "Should generate at least one HTML file");
    console.log(`Generated ${htmlFiles.length} HTML files: ${htmlFiles.join(", ")}`);
  });

  test("should populate template variables with data from JSON files", async () => {
    // Clean output directory and ensure it exists
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with templates and data
    const params = {
      uris: GilbertFS.src("**/*.json", { base: DATA_DIR }),
      templates: GilbertFS.src("**/*.hbs", { base: TEMPLATES_DIR }),
    };

    // Compile through Gilbert
    await gilbert.compile(params);
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    // Test specific file: homepage
    const homepageData = JSON.parse(await readFile(resolve(DATA_DIR, "homepage.json"), "utf8"));
    const homepageOutput = await readFile(resolve(TEST_OUTPUT_DIR, "index.html"), "utf8");

    // Verify template variables were replaced with data values
    assert.ok(homepageOutput.includes(homepageData.title), `Homepage should contain title: "${homepageData.title}"`);
  });
});
