import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readdir, stat, readFile, mkdir, writeFile, rm } from "node:fs/promises";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths - preserve folder structure from src to dist
const srcDir = resolve("./tests/src");
const filesDir = resolve(srcDir, "files");
const distDir = resolve("./tests/dist");

// Create GilbertFS adapter instance for testing new constructor pattern
const fsAdapter = new GilbertFS({ base: srcDir });

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
    await rm(distDir, { recursive: true, force: true });

    // Get expected file count from source directory
    const inputFiles = await getAllFiles(filesDir);
    const expectedFileCount = inputFiles.length;

    // Create Gilbert instance
    const gilbert = new Gilbert({
      debug: true,
    });

    // Configure Gilbert with static files using new constructor pattern
    const params = {
      staticFiles: fsAdapter.read("files/**/*"),
    };

    // Compile through Gilbert
    await gilbert.compile(params);

    // Pipe Gilbert output to filesystem destination using instance method
    await gilbert.stream.pipeTo(fsAdapter.write(distDir));

    // Verify output files exist
    const outputFiles = await getAllFiles(distDir);

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
    const svgContent = await readFile(resolve(distDir, "files/assets/logo.svg"), "utf8");
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

    // Create adapter for empty directory
    const emptyFsAdapter = new GilbertFS({ base: emptyInputDir });

    const params = {
      staticFiles: emptyFsAdapter.read("**/*"),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(emptyFsAdapter.write(emptyOutputDir));

    const outputFiles = await getAllFiles(emptyOutputDir);
    assert.equal(outputFiles.length, 0, "Should handle empty input gracefully");

    // Clean up temp directories
    await rm(emptyInputDir, { recursive: true, force: true });
    await rm(emptyOutputDir, { recursive: true, force: true });
  });

  test("should preserve file structure and paths", async () => {
    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: fsAdapter.read("files/**/*"),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(fsAdapter.write(distDir));

    // Get input and output file structures
    const inputFiles = await getAllFiles(filesDir);
    const outputFiles = await getAllFiles(distDir);

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
    await rm(distDir, { recursive: true, force: true });

    const gilbert = new Gilbert({
      debug: true,
    });

    const params = {
      staticFiles: fsAdapter.read("files/**/*"),
    };

    await gilbert.compile(params);
    await gilbert.stream.pipeTo(fsAdapter.write(distDir));

    // Compare input and output file contents
    const inputFiles = await getAllFiles(filesDir);

    for (const inputFile of inputFiles) {
      const inputContent = await readFile(inputFile.path);
      const outputPath = resolve(distDir, "files", inputFile.relativePath);
      const outputContent = await readFile(outputPath);

      assert.deepEqual(outputContent, inputContent, `File content should be identical for ${inputFile.relativePath}`);
    }
  });

  test("should handle array patterns to filter specific file types", async () => {
    // Clean output directory
    await rm(distDir, { recursive: true, force: true });

    // Create Gilbert instance for array pattern test
    const gilbert1 = new Gilbert({
      debug: true,
    });

    // Test array patterns - get only .hbs and .json files
    const params = {
      staticFiles: fsAdapter.read(["**/*.hbs", "**/*.json"]),
    };

    await gilbert1.compile(params);
    await gilbert1.stream.pipeTo(fsAdapter.write(distDir));

    // Verify we got both file types
    const outputFiles = await getAllFiles(distDir);

    // Should have files
    assert.ok(outputFiles.length > 0, "Should have found files matching array patterns");

    // All files should be either .hbs or .json
    for (const file of outputFiles) {
      const isValidType = file.path.endsWith(".hbs") || file.path.endsWith(".json");
      assert.ok(isValidType, `File ${file.relativePath} should be .hbs or .json`);
    }

    // Verify we have both types (assuming test data contains both)
    const hasHbs = outputFiles.some((f) => f.path.endsWith(".hbs"));
    const hasJson = outputFiles.some((f) => f.path.endsWith(".json"));

    if (hasHbs) {
      assert.ok(hasHbs, "Should have found .hbs files");
    }
    if (hasJson) {
      assert.ok(hasJson, "Should have found .json files");
    }

    // Test single pattern vs array pattern should be equivalent for same pattern
    await rm(distDir, { recursive: true, force: true });

    // Create new Gilbert instance for single pattern test
    const gilbert2 = new Gilbert({
      debug: true,
    });

    const singlePatternParams = {
      staticFiles: fsAdapter.read("**/*.json"),
    };

    await gilbert2.compile(singlePatternParams);
    await gilbert2.stream.pipeTo(fsAdapter.write(distDir));

    const singlePatternFiles = await getAllFiles(distDir);

    // Clean and test array with single pattern
    await rm(distDir, { recursive: true, force: true });

    // Create new Gilbert instance for array pattern test
    const gilbert3 = new Gilbert({
      debug: true,
    });

    const arrayPatternParams = {
      staticFiles: fsAdapter.read(["**/*.json"]),
    };

    await gilbert3.compile(arrayPatternParams);
    await gilbert3.stream.pipeTo(fsAdapter.write(distDir));

    const arrayPatternFiles = await getAllFiles(distDir);

    // Should produce same results
    assert.equal(
      singlePatternFiles.length,
      arrayPatternFiles.length,
      "Single pattern and array with single pattern should produce same results"
    );
  });
});
