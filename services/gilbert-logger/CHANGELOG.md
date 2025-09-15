# Changelog

All notable changes to @tforster/gilbert-logger will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-09-14

### Added

- Initial release of gilbert-logger
- `createLogger(debug)` factory function for creating logger instances
- Async logging support using `setTimeout(..., 0)` for non-blocking behavior
- Zero-overhead no-op functions when logging is disabled
- Support for `log`, `warn`, `debug` (async) and `error` (synchronous) methods
- `isEnabled()` method to check logger state
- Comprehensive test suite with async behavior validation
- Performance benchmarking tests
- Full JSDoc documentation
- Zero-dependency implementation
- WinterCG compatibility (runtime-agnostic design)

### Design Principles

- Performance-first architecture for Gilbert's high-throughput requirements
- Zero dependencies to maintain lean Gilbert ecosystem
- Runtime-agnostic design using only Web API standards
- Async logging when enabled, zero overhead when disabled
- Synchronous error logging for reliability
