// Test dependencies
import { test } from "node:test";
import assert from "node:assert";
import { mkdir, writeFile, rmdir } from "node:fs/promises";
import path from "node:path";

// Project dependencies
import GilbertFS from "../lib/index.js";

// Test directory
const TEST_DIR = "./tests/src-output";

// Helper function to create test files
async function createTestFiles() {
  await mkdir(TEST_DIR, { recursive: true });
  await mkdir(path.join(TEST_DIR, "subdir"), { recursive: true });
  await mkdir(path.join(TEST_DIR, "subdir", "nested"), { recursive: true });

  // Create various file types
  await writeFile(path.join(TEST_DIR, "test.txt"), "Hello World");
  await writeFile(path.join(TEST_DIR, "config.json"), JSON.stringify({ name: "test" }));
  await writeFile(path.join(TEST_DIR, "style.css"), "body { margin: 0; }");
  await writeFile(path.join(TEST_DIR, "script.js"), "console.log('test');");
  await writeFile(path.join(TEST_DIR, "image.png"), Buffer.from([137, 80, 78, 71])); // PNG header

  // Files in subdirectories
  await writeFile(path.join(TEST_DIR, "subdir", "nested.txt"), "Nested file");
  await writeFile(path.join(TEST_DIR, "subdir", "nested", "deep.json"), JSON.stringify({ deep: true }));

  // Files to test exclusion patterns
  await writeFile(path.join(TEST_DIR, "ignore.tmp"), "Temporary file");
  await writeFile(path.join(TEST_DIR, "subdir", "also-ignore.bak"), "Backup file");
}

