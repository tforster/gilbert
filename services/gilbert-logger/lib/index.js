/**
 * @fileoverview Lightweight async logger for Gilbert static site generator
 * @description Provides zero-dependency, runtime-agnostic logging with async behavior when enabled
 * and zero overhead when disabled. Uses setTimeout(..., 0) for WinterCG compatibility.
 */

/**
 * @typedef {object} Logger
 * @property {function(...any): (number|void)} log - Log general information (returns timer ID when enabled, void when disabled)
 * @property {function(...any): (number|void)} warn - Log warnings (returns timer ID when enabled, void when disabled)
 * @property {function(...any): void} error - Log errors (always synchronous for reliability)
 * @property {function(...any): (number|void)} debug - Log debug information (returns timer ID when enabled, void when disabled)
 * @property {function(): boolean} isEnabled - Check if debug mode is enabled
 */

/**
 * Creates a logger instance with configurable debug mode
 * @param {boolean} [debug=false] - Whether to enable logging output
 * @returns {Logger} Logger instance with log, warn, error, debug, and isEnabled methods
 *
 * @example
 * // Disabled logger (production) - zero overhead
 * const logger = createLogger(false);
 * logger.log("This does nothing"); // No-op
 *
 * @example
 * // Enabled logger (development) - async logging
 * const logger = createLogger(true);
 * logger.log("This logs asynchronously"); // Non-blocking
 * logger.error("Errors are always synchronous"); // Blocking (for reliability)
 */
export const createLogger = (debug = false) => {
  if (debug) {
    // Debug mode: Async logging for performance
    return {
      /**
       * Log general information asynchronously
       * @param {...any} args - Arguments to log
       * @returns {*} Timer ID from setTimeout
       */
      // eslint-disable-next-line no-console
      log: (...args) => setTimeout(() => console.log(...args), 0),

      /**
       * Log warnings asynchronously
       * @param {...any} args - Arguments to log
       * @returns {*} Timer ID from setTimeout
       */
      // eslint-disable-next-line no-console
      warn: (...args) => setTimeout(() => console.warn(...args), 0),

      /**
       * Log errors synchronously (for reliability)
       * @param {...any} args - Arguments to log
       * @returns {void}
       */
      // eslint-disable-next-line no-console
      error: (...args) => console.error(...args),

      /**
       * Log debug information asynchronously
       * @param {...any} args - Arguments to log
       * @returns {*} Timer ID from setTimeout
       */
      // eslint-disable-next-line no-console
      debug: (...args) => setTimeout(() => console.log("[DEBUG]", ...args), 0),

      /**
       * Check if debug mode is enabled
       * @returns {boolean} True if debug mode is enabled
       */
      isEnabled: () => true,
    };
  } else {
    // Production mode: No-op functions for zero overhead
    return {
      /**
       * No-op log function
       */
      log: () => {},

      /**
       * No-op warn function
       */
      warn: () => {},

      /**
       * Log errors synchronously (always enabled for critical issues)
       * @param {...any} args - Arguments to log
       */
      // eslint-disable-next-line no-console
      error: (...args) => console.error(...args),

      /**
       * No-op debug function
       */
      debug: () => {},

      /**
       * Check if debug mode is enabled
       * @returns {boolean} False if debug mode is disabled
       */
      isEnabled: () => false,
    };
  }
};

/**
 * Default export for convenience
 */
export default createLogger;
