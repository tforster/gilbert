import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = resolve(__dirname, "../../../tests/src");
const templatesDir = resolve(srcDir, "templates");
const dataDir = resolve(srcDir, "data");

// Each test gets its own isolated tmp subdirectory with a random suffix — no shared state between tests
const makeDistDir = async () => {
  return await mkdtemp(resolve(tmpdir(), "gilbert-templates-"));
};

// Create GilbertFS adapter instances for testing
const dataAdapter = new GilbertFS({ base: dataDir });
const templatesAdapter = new GilbertFS({ base: templatesDir });
const outputAdapter = new GilbertFS(); // No base, use direct path

await describe("Gilbert Template Pipeline", { concurrency: 1 }, () => {
  test("should process templates and generate HTML files", async () => {
    const distDir = await makeDistDir();

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
    await (await gilbert.start()).pipeTo(outputAdapter.write(distDir));

    // Basic verification - check if any HTML files were generated
    const files = await readdir(distDir);
    const htmlFiles = files.filter((f) => f.endsWith(".html"));

    assert.ok(htmlFiles.length > 0, "Should generate at least one HTML file");
  });

  test("should populate template variables with data from JSON files", async () => {
    const distDir = await makeDistDir();

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
    await (await gilbert.start()).pipeTo(outputAdapter.write(distDir));

    // Test specific file: homepage
    const homepageData = JSON.parse(await readFile(resolve(dataDir, "homepage.json"), "utf8"));
    const homepageOutput = await readFile(resolve(distDir, "index.html"), "utf8");

    // Verify template variables were replaced with data values
    assert.ok(homepageOutput.includes(homepageData.title), `Homepage should contain title: "${homepageData.title}"`);
  });

  test("should load templates from multiple streams (array input)", async () => {
    const distDir = await makeDistDir();

    // Two separate adapter instances: one for root templates, one for components.
    // home.hbs uses {{> components/head.hbs}}, {{> components/header.hbs}}, etc.
    // so both streams must be loaded before rendering begins.
    const rootTemplatesAdapter = new GilbertFS({ base: templatesDir });
    const componentsAdapter = new GilbertFS({ base: templatesDir });

    const gilbert = new Gilbert(
      {
        templates: [rootTemplatesAdapter.read("*.hbs"), componentsAdapter.read("components/**/*.hbs")],
        data: {
          source: dataAdapter.read("**/*.json"),
        },
      },
      {
        debug: true,
      }
    );

    await (await gilbert.start()).pipeTo(outputAdapter.write(distDir));

    // Should produce the same output as single-stream — all templates and partials resolve
    const files = await readdir(distDir);
    const htmlFiles = files.filter((f) => f.endsWith(".html"));
    assert.ok(htmlFiles.length > 0, "Should generate at least one HTML file from array of template streams");

    // about.hbs (root stream) renders /about.html with no conflicts — verify data binding works
    const aboutData = JSON.parse(await readFile(resolve(dataDir, "about.json"), "utf8"));
    const aboutOutput = await readFile(resolve(distDir, "about.html"), "utf8");
    assert.ok(aboutOutput.length > 0, "about.html should not be empty");
    assert.ok(aboutOutput.includes(aboutData.title), `about.html should contain title from about.json: "${aboutData.title}"`);
  });

  test("should throw on duplicate template keys across multiple streams", async () => {
    // Two adapters with the same base and pattern yield identical keys — a clear collision.
    const stream1 = new GilbertFS({ base: templatesDir }).read("*.hbs");
    const stream2 = new GilbertFS({ base: templatesDir }).read("*.hbs");

    const gilbert = new Gilbert(
      {
        templates: [stream1, stream2],
        data: { source: dataAdapter.read("**/*.json") },
      },
      { debug: false }
    );

    await assert.rejects(() => gilbert.start(), /Template collision/);
  });
});
