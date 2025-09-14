import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readdir, stat, readFile, mkdir, writeFile, rm } from "node:fs/promises";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths
const TEMPLATE_INPUT_DIR = resolve("./tests/template-input");
const TEMPLATES_DIR = resolve(TEMPLATE_INPUT_DIR, "templates");
const DATA_DIR = resolve(TEMPLATE_INPUT_DIR, "data");
const TEST_OUTPUT_DIR = resolve("./tests/template-output");

/**
 * Utility function to create template test files
 */
async function createTemplateTestFiles() {
  // Ensure directories exist
  await mkdir(TEMPLATES_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  // Create template files
  const templateFiles = [
    {
      path: "templates/homepage.hbs",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
</head>
<body>
    <h1>{{title}}</h1>
    <p>{{description}}</p>
    <div class="content">
        {{#if content}}
            {{{content}}}
        {{else}}
            <p>No content available.</p>
        {{/if}}
    </div>
    <footer>
        <p>Generated on {{generatedAt}}</p>
    </footer>
</body>
</html>`,
    },
    {
      path: "templates/about.hbs",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}} - About</title>
</head>
<body>
    <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
    </nav>
    <main>
        <h1>{{title}}</h1>
        <section class="bio">
            <h2>About {{name}}</h2>
            <p>{{bio}}</p>
        </section>
        {{#if skills}}
        <section class="skills">
            <h2>Skills</h2>
            <ul>
                {{#each skills}}
                <li>{{this}}</li>
                {{/each}}
            </ul>
        </section>
        {{/if}}
    </main>
</body>
</html>`,
    },
    {
      path: "templates/components/header.hbs",
      content: `<header class="site-header">
  <nav>
    <a href="/">Home</a>
    <a href="/about.html">About</a>
  </nav>
</header>`,
    },
  ];

  // Create data files (JSON files with URI objects)
  const dataFiles = [
    {
      path: "data/homepage.json",
      content: JSON.stringify(
        {
          uri: "/index.html",
          webProducerKey: "homepage",
          title: "Welcome to Our Site",
          description: "This is the homepage of our amazing website built with Gilbert.",
          content: "<p>Gilbert is a modern static site generator that uses Web API streams.</p>",
          generatedAt: "2025-01-23",
        },
        null,
        2
      ),
    },
    {
      path: "data/about.json",
      content: JSON.stringify(
        {
          uri: "/about.html",
          webProducerKey: "about",
          title: "About Us",
          name: "Gilbert Team",
          bio: "We are passionate developers creating modern tooling for the web.",
          skills: ["Web API Streams", "Static Site Generation", "JavaScript", "Performance"],
        },
        null,
        2
      ),
    },
    {
      path: "data/redirect.json",
      content: JSON.stringify(
        {
          uri: "/old-page.html",
          webProducerKey: "redirect",
          targetAddress: "/new-page.html",
        },
        null,
        2
      ),
    },
  ];

  // Write all files
  const allFiles = [...templateFiles, ...dataFiles];
  for (const file of allFiles) {
    const fullPath = resolve(TEMPLATE_INPUT_DIR, file.path);
    const dir = resolve(fullPath, "..");

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(fullPath, file.content, "utf8");
  }

  return { templateFiles, dataFiles };
}

/**
 * Utility function to clean up test directories
 */
async function cleanupTestDirectories() {
  try {
    await rm(TEMPLATE_INPUT_DIR, { recursive: true, force: true });
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors if directories don't exist
  }
}

/**
 * Utility function to get all files recursively
 */
async function getAllFiles(dir, files = [], baseDir = null) {
  // Track the original base directory for relative path calculation
  if (baseDir === null) {
    baseDir = dir;
  }

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      const fullPath = resolve(dir, entry);
      const fileStat = await stat(fullPath);

      if (fileStat.isDirectory()) {
        await getAllFiles(fullPath, files, baseDir);
      } else {
        files.push({
          path: fullPath,
          relativePath: fullPath.replace(baseDir + "/", ""),
          size: fileStat.size,
        });
      }
    }
  } catch {
    // Directory might not exist
  }

  return files;
}

describe("Gilbert Template Pipeline", () => {
  beforeEach(async () => {
    await cleanupTestDirectories();
    await createTemplateTestFiles();
  });

  test("should process templates through Gilbert pipeline", async () => {
    console.log("Template pipeline started");

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

    console.log("Template processing completed");

    // Verify output files exist and have correct content
    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);

    // Should generate 3 files: 2 HTML pages + 1 redirect
    assert.strictEqual(outputFiles.length, 3, `Expected 3 output files, got ${outputFiles.length}`);

    // Check homepage
    const homepage = outputFiles.find((file) => file.relativePath === "index.html");
    assert(homepage, "Homepage file should be generated");

    const homepageContent = await readFile(homepage.path, "utf8");
    assert(homepageContent.includes("Welcome to Our Site"), "Homepage should contain title");
    assert(homepageContent.includes("Gilbert is a modern static site generator"), "Homepage should contain content");
    assert(homepageContent.includes("Generated on 2025-01-23"), "Homepage should contain generation date");
    // Check that HTML is minified (no extra whitespace between tags)
    assert(!homepageContent.includes(">\n    <"), "HTML should be minified");

    // Check about page
    const aboutPage = outputFiles.find((file) => file.relativePath === "about.html");
    assert(aboutPage, "About page should be generated");

    const aboutContent = await readFile(aboutPage.path, "utf8");
    assert(aboutContent.includes("About Us - About"), "About page should have correct title");
    assert(aboutContent.includes("About Gilbert Team"), "About page should contain bio section");
    assert(aboutContent.includes("Web API Streams"), "About page should list skills");

    // Check redirect file
    const redirect = outputFiles.find((file) => file.relativePath === "old-page.html");
    assert(redirect, "Redirect file should be generated");

    const redirectContent = await readFile(redirect.path, "utf8");
    assert.strictEqual(redirectContent, "/new-page.html", "Redirect should contain target address");
  });

  test("should handle empty template input gracefully", async () => {
    await cleanupTestDirectories();

    // Create empty directories
    await mkdir(TEMPLATES_DIR, { recursive: true });
    await mkdir(DATA_DIR, { recursive: true });

    console.log("Empty template pipeline started");

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with empty streams
    const params = {
      uris: GilbertFS.src("**/*.json", { base: DATA_DIR }),
      templates: GilbertFS.src("**/*.hbs", { base: TEMPLATES_DIR }),
    };

    // Compile through Gilbert
    await gilbert.compile(params);

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    console.log("Empty template processing completed");

    // Verify no output files are generated
    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);
    assert.strictEqual(outputFiles.length, 0, "Empty input should produce no output files");
  });

  test("should preserve nested directory structure", async () => {
    await cleanupTestDirectories();

    // Create nested template and data
    await mkdir(resolve(TEMPLATES_DIR, "components"), { recursive: true });
    await mkdir(resolve(DATA_DIR, "pages"), { recursive: true });

    // Create nested template
    await writeFile(resolve(TEMPLATES_DIR, "components/nested.hbs"), `<h1>{{title}}</h1><p>{{content}}</p>`);

    // Create nested data
    await writeFile(
      resolve(DATA_DIR, "pages/nested.json"),
      JSON.stringify(
        {
          uri: "/deep/nested/page.html",
          webProducerKey: "components/nested",
          title: "Nested Page",
          content: "This is nested content",
        },
        null,
        2
      )
    );

    console.log("Nested template pipeline started");

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert
    const params = {
      uris: GilbertFS.src("**/*.json", { base: DATA_DIR }),
      templates: GilbertFS.src("**/*.hbs", { base: TEMPLATES_DIR }),
    };

    // Compile through Gilbert
    await gilbert.compile(params);

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    console.log("Nested template processing completed");

    // Verify nested path structure is preserved
    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);
    assert.strictEqual(outputFiles.length, 1, "Should generate one nested file");

    const nestedFile = outputFiles[0];
    assert(nestedFile.relativePath.includes("deep/nested/page.html"), "Should preserve nested path structure");

    const content = await readFile(nestedFile.path, "utf8");
    assert(content.includes("Nested Page"), "Should contain the correct title");
    assert(content.includes("This is nested content"), "Should contain the correct content");
  });

  test("should pass through files without modification", async () => {
    console.log("Template passthrough pipeline started");

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

    console.log("Template passthrough completed");

    // Get original input files for comparison
    const originalFiles = await createTemplateTestFiles();

    // Verify that output files contain processed template content
    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);

    for (const outputFile of outputFiles) {
      const content = await readFile(outputFile.path, "utf8");

      if (outputFile.relativePath.endsWith(".html")) {
        // Check if this is a redirect file or a regular HTML file
        if (outputFile.relativePath.includes("old-page.html")) {
          // Redirect files should contain target address
          assert(content.includes("/"), "Redirect content should be preserved");
        } else {
          // Regular HTML files should be processed (contain HTML structure, not template syntax)
          assert(content.includes("<!DOCTYPE html>"), "Output should be processed HTML");
          assert(!content.includes("{{"), "Output should not contain template placeholders");
        }
      } else {
        // Other files should contain target address
        assert(content.includes("/"), "Redirect content should be preserved");
      }
    }
  });
});
