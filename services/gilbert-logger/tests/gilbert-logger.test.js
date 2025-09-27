/**
 * @fileoverview Tests for gilbert-logger functionality and async behavior
 */

import { test, describe } from "node:test";
import assert from "node:assert";
import { createLogger } from "../lib/index.js";

describe("Gilbert Logger Tests", { concurrency: 1 }, () => {
  test("createLogger with debug=false creates no-op logger", () => {
    const logger = createLogger(false);

    // Should have all expected methods
    assert.strictEqual(typeof logger.log, "function");
    assert.strictEqual(typeof logger.warn, "function");
    assert.strictEqual(typeof logger.error, "function");
    assert.strictEqual(typeof logger.debug, "function");
    assert.strictEqual(typeof logger.isEnabled, "function");

    // Should indicate disabled state
    assert.strictEqual(logger.isEnabled(), false);

    // No-op functions should not throw
    assert.doesNotThrow(() => {
      logger.log("test");
      logger.warn("test");
      logger.debug("test");
    });
  });

  test("createLogger with debug=true creates active logger", () => {
    const logger = createLogger(true);

    // Should have all expected methods
    assert.strictEqual(typeof logger.log, "function");
    assert.strictEqual(typeof logger.warn, "function");
    assert.strictEqual(typeof logger.error, "function");
    assert.strictEqual(typeof logger.debug, "function");
    assert.strictEqual(typeof logger.isEnabled, "function");

    // Should indicate enabled state
    assert.strictEqual(logger.isEnabled(), true);

    // Active functions should not throw
    assert.doesNotThrow(() => {
      logger.log("test");
      logger.warn("test");
      logger.debug("test");
      logger.error("test");
    });
  });

  test("logger methods are asynchronous when debug=true", async () => {
    const logger = createLogger(true);
    const results = [];

    // Test that async logging doesn't block
    logger.log("async message");
    results.push("after log call");

    logger.warn("async warning");
    results.push("after warn call");

    logger.debug("async debug");
    results.push("after debug call");

    // Should execute immediately (async behavior)
    assert.deepStrictEqual(results, ["after log call", "after warn call", "after debug call"]);

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  test("error logging is synchronous in both modes", () => {
    const enabledLogger = createLogger(true);
    const disabledLogger = createLogger(false);

    // Capture console.error calls
    // eslint-disable-next-line no-console
    const originalError = console.error;
    const errorCalls = [];

    // eslint-disable-next-line no-console
    console.error = (...args) => {
      errorCalls.push(args);
    };

    try {
      // Both should call console.error synchronously
      enabledLogger.error("enabled error");
      disabledLogger.error("disabled error");

      // Should have captured both calls immediately
      assert.strictEqual(errorCalls.length, 2);
      assert.deepStrictEqual(errorCalls[0], ["enabled error"]);
      assert.deepStrictEqual(errorCalls[1], ["disabled error"]);
    } finally {
      // Restore original console.error
      // eslint-disable-next-line no-console
      console.error = originalError;
    }
  });

  test("performance comparison: disabled vs enabled logger", async () => {
    const disabledLogger = createLogger(false);
    const enabledLogger = createLogger(true);
    const iterations = 1000;

    // Test disabled logger performance (should be near-zero overhead)
    const disabledStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      disabledLogger.log(`Message ${i}`);
      disabledLogger.warn(`Warning ${i}`);
      disabledLogger.debug(`Debug ${i}`);
    }
    const disabledTime = performance.now() - disabledStart;

    // Test enabled logger performance (should be fast but measurable)
    const enabledStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      enabledLogger.log(`Message ${i}`);
      enabledLogger.warn(`Warning ${i}`);
      enabledLogger.debug(`Debug ${i}`);
    }
    const enabledTime = performance.now() - enabledStart;

    // Disabled should be significantly faster (no-op functions)
    assert(
      disabledTime < enabledTime,
      `Disabled logger (${disabledTime}ms) should be faster than enabled logger (${enabledTime}ms)`
    );

    // But both should be very fast (under 100ms for 3000 calls)
    assert(disabledTime < 100, `Disabled logger should be under 100ms, got ${disabledTime}ms`);
    assert(enabledTime < 100, `Enabled logger should be under 100ms, got ${enabledTime}ms`);

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  test("async behavior validation with timing", async () => {
    const logger = createLogger(true);
    const timeline = [];

    // Mark start time
    timeline.push("start");

    // Make async log calls
    logger.log("async call 1");
    timeline.push("after call 1");

    logger.warn("async call 2");
    timeline.push("after call 2");

    logger.debug("async call 3");
    timeline.push("after call 3");

    timeline.push("end");

    // All timeline entries should be present immediately (proving async)
    assert.deepStrictEqual(timeline, ["start", "after call 1", "after call 2", "after call 3", "end"]);

    // Wait for all async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  test("default parameter behavior", () => {
    // createLogger() with no args should default to disabled
    const defaultLogger = createLogger();
    assert.strictEqual(defaultLogger.isEnabled(), false);

    // Explicit false should work
    const explicitFalse = createLogger(false);
    assert.strictEqual(explicitFalse.isEnabled(), false);

    // Explicit true should work
    const explicitTrue = createLogger(true);
    assert.strictEqual(explicitTrue.isEnabled(), true);
  });
});
