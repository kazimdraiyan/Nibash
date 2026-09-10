---
trigger: always_on
description: Behavioral guidelines derived from Andrej Karpathy's observations to reduce common LLM coding mistakes (think before coding, simplicity first, surgical changes, goal-driven execution).
---

## Andrej Karpathy Coding Guidelines

When writing, reviewing, or refactoring code:

### 1. Think Before Coding
- **State assumptions explicitly**: If uncertain, clarify rather than guessing.
- **Surface tradeoffs**: If multiple interpretations or approaches exist, present them.
- **Simpler alternatives**: Propose simpler alternatives when warranted; push back on unnecessary complexity.

### 2. Simplicity First
- **Minimal code**: Write the minimum code that solves the user's problem cleanly. Nothing speculative.
- **No unrequested abstractions**: Avoid wrappers, configurability, or abstractions for single-use code.
- **No defensive code for impossible scenarios**.
- If 50 lines suffice, never write 200 lines.

### 3. Surgical Changes
- **Touch only what is necessary**: Never modify adjacent code, comments, or formatting unnecessarily.
- **Do not refactor what works**: Preserve working existing implementations.
- **Traceability**: Every changed line must directly trace to the user's request.
- **Clean up your own mess**: Remove unused imports or variables introduced by your edits; do not touch unrelated dead code unless asked.

### 4. Goal-Driven Execution
- **Verifiable criteria**: Frame tasks as testable/verifiable goals before and after changes.
- **Loop until verified**: Gather concrete command or test evidence before declaring success.
