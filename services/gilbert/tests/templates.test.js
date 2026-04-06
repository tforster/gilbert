import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile, rm } from "node:fs/promises";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = resolve(__dirname, "../../../tests/src");
const templatesDir = resolve(srcDir, "templates");
const dataDir = resolve(srcDir, "data");
const distDir = resolve(__dirname, "dist");

// Create GilbertFS adapter instances for testing
const dataAdapter = new GilbertFS({ base: dataDir });
const templatesAdapter = new GilbertFS({ base: templatesDir });
const outputAdapter = new GilbertFS(); // No base, use direct path

await describe("Gilbert Template Pipeline", { concurrency: 1 }, () => {
  test("should process templates and generate HTML files", async () => {
    // Clean output directory and ensure it exists
    await rm(distDir, { recursive: true, force: true });

    // Create Gilbert instance with new API signature
    const gilbert = new Gilbert(
      {
        templates: templatesAdapter.read("**/*.hbs"),
        data: {
          source: dataAdapter.read("**/*.json"),
        },
      },
      {
        debug: true,
      }
    );

    // Compile and pipe Gilbert output to filesystem destination
    await (await gilbert.compile()).pipeTo(outputAdapter.write(distDir));

    // Basic verification - check if any HTML files were generated
    const files = await readdir(distDir);
    const htmlFiles = files.filter((f) => f.endsWith(".html"));

    assert.ok(htmlFiles.length > 0, "Should generate at least one HTML file");
  });

  test("should populate template variables with data from JSON files", async () => {
    // Clean output directory and ensure it exists
    await rm(distDir, { recursive: true, force: true });

    // Create Gilbert instance with new API signature
    const gilbert = new Gilbert(
      {
        templates: templatesAdapter.read("**/*.hbs"),
        data: {
          source: dataAdapter.read("**/*.json"),
        },
      },
      {
        debug: true,
      }
    );

    // Compile and pipe Gilbert output to filesystem destination
    await (await gilbert.compile()).pipeTo(outputAdapter.write(distDir));

    // Test specific file: homepage
    const homepageData = JSON.parse(await readFile(resolve(dataDir, "homepage.json"), "utf8"));
    const homepageOutput = await readFile(resolve(distDir, "index.html"), "utf8");

    // Verify template variables were replaced with data values
    assert.ok(homepageOutput.includes(homepageData.title), `Homepage should contain title: "${homepageData.title}"`);
  });
});
