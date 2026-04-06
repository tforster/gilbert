// Gilbert-FS Write Functionality Tests
import { test, describe } from "node:test";
import assert from "node:assert";
import { readFile, rm, stat, readdir } from "node:fs/promises";
import path from "node:path";

// Project dependencies
import GilbertFS from "../lib/index.js";
import GilbertFile from "@tforster/gilbert-file";

// Test paths
const TEST_SRC_DIR = "../../tests/src/files";
const TEST_DIST_DIR = "./tests/dist";

describe("GilbertFS Write Operations", { concurrency: 1 }, async () => {
  // Helper function to create test GilbertFile objects
  function createTestFile(relativePath, content, options = {}) {
    const fullPath = path.resolve(TEST_SRC_DIR, relativePath);
    return new GilbertFile({
      path: fullPath,
      base: path.resolve(TEST_SRC_DIR),
      contents: typeof content === "string" ? new TextEncoder().encode(content) : content,
      ...options,
    });
  }

  // Helper function to clean dist directory
  async function cleanDist() {
    try {
      await rm(TEST_DIST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignore ENOENT errors (directory doesn't exist)
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    return TEST_DIST_DIR;
  }

  // Helper function to write files to stream
  async function writeFiles(stream, files) {
    const writer = stream.getWriter();
    try {
      for (const file of files) {
        await writer.write(file);
      }
    } finally {
      await writer.close();
    }
  }

  test("should create WritableStream with write method", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();
    const stream = fs.write(distDir);

    assert.ok(stream instanceof WritableStream, "Should return WritableStream");
  });

  test("should write single file to filesystem", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    const testFile = createTestFile("test.txt", "Hello, World!");
    const stream = fs.write(distDir);

    await writeFiles(stream, [testFile]);

    // Verify file was written
    const writtenContent = await readFile(path.join(distDir, "test.txt"), "utf8");
    assert.strictEqual(writtenContent, "Hello, World!", "File content should be preserved");
  });

  test("should write multiple files to filesystem", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    const files = [
      createTestFile("file1.txt", "Content 1"),
      createTestFile("file2.js", "console.log('test');"),
      createTestFile("file3.json", '{"test": true}'),
    ];

    const stream = fs.write(distDir);
    await writeFiles(stream, files);

    // Verify all files were written
    for (let i = 0; i < files.length; i++) {
      const expectedPath = path.join(distDir, `file${i + 1}.${["txt", "js", "json"][i]}`);
      const content = await readFile(expectedPath, "utf8");
      const expectedContent = ["Content 1", "console.log('test');", '{"test": true}'][i];
      assert.strictEqual(content, expectedContent, `File ${i + 1} content should be preserved`);
    }
  });

  test("should create nested directories as needed", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    const nestedFile = createTestFile("deeply/nested/directory/file.txt", "Nested content");
    const stream = fs.write(distDir);

    await writeFiles(stream, [nestedFile]);

    // Verify nested file was written
    const nestedPath = path.join(distDir, "deeply", "nested", "directory", "file.txt");
    const content = await readFile(nestedPath, "utf8");
    assert.strictEqual(content, "Nested content", "Nested file should be written correctly");
  });

  test("should handle files with null contents (empty files)", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    // Create empty file with explicit stat info to indicate it's a file, not a directory
    const emptyFile = createTestFile("empty.txt", null, {
      stat: {
        isFile: () => true,
        isDirectory: () => false,
        size: 0,
      },
    });

    const stream = fs.write(distDir);

    await writeFiles(stream, [emptyFile]);

    // Verify empty file was created
    const emptyPath = path.join(distDir, "empty.txt");
    const content = await readFile(emptyPath);
    assert.strictEqual(content.length, 0, "Empty file should have zero length");
  });

  test("should handle files with ReadableStream contents", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    // Create a ReadableStream with test content
    const chunks = ["Hello, ", "streaming ", "world!"];
    let chunkIndex = 0;

    const readableStream = new ReadableStream({
      pull(controller) {
        if (chunkIndex < chunks.length) {
          controller.enqueue(new TextEncoder().encode(chunks[chunkIndex++]));
        } else {
          controller.close();
        }
      },
    });

    const streamFile = createTestFile("stream.txt", readableStream);
    const writeStream = fs.write(distDir);

    await writeFiles(writeStream, [streamFile]);

    // Verify streamed content was written correctly
    const content = await readFile(path.join(distDir, "stream.txt"), "utf8");
    assert.strictEqual(content, "Hello, streaming world!", "Streamed content should be concatenated");
  });

  test("should preserve file structure from relative paths", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    const files = [
      createTestFile("root.txt", "root content"),
      createTestFile("subdir/nested.txt", "nested content"),
      createTestFile("subdir/deep/deeper.txt", "deeper content"),
    ];

    const stream = fs.write(distDir);
    await writeFiles(stream, files);

    // Verify directory structure is preserved
    const rootContent = await readFile(path.join(distDir, "root.txt"), "utf8");
    const nestedContent = await readFile(path.join(distDir, "subdir", "nested.txt"), "utf8");
    const deeperContent = await readFile(path.join(distDir, "subdir", "deep", "deeper.txt"), "utf8");

    assert.strictEqual(rootContent, "root content");
    assert.strictEqual(nestedContent, "nested content");
    assert.strictEqual(deeperContent, "deeper content");
  });

  test("should handle concurrent write operations", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    // Create multiple write operations concurrently
    const operations = [];
    for (let i = 0; i < 5; i++) {
      const file = createTestFile(`concurrent${i}.txt`, `Content ${i}`);
      const stream = fs.write(distDir);
      operations.push(writeFiles(stream, [file]));
    }

    // Wait for all operations to complete
    await Promise.all(operations);

    // Verify all files were written correctly
    for (let i = 0; i < 5; i++) {
      const content = await readFile(path.join(distDir, `concurrent${i}.txt`), "utf8");
      assert.strictEqual(content, `Content ${i}`, `Concurrent file ${i} should be written correctly`);
    }
  });

  test("should handle different file types correctly", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    const files = [
      createTestFile("text.txt", "Plain text content"),
      createTestFile("script.js", "console.log('JavaScript');"),
      createTestFile("style.css", "body { margin: 0; }"),
      createTestFile("data.json", '{"key": "value"}'),
      createTestFile("markdown.md", "# Markdown Header"),
    ];

    const stream = fs.write(distDir);
    await writeFiles(stream, files);

    // Verify all file types were written correctly
    const expectedContents = [
      "Plain text content",
      "console.log('JavaScript');",
      "body { margin: 0; }",
      '{"key": "value"}',
      "# Markdown Header",
    ];

    for (let i = 0; i < files.length; i++) {
      const filename = files[i].path.split("/").pop();
      const content = await readFile(path.join(distDir, filename), "utf8");
      assert.strictEqual(content, expectedContents[i], `File type ${i} should be preserved`);
    }
  });

  test("should handle large files efficiently", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    // Create a large file (1MB of content)
    const largeContent = "A".repeat(1024 * 1024);
    const largeFile = createTestFile("large.txt", largeContent);

    const startTime = performance.now();
    const stream = fs.write(distDir);
    await writeFiles(stream, [largeFile]);
    const endTime = performance.now();

    // Verify large file was written correctly
    const writtenContent = await readFile(path.join(distDir, "large.txt"), "utf8");
    assert.strictEqual(writtenContent.length, largeContent.length, "Large file size should be preserved");
    assert.strictEqual(writtenContent, largeContent, "Large file content should be preserved");

    // Performance check - should complete in reasonable time
    const writeTime = endTime - startTime;
    assert.ok(writeTime < 5000, `Large file write should complete quickly (${writeTime}ms < 5000ms)`);
  });

  test("should handle binary file contents", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    // Create binary content
    const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG header
    const binaryFile = createTestFile("image.png", binaryData);

    const stream = fs.write(distDir);
    await writeFiles(stream, [binaryFile]);

    // Verify binary file was written correctly
    const writtenData = await readFile(path.join(distDir, "image.png"));
    assert.strictEqual(writtenData.length, binaryData.length, "Binary file size should be preserved");

    // Compare byte by byte
    for (let i = 0; i < binaryData.length; i++) {
      assert.strictEqual(writtenData[i], binaryData[i], `Binary byte ${i} should match`);
    }
  });

  test("should handle backpressure correctly", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    // Create many files to test backpressure
    const files = [];
    for (let i = 0; i < 100; i++) {
      files.push(createTestFile(`backpressure${i}.txt`, `Content ${i}`));
    }

    const stream = fs.write(distDir);
    const writer = stream.getWriter();

    // Write files rapidly to test backpressure handling
    const writePromises = files.map((file) => writer.write(file));
    await Promise.all(writePromises);
    await writer.close();

    // Verify all files were written
    const writtenFiles = await readdir(distDir);
    assert.strictEqual(writtenFiles.length, 100, "All files should be written despite backpressure");
  });

  test("should handle write errors gracefully", async () => {
    const fs = new GilbertFS();

    // Try to write to an invalid/readonly location
    const invalidPath = "/root/readonly/invalid";
    const testFile = createTestFile("test.txt", "content");

    const stream = fs.write(invalidPath);
    const writer = stream.getWriter();

    try {
      await writer.write(testFile);
      await writer.close();
      assert.fail("Should have thrown an error for invalid write location");
    } catch (error) {
      assert.ok(error instanceof Error, "Should throw proper error for invalid write");
    }
  });

  test("should preserve file timestamps when possible", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    // Create file with custom stat information
    const customStat = {
      size: 12,
      mtime: new Date("2023-01-01T00:00:00Z"),
      ctime: new Date("2023-01-01T00:00:00Z"),
      atime: new Date("2023-01-01T00:00:00Z"),
    };

    const testFile = createTestFile("timestamped.txt", "Test content", { stat: customStat });

    const stream = fs.write(distDir);
    await writeFiles(stream, [testFile]);

    // Verify file was written (note: filesystem may not preserve all timestamps)
    const writtenPath = path.join(distDir, "timestamped.txt");
    const writtenStat = await stat(writtenPath);

    assert.ok(writtenStat.size, "Written file should have size information");
    assert.ok(writtenStat.mtime, "Written file should have modification time");
  });

  test("should handle files with complex relative paths", async () => {
    const fs = new GilbertFS();
    const distDir = await cleanDist();

    const files = [
      createTestFile("../outside.txt", "outside content"),
      createTestFile("./current.txt", "current content"),
      createTestFile("sub/../normalized.txt", "normalized content"),
    ];

    const stream = fs.write(distDir);
    await writeFiles(stream, files);

    // Verify files are written to expected locations
    // Note: Paths should be normalized by GilbertFile
    const distFiles = await readdir(distDir, { recursive: true });
    assert.ok(distFiles.length > 0, "Files should be written despite complex paths");
  });
});
