# AGENTS.md

## Purpose

Defines agent protocols, behaviors, and context management for the Gilbert (WebProducer) project. This document replaces `.github/copilot-instructions.md` and follows the [agents.md](https://agents.md/) specification for AI agent prompting and documentation.

---

## Diary Update Protocol

- After each development session, append a summary of the day's work to `docs/diary.md` in Markdown format.
- Each entry must be datestamped (YYYY-MM-DD) and added in **chronological ascending order** (oldest entries first, newest entries last).
- Summaries should be concise, highlight key accomplishments, and reflect architectural or workflow changes.
- If a session summary is missing, prompt the user to record it before proceeding with new work.
- When diary entries are found out of chronological order, reorganize them to maintain proper date sequence.
- Periodically (at least once per session), read the entire `docs/diary.md` file to maintain a running context of work accomplished, architectural decisions, and project history. Use this context to inform summaries, recommendations, and future work.

**Example Entry:**

```markdown
## 2025-09-13

Summary of today's work and decisions...
```

---

## Agent Protocols

### Context Awareness

- Always maintain awareness of the current project state by reading `docs/diary.md` and recent commit history.
- Use architectural decisions, workflow changes, and historical context to inform recommendations and actions.

### Session Summaries

- At the end of each session, generate a concise summary of work accomplished, decisions made, and next steps.
- Append this summary to `docs/diary.md`.

### Prompting Standards

- Follow [agents.md](https://agents.md/) conventions for agent instructions, context management, and documentation.
- Use Markdown headings, lists, and code blocks for clarity and structure.

## Gilbert Project Context

- Gilbert is a streams-based, data-driven static site generator for modern deployment environments.
- Core engine uses Web API streams (ReadableStream, TransformStream, WritableStream).
- Integration adapters handle filesystem and network I/O.
- Pipelines process templates, scripts, stylesheets, and static files using GilbertFile objects.
- Project history, architectural decisions, and workflow changes are recorded in `docs/diary.md`.

## References

- [agents.md specification](https://agents.md/)
- [Gilbert documentation](./docs/developer-guide.md)
