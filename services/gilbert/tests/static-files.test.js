import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readdir, stat, readFile, mkdir, writeFile, rm } from "node:fs/promises";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths - preserve folder structure from src to dist
const TEST_SRC_DIR = resolve("./tests/src");
const TEST_INPUT_DIR = resolve(TEST_SRC_DIR, "files");
const TEST_OUTPUT_DIR = resolve("./tests/dist");

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
  // Note: Using committed test files in src/files directory, no dynamic file creation needed

  // afterEach(async () => {
  //   await cleanupTestDirectories();
  // });

  test("should process static files through Gilbert pipeline", async () => {
    // Clean output directory
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });

    // Get expected file count from source directory
    const inputFiles = await getAllFiles(TEST_INPUT_DIR);
    const expectedFileCount = inputFiles.length;

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with static files only - preserve folder structure
    const params = {
      staticFiles: GilbertFS.src("files/**/*", { base: TEST_SRC_DIR }),
    };

    // Compile through Gilbert
    await gilbert.compile(params);

    // Pipe Gilbert output to filesystem destination
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    // Verify output files exist
    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);

    assert.ok(outputFiles.length > 0, "Should have generated output files");

    // Check that we have the expected number of files (dynamically calculated)
    assert.equal(outputFiles.length, expectedFileCount, `Should have all ${expectedFileCount} test files in output`);

    // Verify specific files exist and have correct content in the files/ subdirectory
    const rootFile = outputFiles.find((f) => f.relativePath === "files/IAmInTheRootOfFiles.txt");
    assert.ok(rootFile, "Should have files/IAmInTheRootOfFiles.txt");

    // Verify subdirectory files in the files/ folder
    const svgFile = outputFiles.find((f) => f.relativePath === "files/assets/logo.svg");
    assert.ok(svgFile, "Should have files/assets/logo.svg");

    const photoFile = outputFiles.find((f) => f.relativePath === "files/assets/images/photo.txt");
    assert.ok(photoFile, "Should have files/assets/images/photo.txt");

    const mdFile = outputFiles.find((f) => f.relativePath === "files/docs/readme.md");
    assert.ok(mdFile, "Should have files/docs/readme.md");

    // Verify file contents are preserved
    const svgContent = await readFile(resolve(TEST_OUTPUT_DIR, "files/assets/logo.svg"), "utf8");
    assert.ok(svgContent.includes('<circle cx="50"'), "SVG content should be preserved");

    // Assert that the static files parent folder name is preserved (src/files -> dist/files)
    const filesInFilesFolder = outputFiles.filter((f) => f.relativePath.startsWith("files/"));
    assert.equal(filesInFilesFolder.length, expectedFileCount, "All files should be in the files/ subdirectory");
  });

  test("should handle empty input directory gracefully", async () => {
    // Use a temporary empty directory instead of modifying source
    const emptyInputDir = resolve("./tests/temp-empty");
    const emptyOutputDir = resolve("./tests/dist-empty");

    // Clean and create empty directories
    await rm(emptyInputDir, { recursive: true, force: true });
    await rm(emptyOutputDir, { recursive: true, force: true });
    await mkdir(emptyInputDir, { recursive: true });

    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: GilbertFS.src("**/*", { base: emptyInputDir }),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(GilbertFS.dest(emptyOutputDir));

    const outputFiles = await getAllFiles(emptyOutputDir);
    assert.equal(outputFiles.length, 0, "Should handle empty input gracefully");

    // Clean up temp directories
    await rm(emptyInputDir, { recursive: true, force: true });
    await rm(emptyOutputDir, { recursive: true, force: true });
  });

  test("should preserve file structure and paths", async () => {
    // Clean output directory
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });

    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: GilbertFS.src("files/**/*", { base: TEST_SRC_DIR }),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    // Get input and output file structures
    const inputFiles = await getAllFiles(TEST_INPUT_DIR);
    const outputFiles = await getAllFiles(TEST_OUTPUT_DIR);

    // Should have same number of files
    assert.equal(outputFiles.length, inputFiles.length, "Should preserve file count");

    // Check that directory structure is maintained with files/ prefix
    const inputPaths = inputFiles.map((f) => f.relativePath).sort();
    const outputPaths = outputFiles.map((f) => f.relativePath.replace(/^files\//, "")).sort();

    assert.deepEqual(outputPaths, inputPaths, "Should preserve directory structure under files/ folder");

    // Verify all files are in the files/ subdirectory
    const filesInFilesFolder = outputFiles.filter((f) => f.relativePath.startsWith("files/"));
    assert.equal(filesInFilesFolder.length, outputFiles.length, "All files should be in the files/ subdirectory");
  });

  test("should pass through files without modification", async () => {
    // Clean output directory
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });

    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: GilbertFS.src("files/**/*", { base: TEST_SRC_DIR }),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(GilbertFS.dest(TEST_OUTPUT_DIR));

    // Compare input and output file contents
    const inputFiles = await getAllFiles(TEST_INPUT_DIR);

    for (const inputFile of inputFiles) {
      const inputContent = await readFile(inputFile.path);
      const outputPath = resolve(TEST_OUTPUT_DIR, "files", inputFile.relativePath);
      const outputContent = await readFile(outputPath);

      assert.deepEqual(outputContent, inputContent, `File content should be identical for ${inputFile.relativePath}`);
    }
  });
});
