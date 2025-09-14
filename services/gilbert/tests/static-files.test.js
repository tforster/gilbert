import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readdir, stat, readFile, mkdir, writeFile, rm } from "node:fs/promises";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths
const TEST_INPUT_DIR = resolve("./tests/input");
const TEST_OUTPUT_DIR = resolve("./tests/output");

/**
 * Utility function to create test files
 */
async function createTestFiles() {
  // Ensure input directory exists
  await mkdir(TEST_INPUT_DIR, { recursive: true });

  // Create test files with various types and directory structure
  const testFiles = [
    {
      path: "index.html",
      content: "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello World</h1></body></html>",
    },
    {
      path: "styles.css",
      content: "body { font-family: Arial, sans-serif; color: #333; }",
    },
    {
      path: "script.js",
      content: "console.log('Hello from test script');",
    },
    {
      path: "data.json",
      content: JSON.stringify({ message: "test data", version: "1.0" }, null, 2),
    },
    {
      path: "assets/logo.svg",
      content: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>',
    },
    {
      path: "assets/images/photo.txt",
      content: "This is a placeholder for a photo file",
    },
    {
      path: "docs/readme.md",
      content: "# Test Documentation\\n\\nThis is a test markdown file.",
    },
  ];

  // Create all test files
  for (const file of testFiles) {
    const fullPath = resolve(TEST_INPUT_DIR, file.path);
    const dir = resolve(fullPath, "..");

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(fullPath, file.content, "utf8");
  }

  return testFiles;
}

/**
 * Utility function to clean up test directories
 */
async function cleanupTestDirectories() {
  try {
    await rm(TEST_INPUT_DIR, { recursive: true, force: true });
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

describe("Gilbert Static Files Pipeline", () => {
  beforeEach(async () => {
    await cleanupTestDirectories();
    await createTestFiles();
  });

  // afterEach(async () => {
  //   await cleanupTestDirectories();
  // });

  test("should process static files through Gilbert pipeline", async () => {
    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with static files only
    const params = {
      staticFiles: GilbertFS.src("**/*", { base: TEST_INPUT_DIR }),
    };

    // Compile through Gilbert
    await gilbert.compile(params);

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    // Verify output files exist
    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);

    assert.ok(outputFiles.length > 0, "Should have generated output files");

    // Check that we have the expected number of files (7 test files)
    assert.equal(outputFiles.length, 7, "Should have all 7 test files in output");

    // Verify specific files exist and have correct content
    const indexFile = outputFiles.find((f) => f.relativePath === "index.html");
    assert.ok(indexFile, "Should have index.html");

    const cssFile = outputFiles.find((f) => f.relativePath === "styles.css");
    assert.ok(cssFile, "Should have styles.css");

    const jsFile = outputFiles.find((f) => f.relativePath === "script.js");
    assert.ok(jsFile, "Should have script.js");

    const jsonFile = outputFiles.find((f) => f.relativePath === "data.json");
    assert.ok(jsonFile, "Should have data.json");

    // Verify subdirectory files
    const svgFile = outputFiles.find((f) => f.relativePath === "assets/logo.svg");
    assert.ok(svgFile, "Should have assets/logo.svg");

    const photoFile = outputFiles.find((f) => f.relativePath === "assets/images/photo.txt");
    assert.ok(photoFile, "Should have assets/images/photo.txt");

    const mdFile = outputFiles.find((f) => f.relativePath === "docs/readme.md");
    assert.ok(mdFile, "Should have docs/readme.md");

    // Verify file contents are preserved
    const indexContent = await readFile(resolve(TEST_OUTPUT_DIR, "index.html"), "utf8");
    assert.ok(indexContent.includes("<h1>Hello World</h1>"), "Index.html content should be preserved");

    const cssContent = await readFile(resolve(TEST_OUTPUT_DIR, "styles.css"), "utf8");
    assert.ok(cssContent.includes("font-family: Arial"), "CSS content should be preserved");

    const svgContent = await readFile(resolve(TEST_OUTPUT_DIR, "assets/logo.svg"), "utf8");
    assert.ok(svgContent.includes('<circle cx="50"'), "SVG content should be preserved");
  });

  test("should handle empty input directory gracefully", async () => {
    // Clean input directory
    await rm(TEST_INPUT_DIR, { recursive: true, force: true });
    await mkdir(TEST_INPUT_DIR, { recursive: true });

    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: GilbertFS.src("**/*", { base: TEST_INPUT_DIR }),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);
    assert.equal(outputFiles.length, 0, "Should handle empty input gracefully");
  });

  test("should preserve file structure and paths", async () => {
    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: GilbertFS.src("**/*", { base: TEST_INPUT_DIR }),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    // Get input and output file structures
    const inputFiles = await getAllFiles(TEST_INPUT_DIR);
    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);

    // Should have same number of files
    assert.equal(outputFiles.length, inputFiles.length, "Should preserve file count");

    // Check that directory structure is maintained
    const inputPaths = inputFiles.map((f) => f.relativePath).sort();
    const outputPaths = outputFiles.map((f) => f.relativePath).sort();

    assert.deepEqual(outputPaths, inputPaths, "Should preserve directory structure");
  });

  test("should pass through files without modification", async () => {
    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: GilbertFS.src("**/*", { base: TEST_INPUT_DIR }),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    // Compare input and output file contents
    const inputFiles = await getAllFiles(TEST_INPUT_DIR);

    for (const inputFile of inputFiles) {
      const inputContent = await readFile(inputFile.path);
      const outputPath = resolve(TEST_OUTPUT_DIR, inputFile.relativePath);
      const outputContent = await readFile(outputPath);

      assert.deepEqual(outputContent, inputContent, `File content should be identical for ${inputFile.relativePath}`);
    }
  });
});
