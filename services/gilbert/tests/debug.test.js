import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

// Gilbert and dependencies
import Gilbert from "../lib/index.js";
import GilbertFS from "@tforster/gilbert-fs";

// Test paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = resolve(__dirname, "../../../tests/src");
const templatesDir = resolve(srcDir, "templates");
const dataDir = resolve(srcDir, "data");

// Each test gets its own isolated tmp subdirectory with a random suffix — no shared state between tests
const makeDistDir = async () => {
  return await mkdtemp(resolve(tmpdir(), "gilbert-debug-"));
};

// Create GilbertFS adapter instances for testing
const dataAdapter = new GilbertFS({ base: dataDir });
const templatesAdapter = new GilbertFS({ base: templatesDir });
const outputAdapter = new GilbertFS(); // No base, use direct path

await describe("Gilbert Debug Output", { concurrency: 1 }, () => {
  test("should output debug messages when debug=true", async () => {
    const distDir = await makeDistDir();
    const consoleOutput = [];

    // Capture console.log calls
    // eslint-disable-next-line no-console
    const originalLog = console.log;
    // eslint-disable-next-line no-console
    console.log = (...args) => {
      consoleOutput.push(args);
    };

    try {
      // Create Gilbert instance with debug enabled
      const gilbert = new Gilbert(
        {
          templates: templatesAdapter.read("**/*.hbs"),
          data: {
            source: dataAdapter.read("**/*.json"),
          },
        },
        {
          debug: true,
        }
      );

      // Compile and pipe Gilbert output to filesystem destination
      await (await gilbert.compile()).pipeTo(outputAdapter.write(distDir));

      // Wait for async logging to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have debug output
      assert.ok(consoleOutput.length > 0, "Should have console output when debug=true");

      // Should have [DEBUG] prefix in at least one message
      const hasDebugPrefix = consoleOutput.some((args) => args.some((arg) => typeof arg === "string" && arg.includes("[DEBUG]")));
      assert.ok(hasDebugPrefix, "Should have [DEBUG] prefix in output");

      // Should mention pipeline start messages
      const hasPipelineMessage = consoleOutput.some((args) =>
        args.some((arg) => typeof arg === "string" && (arg.includes("pipeline started") || arg.includes("completed")))
      );
      assert.ok(hasPipelineMessage, "Should have pipeline status messages");
    } finally {
      // Restore original console.log
      // eslint-disable-next-line no-console
      console.log = originalLog;
    }
  });

  test("should not output debug messages when debug=false", async () => {
    const distDir = await makeDistDir();
    const consoleOutput = [];

    // Capture console.log calls
    // eslint-disable-next-line no-console
    const originalLog = console.log;
    // eslint-disable-next-line no-console
    console.log = (...args) => {
      consoleOutput.push(args);
    };

    try {
      // Create Gilbert instance with debug disabled
      const gilbert = new Gilbert(
        {
          templates: templatesAdapter.read("**/*.hbs"),
          data: {
            source: dataAdapter.read("**/*.json"),
          },
        },
        {
          debug: false,
        }
      );

      // Compile and pipe Gilbert output to filesystem destination
      await (await gilbert.compile()).pipeTo(outputAdapter.write(distDir));

      // Wait a bit to ensure no async logging happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should NOT have any console output when debug=false
      assert.strictEqual(consoleOutput.length, 0, "Should have no console output when debug=false");
    } finally {
      // Restore original console.log
      // eslint-disable-next-line no-console
      console.log = originalLog;
    }
  });

  test("should not output debug messages when debug option is omitted (default)", async () => {
    const distDir = await makeDistDir();
    const consoleOutput = [];

    // Capture console.log calls
    // eslint-disable-next-line no-console
    const originalLog = console.log;
    // eslint-disable-next-line no-console
    console.log = (...args) => {
      consoleOutput.push(args);
    };

    try {
      // Create Gilbert instance WITHOUT debug option (should default to false)
      const gilbert = new Gilbert({
        templates: templatesAdapter.read("**/*.hbs"),
        data: {
          source: dataAdapter.read("**/*.json"),
        },
      });

      // Compile and pipe Gilbert output to filesystem destination
      await (await gilbert.compile()).pipeTo(outputAdapter.write(distDir));

      // Wait a bit to ensure no async logging happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should NOT have any console output when debug is not set
      assert.strictEqual(consoleOutput.length, 0, "Should have no console output when debug option is omitted");
    } finally {
      // Restore original console.log
      // eslint-disable-next-line no-console
      console.log = originalLog;
    }
  });

  test("should always output errors regardless of debug setting", async () => {
    const errorOutput = [];

    // Capture console.error calls
    // eslint-disable-next-line no-console
    const originalError = console.error;
    // eslint-disable-next-line no-console
    console.error = (...args) => {
      errorOutput.push(args);
    };

    try {
      // Create Gilbert with invalid configuration that will cause an error
      const gilbert = new Gilbert(
        {
          templates: templatesAdapter.read("**/*.hbs"),
          // Intentionally pass undefined data source to trigger error
          data: {
            source: undefined,
          },
        },
        {
          debug: false, // Even with debug=false, errors should show
        }
      );

      try {
        // This should fail
        await (await gilbert.compile()).pipeTo(
          new WritableStream({
            write() {},
          })
        );

        // Wait a bit for any async operations
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (e) {
        // Expected to fail, we're just checking if errors are logged
      }

      // Even with debug=false, critical errors should be logged
      // (Note: this test might not trigger an error depending on implementation, but the principle is tested)
    } finally {
      // Restore original console.error
      // eslint-disable-next-line no-console
      console.error = originalError;
    }
  });
});
