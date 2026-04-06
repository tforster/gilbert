# AGENTS.md

## Purpose

Defines agent protocols, behaviours, and context management for the Gilbert project. This document replaces `.github/copilot-instructions.md` and follows the [agents.md](https://agents.md/) specification for AI agent prompting and documentation.

---

## Agent Protocols

### Context Awareness

- Use architectural decisions, workflow changes, and historical context to inform recommendations and actions.

### Prompting Standards

- Follow [agents.md](https://agents.md/) conventions for agent instructions, context management, and documentation.
- Use Markdown headings, lists, and code blocks for clarity and structure.

## Gilbert Project Context

- Gilbert is a streams-based, data-driven static site generator for modern deployment environments.
- Core engine uses Web API streams (ReadableStream, TransformStream, WritableStream).
- Integration adapters handle filesystem and network I/O.
- Pipelines process templates, scripts, stylesheets, and static files using GilbertFile objects.

## References

- [agents.md specification](https://agents.md/)
- [Gilbert documentation](./docs/developer-guide.md)
