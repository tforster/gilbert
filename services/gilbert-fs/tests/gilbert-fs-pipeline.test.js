// Test dependencies
import { test } from "node:test";
import assert from "node:assert";
import { readFile, writeFile, mkdir, rmdir } from "node:fs/promises";
import path from "node:path";

// Project dependencies
import GilbertFS from "../lib/index.js";

// Test directories
const TEST_INPUT_DIR = "./tests/input";
const TEST_OUTPUT_DIR = "./tests/output";

// Setup test fixtures
async function setupTestFixtures() {
  try {
    await mkdir(TEST_INPUT_DIR, { recursive: true });

    // Create test files
    await writeFile(path.join(TEST_INPUT_DIR, "index.html"), "<html><body>Hello World</body></html>");
    await writeFile(path.join(TEST_INPUT_DIR, "styles.css"), "body { margin: 0; padding: 10px; }");
    await writeFile(path.join(TEST_INPUT_DIR, "script.js"), 'console.log("Hello from JavaScript");');

    await mkdir(path.join(TEST_INPUT_DIR, "assets"), { recursive: true });
    await writeFile(path.join(TEST_INPUT_DIR, "assets", "data.json"), '{"message": "test data"}');
  } catch {
    // Fixtures already exist
  }
}

// Cleanup test directories
async function cleanup() {
  try {
    await rmdir(TEST_OUTPUT_DIR, { recursive: true });
  } catch {
    // Directory might not exist
  }
}

test("GilbertFS pipeline: src() → transform → dest()", async () => {
  await setupTestFixtures();
  await cleanup();

  // Create a transform stream that uppercases all text content
  const uppercaseTransform = new TransformStream({
    async transform(gilbertFile, controller) {
      if (gilbertFile.isDirectory()) {
        controller.enqueue(gilbertFile);
        return;
      }

      // Transform text files by uppercasing content
      const isTextFile = /\.(html|css|js|json)$/i.test(gilbertFile.path);

      if (isTextFile && gilbertFile.contents) {
        try {
          // Read the contents and uppercase
          const reader = gilbertFile.contents.getReader();
          const chunks = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }

          // Combine chunks and uppercase
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const combined = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }

          const text = new TextDecoder().decode(combined);
          const uppercased = text.toUpperCase();

          // Create new ReadableStream with transformed content
          const transformedContents = new ReadableStream({
            start(streamController) {
              const newContent = new TextEncoder().encode(uppercased);
              streamController.enqueue(newContent);
              streamController.close();
            },
          });

          // Use the new clone method to create a file with transformed contents
          controller.enqueue(gilbertFile.clone({ contents: transformedContents }));
        } catch {
          // Pass through on error
          controller.enqueue(gilbertFile);
        }
      } else {
        // Pass through non-text files unchanged
        controller.enqueue(gilbertFile);
      }
    },
  });

  // Create the pipeline: src → transform → dest
  const sourceStream = GilbertFS.src("**/*", { base: TEST_INPUT_DIR });
  const destStream = GilbertFS.dest(TEST_OUTPUT_DIR);

  // Process the pipeline
  await sourceStream.pipeThrough(uppercaseTransform).pipeTo(destStream);

  // Verify the results
  const indexContent = await readFile(path.join(TEST_OUTPUT_DIR, "index.html"), "utf-8");
  assert.strictEqual(indexContent, "<HTML><BODY>HELLO WORLD</BODY></HTML>");

  const cssContent = await readFile(path.join(TEST_OUTPUT_DIR, "styles.css"), "utf-8");
  assert.strictEqual(cssContent, "BODY { MARGIN: 0; PADDING: 10PX; }");

  const jsContent = await readFile(path.join(TEST_OUTPUT_DIR, "script.js"), "utf-8");
  assert.strictEqual(jsContent, 'CONSOLE.LOG("HELLO FROM JAVASCRIPT");');

  const jsonContent = await readFile(path.join(TEST_OUTPUT_DIR, "assets", "data.json"), "utf-8");
  assert.strictEqual(jsonContent, '{"MESSAGE": "TEST DATA"}');
});

test("GilbertFS.src() should handle invalid directory gracefully", async () => {
  const invalidDir = "./this-directory-does-not-exist";

  const stream = GilbertFS.src("**/*", { base: invalidDir });
  const reader = stream.getReader();
  const files = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      files.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Should return empty stream for non-existent directory (graceful handling)
  assert.strictEqual(files.length, 0, "Should return empty stream for invalid directory");
});

test("GilbertFS.src() should stream files successfully with valid patterns", async () => {
  await setupTestFixtures();

  const stream = GilbertFS.src(["*.html", "*.css"], { base: TEST_INPUT_DIR });
  const reader = stream.getReader();
  const files = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      files.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Should find index.html and styles.css
  assert.strictEqual(files.length, 2);

  const filePaths = files.map((f) => path.basename(f.path)).sort();
  assert.deepStrictEqual(filePaths, ["index.html", "styles.css"]);

  // Verify files have content
  for (const file of files) {
    assert.ok(file.contents instanceof ReadableStream);
    assert.strictEqual(file.isDirectory(), false);
  }
});

test("GilbertFS.dest() should create directories as needed", async () => {
  await cleanup();

  const mockFile = {
    path: "deep/nested/directory/file.txt",
    relative: "deep/nested/directory/file.txt", // Add relative property for Vinyl compatibility
    contents: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("nested file content"));
        controller.close();
      },
    }),
    isDirectory: () => false,
  };

  const destStream = GilbertFS.dest(TEST_OUTPUT_DIR);
  const writer = destStream.getWriter();

  await writer.write(mockFile);
  await writer.close();

  const content = await readFile(path.join(TEST_OUTPUT_DIR, "deep", "nested", "directory", "file.txt"), "utf-8");
  assert.strictEqual(content, "nested file content");
});
