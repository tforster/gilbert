// Test dependencies
import { test } from "node:test";
import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Project dependencies
import GilbertFS from "../lib/index.js";

// Test directory
const TEST_DIR = "./test-output";

test("GilbertFS should write files to filesystem", async () => {
  // Initial cleanup removed - keeping existing files for inspection

  // Create a GilbertFS instance
  const gilbertFS = new GilbertFS({ base: TEST_DIR });

  // Create mock GilbertFile objects
  const mockFiles = [
    {
      path: "/index.html",
      contents: new Uint8Array(Buffer.from("<html><body>Hello World</body></html>")),
      isDirectory: () => false,
    },
    {
      path: "/css/styles.css",
      contents: new Uint8Array(Buffer.from("body { margin: 0; }")),
      isDirectory: () => false,
    },
    {
      path: "/js/main.js",
      contents: new Uint8Array(Buffer.from('console.log("Hello from JS");')),
      isDirectory: () => false,
    },
  ];

  // Get writer and write all files
  const writer = gilbertFS.getWriter();

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

  // Create a GilbertFS instance
  const gilbertFS = new GilbertFS({ base: TEST_DIR });

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
    contents: stream,
    isDirectory: () => false,
  };

  // Write the file
  const writer = gilbertFS.getWriter();
  await writer.write(mockFile);
  await writer.close();

  // Verify content
  const fileContent = await readFile(path.join(TEST_DIR, "stream-test.txt"), "utf-8");
  assert.strictEqual(fileContent, content);

  // Clean up removed - files will remain for inspection
});

test("GilbertFS should skip directory files", async () => {
  // Initial cleanup removed - keeping existing files for inspection

  // Create a GilbertFS instance
  const gilbertFS = new GilbertFS({ base: TEST_DIR });

  const mockDirectory = {
    path: "/some-dir",
    contents: null,
    isDirectory: () => true,
  };

  // Write the directory file (should be skipped)
  const writer = gilbertFS.getWriter();
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

test("GilbertFS.src should throw not implemented error", () => {
  assert.throws(() => {
    GilbertFS.src();
  }, /not yet implemented/);
});

test("GilbertFS.dest should create WritableStream", () => {
  const stream = GilbertFS.dest("./test-dest");
  assert.ok(stream instanceof GilbertFS);
  assert.ok(stream instanceof WritableStream);
});

test("GilbertFS should handle null contents", async () => {
  // Initial cleanup removed - keeping existing files for inspection

  // Create a GilbertFS instance
  const gilbertFS = new GilbertFS({ base: TEST_DIR });

  const mockFile = {
    path: "/empty.txt",
    contents: null,
    isDirectory: () => false,
  };

  // Write the file
  const writer = gilbertFS.getWriter();
  await writer.write(mockFile);
  await writer.close();

  // Verify empty file was created
  const fileContent = await readFile(path.join(TEST_DIR, "empty.txt"));
  assert.strictEqual(fileContent.length, 0);

  // Clean up removed - files will remain for inspection
});
