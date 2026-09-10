---
trigger: always_on
description: Core software development discipline and engineering workflows from obra/superpowers (brainstorming, TDD, systematic debugging, planning, and verification).
---

## Superpowers Development Methodology

This workspace has the **Superpowers** skill suite installed in `.agents/skills/`.

### Core Rules

1. **Invoke relevant skills BEFORE response or action**:
   - Before any creative work, building features, or modifying behavior: invoke `brainstorming` (`.agents/skills/brainstorming/SKILL.md`).
   - Before proposing or implementing fixes for bugs, test failures, or crashes: invoke `systematic-debugging` (`.agents/skills/systematic-debugging/SKILL.md`).
   - Before writing any implementation code: invoke `test-driven-development` (`.agents/skills/test-driven-development/SKILL.md`). **Iron Law: No production code without a failing test first.**
   - Before multi-step execution: invoke `writing-plans` (`.agents/skills/writing-plans/SKILL.md`).
   - Before claiming work is complete, fixed, or passing: invoke `verification-before-completion` (`.agents/skills/verification-before-completion/SKILL.md`).
   - When executing plans: invoke `subagent-driven-development` or `executing-plans`.

2. **Skill Priority**:
   - Process skills come first (`brainstorming`, `systematic-debugging`, `test-driven-development`, `writing-plans`).
   - Implementation skills (`design-system`, `ui-ux-pro-max`, etc.) carry out the agreed design.

3. **Antigravity Tool Mapping**:
   - **Subagents**: Use `invoke_subagent` with `TypeName: "self"` for full-capability work, or `"research"` for read-only exploration.
   - **Task Tracking**: Maintain task artifacts (markdown checklists via `write_to_file` and `replace_file_content`). Do **not** confuse this with `manage_task`, which manages background OS processes.
   - **Verification**: Always obtain hard evidence (command output, test runs) before asserting success.
