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

      // Wait a single timer tick for async logging to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

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
      // Use a stream that immediately errors to guarantee a pipeline failure
      const failingStream = new ReadableStream({
        start(controller) {
          controller.error(new Error("Guaranteed test error"));
        },
      });

      const gilbert = new Gilbert(
        {
          staticFiles: failingStream,
        },
        {
          debug: false, // Even with debug=false, errors must appear on stderr
        }
      );

      try {
        await (await gilbert.compile()).pipeTo(
          new WritableStream({
            write() {},
          })
        );
      } catch {
        // Expected — the failing stream throws during pipeTo
      }

      // Even with debug=false, pipeline errors must be logged to console.error
      assert.ok(errorOutput.length > 0, "Should have error output even when debug=false");

      // The logged error should reference the failing pipeline or the error message
      const hasErrorMessage = errorOutput.some((args) =>
        args.some((arg) => (typeof arg === "string" && arg.includes("StaticFiles")) || (arg instanceof Error && arg.message.includes("Guaranteed test error")))
      );
      assert.ok(hasErrorMessage, "Error output should include the pipeline name or the error message");
    } finally {
      // Restore original console.error
      // eslint-disable-next-line no-console
      console.error = originalError;
    }
  });
});
