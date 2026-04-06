# Gilbert R2 Adapter RSP <!-- omit in toc -->

> This file has moved to [reference/gilbert-r2-adapter-rsp.md](./reference/gilbert-r2-adapter-rsp.md).

---

> Instructions
>
> This is a template for creating a Requirements, Specification and Plan (RSP) document. Replace the placeholder text with your specific information. It is intended for an AI agent to use to create a new feature.
> When complete, remove this instruction block and update the filename and title to reflect the specific feature being documented.

## Table of Contents <!-- omit in toc -->

- [Requirements](#requirements)
- [Specification](#specification)
- [Plan](#plan)

## Requirements

> **Instructions for AI Agent:**
>
> Use this section to gather comprehensive requirements for the new feature. Ask the user targeted questions from each category below. Not all questions will apply to every feature - use your judgment to focus on the most relevant areas. Document the user's responses under each subsection.
>
> **Question Categories:**

### 1. Feature Overview

Ask the user to describe:

- What is the primary purpose of this feature?
- Who are the target users (developers, content creators, end-users)?
- What problem does this feature solve?
- How does this feature align with Gilbert's core philosophy and architecture?

### 2. Functional Requirements

Explore these areas:

- What specific actions should users be able to perform?
- What inputs does the feature accept? (files, data, configuration)
- What outputs does it produce? (files, data, logs, notifications)
- What are the key user workflows or use cases?
- Are there any data transformation or processing requirements?
- Does this feature need to integrate with existing Gilbert pipelines?

### 3. Technical Requirements

Investigate:

- Which Gilbert packages will be affected? (gilbert, gilbert-file, gilbert-fs, gilbert-github, gilbert-cli)
- Does this feature require new streams or transform operations?
- Are there specific performance requirements or constraints?
- Should this work in both build and publish modes?
- Are there any runtime-agnostic requirements (Node.js, Deno, browsers)?
- Does this feature need adapter interface compatibility?

### 4. Integration Requirements

Consider:

- How should this feature integrate with existing pipelines?
- Are there external dependencies or services required?
- Does this need CLI command support?
- Are there configuration requirements (gilbert.config.js)?
- Should this feature support middleware or plugins?

### 5. User Experience Requirements

Address:

- What is the expected developer experience (DX)?
- How should errors and edge cases be handled?
- What logging or debugging information is needed?
- Are there any CLI usability considerations?
- What documentation will users need?

### 6. Constraints and Assumptions

Document:

- What are the technical limitations or constraints?
- What assumptions are we making about user knowledge or setup?
- Are there compatibility requirements with existing features?
- What are the backwards compatibility considerations?
- Are there any security or privacy considerations?

### 7. Success Criteria

Define:

- How will we know this feature is successful?
- What metrics or outcomes should we measure?
- What are the acceptance criteria?
- Are there any performance benchmarks to meet?

### 8. Future Considerations

Explore:

- How might this feature evolve in the future?
- What extensibility points should we consider?
- Are there related features that might be built later?
- How does this fit into the broader Gilbert roadmap?

---

**Gathered Requirements:**

### Feature Overview

- **Primary Purpose**: To provide a new adapter that allows Gilbert to write files to a Cloudflare R2 bucket.
- **Target Users**: Developers already using Gilbert to build and publish websites.
- **Problem Solved**: This feature extends Gilbert's capability by adding a new destination for built files, moving beyond the local filesystem (`gilbert-fs`) to a cloud-based object store.
- **Alignment with Philosophy**: It aligns perfectly with Gilbert's modular philosophy by providing a discrete, optional component that developers can choose to use, rather than bloating the core engine.

### Functional Requirements

- **Actions**: The adapter will be write-only for the initial version. If the `read()` method is called, it must return a clear and helpful error message indicating it is not implemented.
- **Inputs**:
  - A `ReadableStream` of `GilbertFile` objects from an upstream Gilbert pipeline.
  - Configuration provided via the constructor, including R2 bucket name, path, account ID, and an API token. This configuration may be sourced from a `wrangler.json` file.
- **Outputs**: The adapter will output a stream of `GilbertFile` objects that have been successfully written to R2, maintaining consistency with the existing `gilbert-fs` adapter pattern.
- **User Workflow**: It will act as a "sink" at the end of a pipeline. The user workflow is identical to using any other output adapter, with the only difference being the final destination of the files.
- **Data Transformation**: No data transformations are required. All transformations are assumed to have occurred in upstream pipelines before reaching this adapter.

### Technical Requirements

- **Affected Packages**: This is a self-contained feature. Only the new `gilbert-r2` package will be created. No other Gilbert packages are expected to be modified.
- **Streams**: The adapter will implement a `WritableStream` to accept incoming files. No `ReadableStream` or `TransformStream` is required for the initial version.
- **Performance**: Performance is a critical requirement. While the overall Gilbert benchmark is ~200 pages/second, the target for the R2 adapter is to write 200 pages in 4 seconds or less, accounting for network latency.
- **Runtime Agnosticism**: The adapter must target WinterCG standards to ensure it is runtime-agnostic. While it is expected to be used heavily in Cloudflare Workers, it should not be exclusive to that environment.
- **Authentication**: Authentication credentials and other R2-specific settings will be passed into the adapter's constructor. The developer is responsible for securely sourcing these values (e.g., from environment variables or a secrets manager). For testing purposes, these can be loaded from a local `.env` file.

### Integration Requirements

- **Pipeline Integration**: The adapter is designed to be a "sink" at the very end of a Gilbert pipeline.
- **External Dependencies**: The official Cloudflare R2 client library will be required.
- **CLI Support**: No CLI support is needed. The `gilbert-cli` package is considered outdated and is not part of this development effort.
- **Configuration**: The adapter will be instantiated and configured directly in the developer's build script (e.g., `const r2Adapter = new GilbertR2({ ... });`).
- **Middleware**: No support for middleware or plugins is required for this version.

### User Experience Requirements

- **Developer Experience (DX)**: The DX should be simple and consistent with existing adapters. Instantiation should be straightforward (`new GilbertR2({ bucket: '...' })`) and its use in a pipeline should be intuitive (`.pipeThrough(r2Adapter.write('/'))`).
- **Error Handling**: The adapter must provide detailed and helpful error messages. Crucially, it must not leak any sensitive information, such as API tokens, in logs.
- **Logging**: Logging should follow the established patterns in `gilbert-fs`, providing basic logs for success and the option for more detailed debug logs.
- **API Consistency**: The adapter must expose a `read()` and `write()` method and a constructor to provide an identical interface to other Gilbert adapters, abstracting the underlying storage mechanism.
- **Documentation**: The `docs/developer-guide.md` file must be updated to include the new `gilbert-r2` adapter, referencing the "Adapter Interface Specification".

### Constraints and Assumptions

- **Technical Constraints**: A file size limit of 100 MiB per file will be enforced for the initial version to avoid the complexity of implementing multipart uploads.
- **User Assumptions**: It is assumed that developers using this adapter are doing so within a Cloudflare Worker project and are familiar with the Cloudflare ecosystem, including Wrangler.
- **Compatibility**: The implementation must adhere strictly to the patterns and specifications outlined in the `developer-guide.md`.
- **Backwards Compatibility**: There are no backwards compatibility concerns, as this is a new feature being developed as part of a major, breaking-change refactoring.
- **Security**: Standard security best practices for handling secrets and API tokens must be followed. The adapter itself should not introduce any new security challenges.

### Success Criteria

- **Functionality**: The adapter successfully and reliably writes a stream of files from a Gilbert pipeline to a Cloudflare R2 bucket.
- **Performance**: The adapter is "blazingly fast," with a target of writing 200 pages to R2 in 4 seconds or less.
- **Acceptance Criteria**:
  - Files are successfully written to the specified R2 bucket and path.
  - The adapter correctly handles authentication with R2.
  - Errors (e.g., invalid credentials, network issues) are logged clearly without exposing secrets.
  - A call to the `read()` method returns a helpful error message stating it is not implemented.

### Future Considerations

- **Multipart Uploads**: In the future, the adapter should be updated to support multipart uploads for files larger than 100 MiB.
- **Read Capability**: The `read()` method could be fully implemented to allow reading files from an R2 bucket.
- **Synchronization**: Deletion capabilities could be added to enable true synchronization, where files that no longer exist in the source are removed from the R2 bucket.
- **Etag/Hash Comparison**: The adapter should be designed with the possibility of a future `gilbert-file` feature that adds a unique hash/etag to each file. This would allow for differential uploads, where only changed files are streamed to R2.

## Specification

> **Instructions for AI Agent:**
>
> Transform the gathered requirements above into detailed technical specifications. **Stay strictly within the scope defined in the Requirements section** - do not add features or capabilities that weren't explicitly requested. Use the Gilbert project context and existing architecture patterns as your foundation.
>
> **Key Principles:**
>
> - **No Scope Creep**: Only specify what was requested in Requirements
> - **Gilbert-First**: Leverage existing Gilbert patterns and architecture
> - **Concrete Over Abstract**: Provide specific, implementable specifications
> - **Validate Against Requirements**: Each specification must trace back to a specific requirement
>
> **Specification Process:**

### Step 1: Architecture Analysis

Before writing specifications, analyze:

- Which existing Gilbert components can be reused or extended?
- What new components are truly necessary?
- How does this fit into Gilbert's streams-based architecture?
- What are the minimal changes needed to existing code?

### Step 2: Component Specifications

For each component identified, specify:

- **Purpose**: Single responsibility and scope
- **Interface**: Inputs, outputs, and public API
- **Dependencies**: What it requires from other components
- **Integration Points**: How it connects to existing Gilbert systems
- **Data Flow**: How data moves through the component

### Step 3: Implementation Guidelines

Define:

- **Code Organization**: Which packages/files will be affected
- **Naming Conventions**: Follow Gilbert's existing patterns
- **Error Handling**: Consistent with Gilbert's approach
- **Testing Strategy**: Unit tests, integration tests, examples
- **Documentation Requirements**: JSDoc, README updates, examples

### Step 4: Validation Checklist

Ensure specifications address:

- [ ] All functional requirements from Requirements section
- [ ] All technical requirements from Requirements section
- [ ] Gilbert's streams-based architecture principles
- [ ] Runtime-agnostic design (where applicable)
- [ ] Adapter interface compatibility (where applicable)
- [ ] Build vs. publish mode considerations (where applicable)
- [ ] Backwards compatibility requirements
- [ ] Performance constraints identified in Requirements

---

**Technical Specification:**

### Architecture Overview

The `gilbert-r2` adapter will be a new, self-contained package (`@tforster/gilbert-r2`) located in the `services/` directory. It is designed to integrate seamlessly with the Cloudflare Workers environment by using the native R2 bucket binding, making it the ideal solution for publishing Gilbert sites from within a Worker. It will adhere to the established Gilbert adapter interface, functioning as a high-performance "sink" for file streams.

### Component Specifications

#### Component: `GilbertR2`

- **Purpose**: To provide a `WritableStream` that uploads `GilbertFile` objects to a Cloudflare R2 bucket via a [Worker binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#r2-bucket-binding).
- **Package**: A new package, `@tforster/gilbert-r2`, will be created in the `services/` directory.
- **Dependencies**:
  - `@tforster/gilbert-file`: For handling the `GilbertFile` objects that flow through the stream.
  - `@tforster/gilbert-logger`: For standardized, environment-aware logging.
- **Data Flow**:
  1. The user creates an R2 bucket binding in their `wrangler.toml` file (e.g., `MY_BUCKET`).
  2. The user instantiates the adapter within their Worker script, passing the binding to the constructor: `const r2Adapter = new GilbertR2(env.MY_BUCKET);`.
  3. The Gilbert pipeline is piped to the `WritableStream` returned from `r2Adapter.write()`.
  4. For each `GilbertFile` that enters the stream, the adapter will:
     a. Read the file's contents from `file.contents`.
     b. Check if the content size exceeds the 100 MiB limit. If it does, the stream will error out.
     c. Construct the R2 object `Key` by joining the `destinationPath` and the `file.relative` path.
     d. Call the native [`bucket.put(key, contents, options)`](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/#r2putoptions) method, setting the `httpMetadata` from `file.contentType`.
  5. Upon successful upload, the original `GilbertFile` object is passed through the stream.

### API Design

The public API will consist of a single exported class: `GilbertR2`.

```javascript
export default class GilbertR2 {
  /**
   * @param {R2Bucket} bucket - An R2 bucket binding, made available in your Worker's environment.
   */
  constructor(bucket);

  /**
   * Creates a WritableStream for writing GilbertFile objects to the R2 bucket.
   * @param {string} [destinationPath='/'] - A prefix to prepend to the object key in the R2 bucket.
   * @returns {WritableStream<GilbertFile>}
   */
  write(destinationPath = '/');

  /**
   * Throws a NotImplementedError. This adapter is write-only.
   */
  read(patterns, options);
}
```

### Data Structures

The adapter will consume `GilbertFile` objects from the input stream and pass them to the output stream. No new data structures will be created.

### Configuration Changes

No changes will be made to any central configuration like `gilbert.config.js`. All configuration for the adapter is handled by the R2 binding passed to its constructor.

### Integration Points

The primary integration point is with the Gilbert core engine via stream piping. The `WritableStream` provided by the `write()` method is designed to be the final destination in a Gilbert pipeline running within a Cloudflare Worker.
**Example Usage (in a Worker script):**

```javascript
// Assumes `env.MY_BUCKET` is an R2 binding
const r2Adapter = new GilbertR2(env.MY_BUCKET);
await gilbert.compile().pipeTo(r2Adapter.write("/my-site"));
```

### Error Handling Strategy

- **Configuration Errors**: The `GilbertR2` constructor will throw a `TypeError` if the `bucket` object is not provided or does not appear to be a valid R2 binding.
- **File Size Errors**: If a file's contents exceed the 100 MiB limit, the stream will be aborted by calling `controller.error()` with a descriptive error message.
- **Upload Errors**: Any errors from the R2 `put()` operation will be caught, logged to the console, and propagated through the stream via `controller.error()`.
- **Read Method Error**: Calling `read()` will throw a `NotImplementedError` with the message "The GilbertR2 adapter is write-only and does not support the read() method."

### Testing Approach

- **Unit Tests**: Will require mocking the `R2Bucket` object and its `put` method to verify that it is called with the correct parameters (`key`, `contents`, and `httpMetadata`).
- **Integration Tests**: Will be designed to run in a local environment using [Miniflare](https://miniflare.dev/), which can simulate the Cloudflare Workers runtime and R2 bindings. This allows for testing the entire workflow without deploying to Cloudflare.

---

## Plan

> **Instructions for AI Agent:**
>
> Create a concrete implementation plan based on the Specification above. Break down the work into logical, sequential steps that minimize risk and enable incremental progress. **Focus on the minimal viable implementation** that satisfies the requirements.
>
> **Planning Principles:**
>
> - **Start Small**: Begin with the smallest possible working implementation
> - **Build Incrementally**: Each step should produce a working, testable result
> - **Test Early**: Include testing and validation at each step
> - **Dependencies First**: Implement dependencies before dependents
> - **Gilbert Patterns**: Follow established Gilbert development patterns
>
> **Planning Process:**

### Step 1: Dependency Analysis

Identify:

- What existing Gilbert components need modification?
- What new components must be created?
- What is the optimal order of implementation?
- Where are the integration points and potential risks?

### Step 2: Implementation Phases

Organize work into phases:

- **Phase 1**: Core functionality (minimal viable feature)
- **Phase 2**: Integration with existing systems
- **Phase 3**: Enhanced features and edge cases
- **Phase 4**: Documentation and examples

### Step 3: Risk Assessment

For each phase, identify:

- Technical risks and mitigation strategies
- Integration challenges and solutions
- Testing requirements and validation criteria
- Rollback strategies if needed

### Step 4: Validation Strategy

Define how to validate each step:

- Unit tests to write/update
- Integration tests required
- Manual testing procedures
- Performance validation (if applicable)

---

**Implementation Plan:**

### Prerequisites

- [x] Code review of `gilbert-fs` to understand the existing adapter pattern.
- [x] Validation that requirements are complete and unambiguous.
- [x] Confirmation that the specification addresses all requirements.
- [ ] Setup of the development environment, including [Miniflare](https://miniflare.dev/) for local testing of the Workers environment.

---

### Phase 1: Core Implementation & Unit Testing

**Goal**: Create the minimal viable `gilbert-r2` package with a functional `write` method and robust unit tests.

**Step 1.1: Package Scaffolding**

- **Objective**: Create the directory structure and initial files for the new `@tforster/gilbert-r2` package.
- **Files to Create**:
  - `services/gilbert-r2/package.json`
  - `services/gilbert-r2/lib/index.js`
  - `services/gilbert-r2/tests/gilbert-r2.test.js`
  - `services/gilbert-r2/README.md` (initially as a placeholder)

**Step 1.2: Implement `GilbertR2` Class Shell**

- **Objective**: Implement the `GilbertR2` class structure, constructor, and the `read()` method stub.
- **Files to Modify**: `services/gilbert-r2/lib/index.js`
- **Implementation Details**: Implement the `GilbertR2` constructor to accept and validate a single `R2Bucket` binding object. Implement the `read()` method to throw a `NotImplementedError`.

**Step 1.3: Implement `write()` Method**

- **Objective**: Implement the core `write()` method that returns a `WritableStream` for uploading files.
- **Files to Modify**: `services/gilbert-r2/lib/index.js`
- **Implementation Details**: Create a `WritableStream` where the `write` function contains the main logic: reading `GilbertFile` contents, checking the 100 MiB size limit, and using the native `bucket.put()` method.

**Step 1.4: Unit Testing**

- **Objective**: Write comprehensive unit tests for the `GilbertR2` class.
- **Files to Modify**: `services/gilbert-r2/tests/gilbert-r2.test.js`
- **Implementation Details**: Mock the `R2Bucket` object and its `put` method to verify correct usage, parameter passing (key, contents, httpMetadata), and error handling.

---

### Phase 2: Integration & Documentation

**Goal**: Ensure the adapter works within the broader Gilbert ecosystem and is well-documented for users.

**Step 2.1: Integration Testing**

- **Objective**: Create an end-to-end integration test to validate the adapter in a real-world scenario.
- **Files to Create**: A new test file in the root `/tests` directory (e.g., `tests/r2-integration.test.js`).
- **Implementation Details**: This test will use Miniflare to create a local server that simulates the Worker environment, including the R2 binding. It will then run a full Gilbert build and pipe the stream to the adapter to verify the end-to-end workflow.

**Step 2.2: Documentation**

- **Objective**: Document the new adapter for developers.
- **Files to Modify**:
  1. `docs/developer-guide.md`: Add `gilbert-r2` to the list of official adapters with a clear usage example.
  2. `services/gilbert-r2/README.md`: Create a comprehensive README that explains how to configure the R2 binding in `wrangler.toml` and how to pass the binding to the adapter's constructor.

### Risk Mitigation

| Risk                                               | Impact | Probability | Mitigation Strategy                                                                                                                |
| -------------------------------------------------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Local testing of a Worker-specific API is complex. | Medium | Medium      | Use Miniflare to create a high-fidelity simulation of the Cloudflare environment, reducing the risk of deployment-specific issues. |
| Performance Target Not Met                         | Low    | Low         | Benchmark after core implementation. The native R2 API is expected to be highly performant.                                        |

### Definition of Done

- [ ] All steps in the implementation plan are complete.
- [ ] The `gilbert-r2` package is created with a functional `write` method that uses the native R2 Workers API.
- [ ] Unit and integration tests (using Miniflare) are passing with good coverage.
- [ ] The `developer-guide.md` and the package's `README.md` are updated with instructions for using the R2 binding.
- [ ] The code is reviewed and adheres to Gilbert's conventions.
