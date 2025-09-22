# TODO: A list of items to be completed as part of the refactoring to Web API streams.

- [x] Reorganise tests to match new npm workspace structure for services

## High Priority: Adapter Architecture & Examples

- [x] **Align adapter interfaces** - Standardize gilbert-fs and gilbert-github to consistent pattern
  - [x] Decide on interface: Constructor + instance methods pattern (ES6 class conventions)
  - [x] Update gilbert-fs from static methods to constructor pattern
  - [x] Validate changes with static-files.test.js (all tests passing)
  - [x] Update gilbert-github to match standardized interface
  - [x] Refactor GGH to read(patterns)/write(destination) interface
  - [x] Remove legacy initialize() and multi-stream routing
  - [x] Create comprehensive test suite for GGH (7 tests passing)
  - [x] Align constructor patterns and JSDoc documentation
  - [x] Document adapter interface specification in developer-guide.md

- [ ] **Create progressive examples** - Build examples folder with increasing complexity
  - [ ] Example 1: Simple JSON files from filesystem (port from existing tests)
  - [ ] Example 2: JSON files with file-level transforms in adapter
  - [ ] Example 3: Real-world GitHub CMS with transforms + pagination (stoptheparty.ca pattern)

- [ ] **Implement stream middleware pattern**
  - [ ] Define middleware interface using Web API TransformStreams
  - [ ] Create pagination middleware for cross-file operations
  - [ ] Document Data Source → Adapter → [Middleware] → Gilbert Core architecture

## Lower Priority

- [ ] Determine how to handle markdown. Is it built into the templates pipeline? Or is it middleware on the data pipeline?
- [ ] Add gilbert logger support to gilbert-github
