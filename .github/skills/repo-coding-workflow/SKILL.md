---
name: Repo-Coding-Workflow
description: "How to work on tools and code in this repo: research, plan, annotate, implement"
---

# Repo Coding Workflow

Use this skill when building or modifying any code in this repo: scripts in `tools/scripts/`, the `lm` CLI, initiative tooling, or any multi-file code change.

**Core principle**: Never write code until a written plan has been reviewed and approved. Separate thinking from typing.

---

## The Loop

```
Research → Plan → Annotate (1-6x) → Todo List → Implement → Terse Corrections
```

---

## Phase 1: Research

Before any code change, deeply read the relevant code. Write findings to a file — not just a chat summary. The file is the review surface.

**Prompt pattern:**
> "Read `tools/scripts/todo.sh` and the `lm` entry point in depth. Understand how they work, all their specificities, and how they interact. When done, write a detailed `research.md` in the session workspace documenting your findings."

**Language that matters**: "deeply", "in great detail", "all specificities", "don't stop until you've read everything". Without emphatic language, the model skims at signature level. With it, the model reads implementations. This is not fluff — it changes behavior.

**Why research first**: The most expensive failure mode is code that works in isolation but breaks surrounding systems — a script that ignores existing conventions, a function that duplicates logic already in `lm`. Research prevents this.

---

## Phase 2: Plan

After reviewing `research.md`, request a plan — also written to a file.

**Prompt pattern:**
> "I want to add X to the `lm` CLI that does Y. Write a detailed `plan.md` in the session workspace. Include code snippets, file paths that will change, and trade-offs. Read source files before suggesting changes — base the plan on the actual codebase. Don't implement yet."

**Reference existing patterns**: This codebase has established patterns — `todo.sh`, `navigate.sh`, etc. Tell Claude to match them:
> "The new command should follow the same structure as `tools/scripts/note.sh` — same argument handling, same output style."

Pointing at a reference communicates all implicit requirements without spelling them out.

---

## Phase 3: Annotation Cycle

This is where you inject judgment Claude can't have: your priorities, constraints, product knowledge.

**How it works:**
1. Open `plan.md` in your editor
2. Add inline notes directly in the document — right at the spot that's wrong
3. Send Claude back: `"I added notes to plan.md, address all of them and update the document. Don't implement yet."`
4. Repeat until satisfied (typically 1-4 rounds)

**Example notes you'd add:**
- `"use the existing trip-parsing logic in travel-logistics.sh, don't rewrite it"`
- `"this should write to data/trips.csv, not a new file — single source of truth"`
- `"remove this caching section, not needed here"`
- `"no — this flag should be optional, default to current week"`

**The "don't implement yet" guard is essential.** Without it, Claude will jump to code the moment the plan looks good enough. Add it to every annotation round prompt.

The markdown file is **shared mutable state** between you and Claude. You can annotate precisely, think at your own pace, and re-engage without losing context. This is fundamentally better than steering through chat messages.

---

## Phase 4: Todo List

Before implementation, request a granular task breakdown:

> "Add a detailed todo list to plan.md with all phases and individual tasks. Don't implement yet."

This creates a progress tracker. Claude marks items complete as it works — you can glance at the plan at any point and know exactly where things stand.

---

## Phase 5: Implementation

When the plan is right, one prompt kicks off the whole thing:

> "Implement it all. When you finish a task or phase, mark it complete in plan.md. Do not stop until all tasks are done. Don't add unnecessary comments. Continuously run bash to verify behavior as you go."

What this encodes:
- "implement it all" — don't cherry-pick
- "mark it complete" — plan is the source of truth
- "do not stop" — don't pause for confirmation
- "continuously run bash" — catch problems early

**By the time you say "implement it all," every decision is made.** Implementation should be mechanical, not creative. The creative work happened in annotation cycles.

---

## Phase 6: Terse Corrections

Once Claude is executing, your prompts get short. Claude has full plan context.

- `"You skipped the --dry-run flag."`
- `"The output format should match what todo.sh produces."`
- `"wider"` / `"wrong file"` / `"revert that part"`

For visual/output issues, paste example output of what you expect rather than describing it.

**When things go wrong direction**: Revert and re-scope. Don't patch a bad approach.
> "I reverted that change. Now I only want X — nothing else."

Narrowing scope after a revert almost always produces better results than incremental repair.

---

## Staying in the Driver's Seat

Claude proposes; you decide. Go item-by-item through proposals:

- **Cherry-pick**: "For the first issue, just use X. Skip the third one — not worth the complexity."
- **Trim scope**: "Remove Y from the plan, don't want it now."
- **Protect interfaces**: "The signature of `lm todo` must not change. Callers adapt, not the CLI."
- **Override choices**: "Use `jq` for this, not a custom parser."

---

## Repo-Specific Notes

**File locations:**
- Scripts: `tools/scripts/[name].sh` or `.py`
- CLI entry: `./lm` (dispatches to scripts)
- Initiative code: `initiatives/[name]/` (self-organized)
- Session workspace: `~/.copilot/session-state/[session]/` for `research.md`, `plan.md`

**Conventions to match:**
- Shell scripts use the same argument patterns as existing scripts — check `todo.sh`, `navigate.sh`
- Data writes go to `data/` (single source of truth)
- Config/state goes in initiative directories, not scattered

**Test before declaring done:** Always run the actual command after implementation. Don't trust that it works — verify it.

---

## Model Behavior Notes (from HN discussion)

- **Models are lazy by default** — they'll skim and surface-analyze without explicit prompting for depth. Emphatic language ("deeply", "all specificities") is not superstition; it shifts behavior.
- **Clean, discrete code works better** — small, well-scoped files fit in the model's head. Godclass scripts produce confused implementations.
- **Long single sessions outperform split sessions** — by the time you reach implementation, the model has built up deep understanding through research and annotation rounds. Don't restart unless you have to.
- **Auto-compaction survives** — the plan.md artifact survives context compaction in full fidelity. Point Claude back to it if context gets fuzzy.
- **Revert beats repair** — when an implementation goes sideways, revert and re-scope rather than trying to fix it incrementally.

---

## Quick Reference: Key Prompts

| Phase | Prompt |
|---|---|
| Research | "Read X in depth, understand all specificities. Write research.md. Don't implement." |
| Plan | "Write plan.md for implementing Y. Read source files first. Include code snippets. Don't implement yet." |
| Annotate | "I added notes to plan.md, address all of them and update the document. Don't implement yet." |
| Todo | "Add a detailed todo list to plan.md. Don't implement yet." |
| Implement | "Implement it all. Mark tasks complete in plan.md as you go. Don't stop until done. Run bash to verify." |
| Correction | "[Terse one-liner about what's wrong]" |
