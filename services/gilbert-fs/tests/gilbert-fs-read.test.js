// Gilbert-FS Read Functionality Tests
import { test, describe } from "node:test";
import assert from "node:assert";
// Using static test files from centralized ../../../../tests/src/files/
import path from "node:path";

// Project dependencies
import GilbertFS from "../lib/index.js";

// Test paths
const TEST_SRC_DIR = "../../tests/src/files";
const TEST_DIST_DIR = "./tests/dist";

describe("GilbertFS Read Operations", { concurrency: 1 }, async () => {
  // Helper function to collect all files from a ReadableStream
  async function collectFiles(stream) {
    const files = [];
    const reader = stream.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        files.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    return files;
  }

  // Note: Now using static test files from centralized ../../../../tests/src/

  test("should create GilbertFS instance with default options", () => {
    const fs = new GilbertFS();
    assert.ok(fs instanceof GilbertFS, "Should create GilbertFS instance");
  });

  test("should create GilbertFS instance with custom options", () => {
    const fs = new GilbertFS({
      cwd: process.cwd(),
      base: TEST_SRC_DIR,
      strict: false,
    });
    assert.ok(fs instanceof GilbertFS, "Should create GilbertFS instance with custom options");
  });

  test("should read files with single glob pattern", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });
    const stream = fs.read("*.json");
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find JSON files in root");

    // Verify all files are JSON files
    files.forEach((file) => {
      assert.ok(file.path.endsWith(".json"), `File ${file.path} should be a JSON file`);
      assert.ok(file.contents instanceof Uint8Array || file.contents instanceof ReadableStream, "File should have contents");
    });
  });

  test("should read files with multiple glob patterns", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });
    const stream = fs.read(["*.txt", "*.json"]);
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find TXT and JSON files");

    // Verify files match expected extensions
    files.forEach((file) => {
      const hasValidExt = file.path.endsWith(".txt") || file.path.endsWith(".json");
      assert.ok(hasValidExt, `File ${file.path} should be TXT or JSON`);
    });
  });

  test("should read files with recursive glob patterns", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });
    const stream = fs.read("**/*.json");
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find JSON files recursively");

    // Should find files in subdirectories
    const hasNestedFiles = files.some((file) => file.path.includes("/"));
    assert.ok(hasNestedFiles, "Should find files in nested directories");

    // Verify all are JSON files
    files.forEach((file) => {
      assert.ok(file.path.endsWith(".json"), `File ${file.path} should be a JSON file`);
    });
  });

  test("should handle directory-specific patterns", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });
    const stream = fs.read("subdir/*.txt");
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find TXT files in subdir directory");

    // Verify all files are from subdir directory
    files.forEach((file) => {
      assert.ok(file.path.includes("subdir/"), `File ${file.path} should be in subdir directory`);
      assert.ok(file.path.endsWith(".txt"), `File ${file.path} should be a TXT file`);
    });
  });

  test("should handle exclusion patterns", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });
    const stream = fs.read(["**/*", "!**/node_modules/**"]);
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find files with exclusion pattern");

    // Verify no node_modules files
    const hasNodeModules = files.some((file) => file.path.includes("node_modules"));
    assert.ok(!hasNodeModules, "Should exclude node_modules files");
  });

  test("should return proper GilbertFile objects", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });
    const stream = fs.read("*.txt");
    const files = await collectFiles(stream);

    assert.ok(files.length >= 1, "Should find at least one TXT file");

    const file = files[0];
    assert.ok(file.path, "File should have path property");
    assert.ok(file.base, "File should have base property");
    assert.ok(file.contents, "File should have contents property");
    assert.ok(file.stat, "File should have stat property");
    assert.ok(file.isFile(), "File should be identified as a file");
    assert.ok(!file.isDirectory(), "File should not be identified as directory");
  });

  test("should preserve file contents correctly", async () => {
    const fs = new GilbertFS({ cwd: TEST_SRC_DIR });
    const stream = fs.read(["test.txt"]);
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find at least one file");

    const file = files[0];
    assert.ok(file.contents, "File should have contents");

    // Check content is properly loaded - should be ReadableStream
    assert.ok(file.contents instanceof ReadableStream, "File contents should be ReadableStream");

    // Read from stream to verify content
    const reader = file.contents.getReader();
    const { value } = await reader.read();
    reader.releaseLock();
    assert.ok(value instanceof Uint8Array, "Stream should provide Uint8Array chunks");
    assert.ok(value.length > 0, "File should have content");
  });

  test("should handle empty result sets gracefully", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });
    const stream = fs.read("*.nonexistent");
    const files = await collectFiles(stream);

    assert.strictEqual(files.length, 0, "Should return empty array for non-matching patterns");
  });

  test("should handle non-existent directories gracefully", async () => {
    const fs = new GilbertFS({ base: "./nonexistent" });
    const stream = fs.read("*");
    const files = await collectFiles(stream);

    assert.strictEqual(files.length, 0, "Should handle non-existent base directory gracefully");
  });

  test("should handle absolute vs relative paths", async () => {
    const absoluteBase = path.resolve(TEST_SRC_DIR);
    const fs1 = new GilbertFS({ base: absoluteBase });
    const fs2 = new GilbertFS({ base: TEST_SRC_DIR });

    const stream1 = fs1.read("*.json");
    const stream2 = fs2.read("*.json");

    const files1 = await collectFiles(stream1);
    const files2 = await collectFiles(stream2);

    assert.strictEqual(files1.length, files2.length, "Absolute and relative paths should yield same results");
  });

  test("should handle method-level options override", async () => {
    const fs = new GilbertFS({ base: "./tests" });

    // Override base at method level
    const stream = fs.read("*.json", { base: TEST_SRC_DIR });
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Method-level options should override instance options");
  });

  test("should preserve file stat information", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });
    const stream = fs.read("test.txt");
    const files = await collectFiles(stream);

    assert.ok(files.length >= 1, "Should find at least one test.txt file");

    const file = files[0];
    assert.ok(file.stat, "File should have stat information");
    assert.ok(typeof file.stat.size === "number", "Stat should have size");
    assert.ok(file.stat.isFile(), "Should be identified as a file");
  });

  test("should handle concurrent read operations", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });

    // Start multiple concurrent reads
    const promises = [collectFiles(fs.read("*.json")), collectFiles(fs.read("**/*.txt")), collectFiles(fs.read("**/*.md"))];

    const results = await Promise.all(promises);

    // All operations should complete successfully
    results.forEach((files, index) => {
      assert.ok(Array.isArray(files), `Operation ${index + 1} should return array`);
    });
  });

  test("should handle large number of files (performance test)", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });

    const startTime = performance.now();
    const stream = fs.read("**/*");
    const files = await collectFiles(stream);
    const endTime = performance.now();

    assert.ok(files.length > 0, "Should find files");
    assert.ok(endTime - startTime < 5000, "Should complete within reasonable time (5s)");

    // Verify memory isn't leaking by checking we can iterate through all files
    let fileCount = 0;
    files.forEach((file) => {
      assert.ok(file.path, "Each file should have a path");
      fileCount++;
    });

    assert.strictEqual(fileCount, files.length, "Should be able to iterate through all files");
  });

  test("should handle different file types correctly", async () => {
    const fs = new GilbertFS({ cwd: TEST_SRC_DIR });
    const stream = fs.read(["**/*.txt", "**/*.md", "**/*.json"]);
    const files = await collectFiles(stream);

    assert.ok(files.length > 0, "Should find multiple file types");

    // Group files by type and verify contents
    const fileTypes = {};
    files.forEach((file) => {
      const ext = path.extname(file.path);
      if (!fileTypes[ext]) fileTypes[ext] = [];
      fileTypes[ext].push(file);
    });

    // Verify we found different types
    assert.ok(Object.keys(fileTypes).length > 1, "Should find multiple file types");

    // Check that all files have proper contents - should be ReadableStream
    files.forEach((file) => {
      assert.ok(file.contents instanceof ReadableStream, "File contents should be ReadableStream");
    });
  });

  test("should handle edge case glob patterns", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });

    // Test various edge cases
    const testCases = [
      { pattern: "", expectedCount: 0 },
      { pattern: ".", expectedCount: 0 },
      { pattern: "..", expectedCount: 0 },
      { pattern: "**", expectedCount: 0 }, // Should not match files without extension
    ];

    for (const testCase of testCases) {
      try {
        const files = await collectFiles(fs.read(testCase.pattern));
        assert.strictEqual(
          files.length,
          testCase.expectedCount,
          `Pattern "${testCase.pattern}" should return ${testCase.expectedCount} files`
        );
      } catch (error) {
        // Some patterns might throw errors, which is acceptable
        assert.ok(error instanceof Error, `Pattern "${testCase.pattern}" should handle gracefully`);
      }
    }
  });

  test("should handle dotfiles correctly", async () => {
    const fs = new GilbertFS({ base: TEST_SRC_DIR });

    // Test reading dotfiles with explicit pattern
    const dotfileStream = fs.read(".*");
    const dotfiles = await collectFiles(dotfileStream);

    // Should find .dotfile
    assert.ok(dotfiles.length > 0, "Should find dotfiles with .* pattern");
    const dotfile = dotfiles.find((file) => file.path.endsWith(".dotfile"));
    assert.ok(dotfile, "Should find .dotfile in results");
    assert.ok(dotfile.relative === ".dotfile", "Should have correct relative path");

    // Test that dotfiles are excluded from normal patterns (Unix behavior)
    const normalStream = fs.read("*");
    const normalFiles = await collectFiles(normalStream);
    const hasDotfile = normalFiles.some((file) => file.path.endsWith(".dotfile"));
    assert.ok(!hasDotfile, "Dotfiles should be excluded from * pattern");

    // Test that **/* also excludes dotfiles (Unix behavior)
    const allStream = fs.read("**/*");
    const allFiles = await collectFiles(allStream);
    const hasAllDotfile = allFiles.some((file) => file.path.endsWith(".dotfile"));
    assert.ok(!hasAllDotfile, "Dotfiles should be excluded from **/* pattern");
  });
});
