# How to Contribute to Gilbert <!-- omit in toc -->

This guide covers setting up a development environment and submitting changes to the Gilbert project.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Development Setup](#2-development-setup)
- [3. Coding Standards](#3-coding-standards)
- [4. Git Workflow](#4-git-workflow)
- [5. Submitting a Pull Request](#5-submitting-a-pull-request)
- [6. Verification](#6-verification)

## 1. Prerequisites

- Node.js 18+ or Bun 1.0+
- Git
- A text editor with JavaScript support (VS Code recommended)

## 2. Development Setup

```bash
# Clone the repository
git clone https://github.com/tforster/gilbert.git
cd gilbert

# Install all workspace dependencies
npm install

# Run the full test suite to confirm a clean baseline
npm test
```

## 3. Coding Standards

**Language and modules:**

- ES modules (`import` / `export`) — no CommonJS `require`
- Modern JavaScript (ESNext) — not TypeScript
- `const` over `let`; no `var`
- `async` / `await` over Promise chains

**ES6 class conventions:**

- Use ES6 classes with `#` prefix for private members (`#field`, `#method()`)
- Export classes as default exports from files named after the class (PascalCase: `MyClass.js`)
- Instance usage: `const myClass = new MyClass(options)`
- Target environments: modern evergreen browsers, Node.js 18+, Cloudflare Workers, Deno, Bun

**Documentation:**

- JSDoc required on all public methods and classes
- British/Canadian English spelling in all documentation: organise, colour, behaviour, centre, optimise, analyse, initialise

**Formatting** (enforced via ESLint / Prettier):

- 2-space indentation
- Double quotes for strings
- Trailing commas (ES5 style)
- 132-character line maximum

**Example:**

```javascript
/**
 * Creates a new Gilbert pipeline with the specified configuration.
 * @param {Object} config - Pipeline configuration
 * @param {ReadableStream} config.templates - Handlebars template stream
 * @param {Object} config.data - Data configuration
 * @returns {Gilbert} Configured Gilbert instance
 */
export default class Gilbert {
  #options;

  constructor(streams, options = {}) {
    this.#options = options;
  }
}
```

## 4. Git Workflow

```bash
# Create a feature branch
git checkout -b feature/amazing-feature

# Commit with conventional commit format
git commit -m 'feat(gilbert-fs): add support for glob patterns in read()'

# Push and open a PR
git push origin feature/amazing-feature
```

**Commit message format:**

```text
type(scope): description

body (optional)

footer (optional)
```

**Types:**

| Type       | When to use                            |
| :--------- | :------------------------------------- |
| `feat`     | New feature                            |
| `fix`      | Bug fix                                |
| `docs`     | Documentation changes                  |
| `style`    | Code style changes (no logic change)   |
| `refactor` | Code restructuring (no feature or fix) |
| `test`     | Adding or updating tests               |
| `chore`    | Maintenance, dependency updates        |

## 5. Submitting a Pull Request

1. Ensure all tests pass: `npm test`
2. Run the linter: `npm run lint`
3. Update `CHANGELOG.md` for your package
4. Update relevant documentation (British/Canadian English spellings)
5. Open a Pull Request against `main` and request a review from the maintainers

## 6. Verification

Before submitting:

- [ ] `npm test` — all tests passing
- [ ] `npm run lint` — no lint errors
- [ ] New public APIs have JSDoc
- [ ] Documentation updated if behaviour changed
- [ ] `CHANGELOG.md` updated

[← Back to How-To Guides](./README.md)
