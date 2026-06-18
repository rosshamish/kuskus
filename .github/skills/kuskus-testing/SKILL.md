---
name: Kuskus-Testing
description: Test philosophy, coverage map, and automation strategy for kuskus
---

# Kuskus Testing

## Philosophy

**Manually-tested behavior is risk.**

Every behavior that can only be verified by a human is a regression waiting to happen.
The goal is to catch defects as early as possible in the software lifecycle:

```
code (lint) → build (tsc) → unit test → integration test → E2E → manual
     ↑ cheapest, fastest                                      ↑ expensive, slow
```

Push coverage left. If something is manual-only today, ask: "Can this be automated?"

---

## Current Coverage Map

| Package | Lint | Build | Unit | Integration | E2E | Manual |
|---|---|---|---|---|---|---|
| kusto-language-server/client | ✅ | ✅ | ❌ | ❌ | ⚠️ 2 tests | ✅ |
| kusto-language-server/server | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| kusto-syntax-highlighting | ❌ | ✅ | — | ✅ grammar snaps | — | ✅ visual |
| kusto-color-themes | ❌ | — | — | ⚠️ exist check | — | ✅ visual |
| kusto-extensions-pack | ❌ | — | — | ❌ | — | ✅ |

⚠️ = exists but not wired to CI

---

## Accepted Manual-Only Risks

These cannot be cheaply automated. Document here so maintainers know what to
manually verify before each release:

1. **Live cluster auth** — `https://help.kusto.windows.net` AAD authentication flow.
   Requires a real Azure identity. Cannot be mocked in CI.
2. **Visual theme rendering** — Color correctness in editor. CodeSnap screenshots
   are maintained manually. Subjective — no pixel-diff CI.
3. **Marketplace publish** — vsce publish + extension store listing. Manual smoke
   test after each publish.

---

## Running Tests Locally

```bash
# Language server E2E (requires display — use xvfb-run on Linux)
cd kusto-language-server
npm run compile
npm test

# Syntax highlighting grammar snapshots
cd kusto-syntax-highlighting
npm test                    # runs vscode-tmgrammar-snap
npm run test:update         # regenerate snapshots after intentional grammar change

# Lint all
cd kusto-language-server && npm run lint
```

---

## CI Gates (as of 2026-03)

| Workflow | Lint | Build | Test |
|---|---|---|---|
| kusto-language-server-pr-validation | ✅ | ✅ | ❌ missing — see kuskus-7f1 |
| kusto-syntax-highlighting-pr-validation | ❌ | ✅ | ✅ grammar snaps |
| kusto-color-themes-pr-validation | ❌ | — | ⚠️ exist check only |
| kusto-extensions-pack-pr-validation | ❌ | — | ❌ nothing |

---

## Known Gaps (Beaded)

- `kuskus-7f1` — Wire E2E tests into language-server PR validation CI
- `kuskus-m74` — Add unit tests to server (zero coverage today)
- `kuskus-qi4` — Lint gate for color-themes and extensions-pack
- `kuskus-99b` — Fix stale e2e.sh (references legacy vscode module)
- `kuskus-5q4` — Automate 5 manual-only language server scenarios
- `kuskus-haf` — Document accepted manual risks in CONTRIBUTING.md
