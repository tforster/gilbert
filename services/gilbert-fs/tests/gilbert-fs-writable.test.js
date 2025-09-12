// Test dependencies
import { test } from "node:test";
import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Project dependencies
import GilbertFS from "../lib/index.js";

// Test directory
const TEST_DIR = "./tests/output";

test("GilbertFS should write files to filesystem", async () => {
  // Initial cleanup removed - keeping existing files for inspection

  // Create a destination stream
  const destStream = GilbertFS.dest(TEST_DIR);

  // Create mock GilbertFile objects
  const mockFiles = [
    {
      path: "/home/tforster/dev/TechSmarts/WebProducer/Gilbert/services/gilbert-fs/tests/input/index.html",
      relative: "index.html",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("<html><body>Hello World</body></html>"));
          controller.close();
        },
      }),
      isDirectory: () => false,
    },
    {
      path: "/home/tforster/dev/TechSmarts/WebProducer/Gilbert/services/gilbert-fs/tests/input/css/styles.css",
      relative: "css/styles.css",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("body { margin: 0; }"));
          controller.close();
        },
      }),
      isDirectory: () => false,
    },
    {
      path: "/home/tforster/dev/TechSmarts/WebProducer/Gilbert/services/gilbert-fs/tests/input/js/main.js",
      relative: "js/main.js",
      contents: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('console.log("Hello from JS");'));
          controller.close();
        },
      }),
      isDirectory: () => false,
    },
  ];

  // Write all files using the stream
  const writer = destStream.getWriter();

  for (const file of mockFiles) {
    await writer.write(file);
  }

  await writer.close();

  // Verify files were written correctly
  const indexContent = await readFile(path.join(TEST_DIR, "index.html"), "utf-8");
  assert.strictEqual(indexContent, "<html><body>Hello World</body></html>");

  const cssContent = await readFile(path.join(TEST_DIR, "css", "styles.css"), "utf-8");
  assert.strictEqual(cssContent, "body { margin: 0; }");

  const jsContent = await readFile(path.join(TEST_DIR, "js", "main.js"), "utf-8");
  assert.strictEqual(jsContent, 'console.log("Hello from JS");');

  // Clean up removed - files will remain for inspection
});

test("GilbertFS should handle ReadableStream contents", async () => {
  // Initial cleanup removed - keeping existing files for inspection

  // Create a destination stream
  const destStream = GilbertFS.dest(TEST_DIR);

  // Create a ReadableStream with content
  const content = "Stream content test";
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(content));
      controller.close();
    },
  });

  const mockFile = {
    path: "/stream-test.txt",
    relative: "stream-test.txt",
    contents: stream,
    isDirectory: () => false,
  };

  // Write the file
  const writer = destStream.getWriter();
  await writer.write(mockFile);
  await writer.close();

  // Verify content
  const fileContent = await readFile(path.join(TEST_DIR, "stream-test.txt"), "utf-8");
  assert.strictEqual(fileContent, content);

  // Clean up removed - files will remain for inspection
});

test("GilbertFS should skip directory files", async () => {
  // Initial cleanup removed - keeping existing files for inspection

  // Create a destination stream
  const destStream = GilbertFS.dest(TEST_DIR);

  const mockDirectory = {
    path: "/some-dir",
    relative: "some-dir",
    contents: null,
    isDirectory: () => true,
  };

  // Write the directory file (should be skipped)
  const writer = destStream.getWriter();
  await writer.write(mockDirectory);
  await writer.close();

  // Verify directory was not created as a file
  let dirExists = false;
  try {
    await readFile(path.join(TEST_DIR, "some-dir"));
  } catch (error) {
    dirExists = error.code === "ENOENT" || error.code === "EISDIR";
  }
  assert.ok(dirExists, "Directory should not be created as a file");

  // Clean up removed - files will remain for inspection
});

test("GilbertFS.dest should create WritableStream", () => {
  const stream = GilbertFS.dest("./test-dest");
  assert.ok(stream instanceof WritableStream);
});

test("GilbertFS should handle null contents", async () => {
  // Initial cleanup removed - keeping existing files for inspection

  // Create a destination stream
  const destStream = GilbertFS.dest(TEST_DIR);

  const mockFile = {
    path: "/empty.txt",
    relative: "empty.txt",
    contents: null,
    isDirectory: () => false,
  };

  // Write the file
  const writer = destStream.getWriter();
  await writer.write(mockFile);
  await writer.close();

  // Verify empty file was created
  const fileContent = await readFile(path.join(TEST_DIR, "empty.txt"));
  assert.strictEqual(fileContent.length, 0);

  // Clean up removed - files will remain for inspection
});
