import GilbertFS from "@tforster/gilbert-fs";
import { resolve } from "node:path";
import { readdir } from "node:fs/promises";

// Test paths
const TEST_INPUT_DIR = resolve("./tests/input");

async function debugTest() {
  try {
    // First, let's see what files actually exist
    console.log("Input directory:", TEST_INPUT_DIR);
    const files = await readdir(TEST_INPUT_DIR, { recursive: true });
    console.log("Files in directory:", files);

    // Test different configurations
    const configs = [
      { patterns: "**/*", options: { base: TEST_INPUT_DIR } },
      { patterns: "*", options: { base: TEST_INPUT_DIR } },
      { patterns: "**/*", options: { cwd: TEST_INPUT_DIR } },
      { patterns: ["**/*"], options: { base: TEST_INPUT_DIR } },
    ];

    for (const config of configs) {
      console.log(`\nTesting patterns: ${JSON.stringify(config.patterns)} with options: ${JSON.stringify(config.options)}`);

      const srcStream = GilbertFS.src(config.patterns, config.options);
      const reader = srcStream.getReader();
      let fileCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        console.log("  File:", value.path, "Relative:", value.relative);
        fileCount++;
      }

      console.log(`  Total files: ${fileCount}`);
      reader.releaseLock();
    }
  } catch (error) {
    console.error("Debug test failed:", error);
  }
}

debugTest();