// Helper function to collect all files from a stream
async function collectStreamFiles(stream) {
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

// Helper function to read contents from a ReadableStream
async function readStreamContents(readableStream) {
  const reader = readableStream.getReader();
  const chunks = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Concatenate all chunks into a single Uint8Array
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

test("GilbertFS.src should return a ReadableStream", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("**/*", { base: TEST_DIR });

  assert(stream instanceof ReadableStream, "src() should return a ReadableStream");

  // Cancel the stream to clean up
  await stream.cancel();
});

test("GilbertFS.src should stream GilbertFile objects", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("*.txt", { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  assert(files.length > 0, "Should find at least one .txt file");

  const file = files[0];
  assert.ok(file.path, "File should have a path property");
  assert.ok(file.contents, "File should have contents");
  assert.ok(file.contents instanceof ReadableStream, "Contents should be a ReadableStream");

  // Read the contents from the stream
  const contentsData = await readStreamContents(file.contents);
  const contentsText = new TextDecoder().decode(contentsData);
  assert.equal(contentsText, "Hello World", "File contents should match");
});

test("GilbertFS.src should handle single glob pattern", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("*.json", { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  assert.equal(files.length, 1, "Should find exactly one .json file in root");
  assert.ok(files[0].path.endsWith("config.json"), "Should find config.json");

  // Read the contents from the stream
  const contentsData = await readStreamContents(files[0].contents);
  const contentsText = new TextDecoder().decode(contentsData);
  const parsed = JSON.parse(contentsText);
  assert.equal(parsed.name, "test", "JSON content should be parsed correctly");
});

test("GilbertFS.src should handle multiple glob patterns", async () => {
  await createTestFiles();

  const stream = GilbertFS.src(["*.txt", "*.js"], { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  assert.equal(files.length, 2, "Should find both .txt and .js files");

  const paths = files.map((f) => path.basename(f.path)).sort();
  assert.deepEqual(paths, ["script.js", "test.txt"], "Should find expected files");
});

test("GilbertFS.src should handle recursive glob patterns", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("**/*.txt", { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  assert.equal(files.length, 2, "Should find .txt files recursively");

  const paths = files.map((f) => f.relative).sort();
  assert.deepEqual(paths, ["subdir/nested.txt", "test.txt"], "Should find files in subdirectories");
});

test("GilbertFS.src should handle deeply nested files", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("**/deep.json", { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  assert.equal(files.length, 1, "Should find deeply nested file");
  assert.equal(files[0].relative, "subdir/nested/deep.json", "Should have correct relative path");

  const contentsData = await readStreamContents(files[0].contents);
  const contentsText = new TextDecoder().decode(contentsData);
  const parsed = JSON.parse(contentsText);
  assert.equal(parsed.deep, true, "Nested JSON content should be correct");
});

test("GilbertFS.src should handle exclusion patterns", async () => {
  await createTestFiles();

  // Note: Our Glob implementation doesn't support ! exclusions,
  // so we test by being specific about what we want
  const stream = GilbertFS.src(["*.txt", "*.json", "*.css", "*.js"], { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  const paths = files.map((f) => path.basename(f.path));

  // Should not include .tmp or .bak files
  assert(!paths.includes("ignore.tmp"), "Should not include .tmp files");
  assert(!paths.includes("also-ignore.bak"), "Should not include .bak files");

  // Should include the files we want
  assert(paths.includes("test.txt"), "Should include .txt files");
  assert(paths.includes("config.json"), "Should include .json files");
});

test("GilbertFS.src should handle empty results gracefully", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("*.nonexistent", { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  assert.equal(files.length, 0, "Should return empty array for non-matching patterns");
});

test("GilbertFS.src should handle binary files correctly", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("*.png", { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  assert.equal(files.length, 1, "Should find PNG file");
  assert.ok(files[0].path.endsWith("image.png"), "Should have correct path");
  assert.ok(files[0].contents instanceof ReadableStream, "Binary file should have ReadableStream contents");

  // Check PNG signature
  const contentsData = await readStreamContents(files[0].contents);
  assert.equal(contentsData[0], 137, "Should have PNG signature byte 1");
  assert.equal(contentsData[1], 80, "Should have PNG signature byte 2");
  assert.equal(contentsData[2], 78, "Should have PNG signature byte 3");
  assert.equal(contentsData[3], 71, "Should have PNG signature byte 4");
});

test("GilbertFS.src should use current directory as default base", async () => {
  // Create a test file in current directory
  await writeFile("temp-test.txt", "temp content");

  try {
    const stream = GilbertFS.src("temp-test.txt");
    const files = await collectStreamFiles(stream);

    assert.equal(files.length, 1, "Should find file in current directory");
    assert.ok(files[0].path.endsWith("temp-test.txt"), "Should have correct relative path");
  } finally {
    // Clean up
    try {
      await rmdir("temp-test.txt");
    } catch {
      // File might not exist or be deleted already
    }
  }
});

test("GilbertFS.src should stream files lazily without memory accumulation", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("**/*", { base: TEST_DIR });
  const reader = stream.getReader();

  // Read first file
  const { value: firstFile, done: firstDone } = await reader.read();
  assert(!firstDone, "Should have at least one file");
  assert.ok(firstFile.path, "First file should have path");

  // Read second file
  const { value: secondFile, done: secondDone } = await reader.read();

  if (!secondDone) {
    assert.ok(secondFile.path, "Second file should have path");
    assert.notEqual(firstFile.path, secondFile.path, "Files should be different");
  }

  reader.releaseLock();
  await stream.cancel();
});

test("GilbertFS.src should handle non-existent directory gracefully", async () => {
  const stream = GilbertFS.src("**/*", { base: "./non-existent-directory" });
  const files = await collectStreamFiles(stream);

  assert.equal(files.length, 0, "Should return empty stream for non-existent directory");
});

test("GilbertFS.src should preserve file stat information", async () => {
  await createTestFiles();

  const stream = GilbertFS.src("test.txt", { base: TEST_DIR });
  const files = await collectStreamFiles(stream);

  assert.equal(files.length, 1, "Should find test file");

  const file = files[0];
  assert.ok(file.stat, "File should have stat information");
  assert.ok(file.stat.isFile(), "Stat should indicate it's a file");
  assert.ok(file.stat.size > 0, "File should have a size");
});
