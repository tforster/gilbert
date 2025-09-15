# @tforster/gilbert-logger

Lightweight async logger for Gilbert static site generator with zero dependencies and runtime-agnostic design.

## Features

- **Zero Dependencies**: No external packages required
- **Async by Design**: Uses `setTimeout(..., 0)` for non-blocking logging when enabled
- **Zero Overhead**: No-op functions when logging is disabled
- **Runtime Agnostic**: Works across Node.js, Deno, Bun, Cloudflare Workers
- **WinterCG Compatible**: Uses only Web API standards
- **Performance First**: Optimized for Gilbert's 200+ pages/second target

## Usage

```javascript
import { createLogger } from "@tforster/gilbert-logger";

// Production mode - zero overhead
const logger = createLogger(false);
logger.log("This does nothing"); // No-op function

// Development mode - async logging
const debugLogger = createLogger(true);
debugLogger.log("This logs asynchronously"); // Non-blocking
debugLogger.warn("Async warning"); // Non-blocking
debugLogger.debug("Debug information"); // Non-blocking
debugLogger.error("Critical error"); // Synchronous (always enabled)

// Check if logging is enabled
if (logger.isEnabled()) {
  // Do expensive logging operations
}
```

## API

### `createLogger(debug?: boolean): Logger`

Creates a logger instance with configurable debug mode.

**Parameters:**

- `debug` (boolean, optional): Enable/disable logging. Defaults to `false`.

**Returns:**

- Logger instance with `log`, `warn`, `error`, `debug`, and `isEnabled` methods.

### Logger Methods

- `log(...args)`: General information logging (async when enabled, no-op when disabled)
- `warn(...args)`: Warning logging (async when enabled, no-op when disabled)
- `error(...args)`: Error logging (always synchronous for reliability)
- `debug(...args)`: Debug information logging (async when enabled, no-op when disabled)
- `isEnabled()`: Returns boolean indicating if logging is enabled

## Performance

When disabled, all methods (except `error`) are no-op functions with zero overhead.
When enabled, `log`, `warn`, and `debug` use `setTimeout(..., 0)` for async execution.

**Benchmark Results:**

- Disabled logger: ~0.1ms for 1000 calls (no-op overhead)
- Enabled logger: ~5-10ms for 1000 calls (async scheduling overhead)
- Both modes: Sub-100ms for production workloads

## Design Philosophy

Gilbert-logger follows Gilbert's core principles:

1. **Zero Dependencies**: Lean implementation using only JavaScript standards
2. **Runtime Agnostic**: Compatible with all WinterCG-compliant runtimes
3. **Performance First**: Designed for high-throughput static site generation
4. **Simple API**: Minimal surface area, easy to understand and maintain

## Why Async Logging?

Synchronous `console.log` can significantly impact performance in high-throughput scenarios. In Gilbert's template processing, even 6 console.log calls per file can create measurable slowdown when processing hundreds of files.

Gilbert-logger solves this by:

- Making logging async when enabled (non-blocking)
- Using no-op functions when disabled (zero overhead)
- Keeping errors synchronous (reliability over performance)

## License

MIT
