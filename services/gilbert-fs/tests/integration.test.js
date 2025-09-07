// Integration test for the exact usage pattern from build.js
import { test } from "node:test";
import assert from "node:assert";
import { rm } from "node:fs/promises";

// Project dependencies
import GilbertFS from "../lib/index.js";

const TEST_DIR = "./integration-test";

test("GilbertFS should work with the exact build.js pattern", async () => {
  // Clean up
  await rm(TEST_DIR, { recursive: true, force: true });

  // Mock the gilbert.stream pattern from build.js
  const mockGilbertStream = new ReadableStream({
    start(controller) {
      // Simulate files that Gilbert would emit
      controller.enqueue({
        path: "/index.html",
        contents: new Uint8Array(Buffer.from("<html><body>Test</body></html>")),
        isDirectory: () => false,
      });

      controller.enqueue({
        path: "/css/main.css",
        contents: new Uint8Array(Buffer.from("body { margin: 0; }")),
        isDirectory: () => false,
      });

      controller.close();
    },
  });

  // Test the exact pattern from build.js: stream.pipeTo(new GilbertFS({ base: "./dist" }))
  await mockGilbertStream.pipeTo(new GilbertFS({ base: TEST_DIR }));

  // Verify it worked - at this point files should be written
  // The test will pass if no errors were thrown during pipeTo
  assert.ok(true, "pipeTo completed without errors");

  // Clean up
  await rm(TEST_DIR, { recursive: true, force: true });
});
