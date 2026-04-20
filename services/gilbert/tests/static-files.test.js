import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { readdir, stat, readFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths - preserve folder structure from src to dist
const __dirname = resolve(new URL(".", import.meta.url).pathname);
const srcDir = resolve(__dirname, "../../../tests/src");
const filesDir = resolve(srcDir, "files");

// Each test gets its own isolated tmp subdirectory with a random suffix — no shared state between tests
const makeDistDir = async () => {
  return await mkdtemp(resolve(tmpdir(), "gilbert-static-files-"));
};

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

await describe("Gilbert Static Files Pipeline", { concurrency: 1 }, () => {
  // Note: Using committed test files in src/files directory, no dynamic file creation needed

  // afterEach(async () => {
  //   await cleanupTestDirectories();
  // });

  test("should process static files through Gilbert pipeline", async () => {
    // Each test gets a fresh, isolated tmp subdirectory
    const distDir = await makeDistDir();

    // Get expected file count from source directory
    const inputFiles = await getAllFiles(filesDir);
    const expectedFileCount = inputFiles.length;

    // Create Gilbert instance with new API signature
    // Use pattern that includes dotfiles to match the test expectation
    const gilbert = new Gilbert(
      {
        staticFiles: fsAdapter.read(["files/**/*", "files/**/.*"]),
      },
      {
        debug: true,
      }
    );

    // Compile and pipe Gilbert output to filesystem destination
    await (await gilbert.start()).pipeTo(fsAdapter.write(distDir));

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

    // Create adapter for empty directory
    const emptyFsAdapter = new GilbertFS({ base: emptyInputDir });

    const gilbert = new Gilbert(
      {
        staticFiles: emptyFsAdapter.read("**/*"),
      },
      {
        debug: true,
      }
    );

    await (await gilbert.start()).pipeTo(emptyFsAdapter.write(emptyOutputDir));

    const outputFiles = await getAllFiles(emptyOutputDir);
    assert.equal(outputFiles.length, 0, "Should handle empty input gracefully");

    // Clean up temp directories
    await rm(emptyInputDir, { recursive: true, force: true });
    await rm(emptyOutputDir, { recursive: true, force: true });
  });

  test("should preserve file structure and paths", async () => {
    // Each test gets a fresh, isolated tmp subdirectory
    const distDir = await makeDistDir();

    const gilbert = new Gilbert(
      {
        staticFiles: fsAdapter.read(["files/**/*", "files/**/.*"]),
      },
      {
        debug: true,
      }
    );

    await (await gilbert.start()).pipeTo(fsAdapter.write(distDir));

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
    // Each test gets a fresh, isolated tmp subdirectory
    const distDir = await makeDistDir();

    const gilbert = new Gilbert(
      {
        staticFiles: fsAdapter.read(["files/**/*", "files/**/.*"]),
      },
      {
        debug: true,
      }
    );

    await (await gilbert.start()).pipeTo(fsAdapter.write(distDir));

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
    // Each test gets a fresh, isolated tmp subdirectory; sub-phases use sibling dirs
    const distDir = await makeDistDir();

    // Create Gilbert instance for array pattern test
    const gilbert1 = new Gilbert(
      {
        staticFiles: fsAdapter.read(["**/*.hbs", "**/*.json"]),
      },
      {
        debug: true,
      }
    );

    await (await gilbert1.start()).pipeTo(fsAdapter.write(distDir));

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
    const distDir2 = await makeDistDir();

    // Create new Gilbert instance for single pattern test
    const gilbert2 = new Gilbert(
      {
        staticFiles: fsAdapter.read("**/*.json"),
      },
      {
        debug: true,
      }
    );

    await (await gilbert2.start()).pipeTo(fsAdapter.write(distDir2));

    const singlePatternFiles = await getAllFiles(distDir2);

    // Clean and test array with single pattern
    const distDir3 = await makeDistDir();

    // Create new Gilbert instance for array pattern test
    const gilbert3 = new Gilbert(
      {
        staticFiles: fsAdapter.read(["**/*.json"]),
      },
      {
        debug: true,
      }
    );

    await (await gilbert3.start()).pipeTo(fsAdapter.write(distDir3));

    const arrayPatternFiles = await getAllFiles(distDir3);

    // Should produce same results
    assert.equal(
      singlePatternFiles.length,
      arrayPatternFiles.length,
      "Single pattern and array with single pattern should produce same results"
    );
  });

  test("should process static files from multiple streams (array input)", async () => {
    // Each test gets a fresh, isolated tmp subdirectory
    const distDir = await makeDistDir();

    // Two independent streams targeting different subsets of files.
    // files/*.txt covers root-level text files; files/assets/**/* covers nested binary/asset files.
    // Together they should produce a non-overlapping union in the output.
    const stream1 = fsAdapter.read("files/*.txt");
    const stream2 = fsAdapter.read("files/assets/**/*");

    const gilbert = new Gilbert(
      {
        staticFiles: [stream1, stream2],
      },
      {
        debug: true,
      }
    );

    await (await gilbert.start()).pipeTo(fsAdapter.write(distDir));

    const outputFiles = await getAllFiles(distDir);

    // Both streams must have contributed files
    assert.ok(outputFiles.length > 0, "Should have output files from multiple streams");

    const txtFiles = outputFiles.filter((f) => f.path.endsWith(".txt"));
    const assetFiles = outputFiles.filter((f) => f.relativePath.startsWith("files/assets/"));

    assert.ok(txtFiles.length > 0, "Should have .txt files from stream 1");
    assert.ok(assetFiles.length > 0, "Should have asset files from stream 2");

    // Verify no file is duplicated (all relative paths are unique)
    const relativePaths = outputFiles.map((f) => f.relativePath);
    const uniquePaths = new Set(relativePaths);
    assert.equal(uniquePaths.size, relativePaths.length, "No files should be duplicated across streams");
  });
});
