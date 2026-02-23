# Kuskus — Copilot Instructions

This is a **published VS Code extension pack** with real users. Changes merge to `master` and ship
to the marketplace automatically. Work carefully.

> ⚠️ **Safety first — always.** Read the **Kuskus-Safe-Development** skill before making any change.

---

## Repository Purpose

Kuskus provides Kusto language support in VS Code:

- **`kusto-language-server/`** — Autocomplete, hover info, formatting, symbol loading (LSP-based)
- **`kusto-syntax-highlighting/`** — TextMate grammar for `.csl`/`.kql` files
- **`kusto-color-themes/`** — Editor color themes for Kusto
- **`kusto-extensions-pack/`** — Extension pack bundling all of the above

Each subdirectory is an independent VS Code extension with its own `package.json`. There is no root-level `package.json`.

---

## Core Principles

1. **Never commit to `master` directly.** All changes go through PRs with CI passing.

2. **Tests and lint must pass before any merge.** `npm test` and `npm run lint` must be green.

3. **Never manually bump the version number.** CI auto-bumps on merge to `master`. Manual bumps break
   the pipeline.

4. **Never manually publish.** The `*-publish.yml` workflows handle publishing via
   `HaaLeo/publish-vscode-extension`. Do not run `vsce publish` yourself.

5. **One merge = one release.** Don't merge until the change is ready to ship.

---

## Key Commands

```bash
# Work in the package directory, e.g.:
cd kusto-language-server
npm ci                     # Install dependencies
npm run vscode:prepublish  # Build
npm run lint               # Lint check (language server only)
npm test                   # Tests where they exist
```

---

## Skill Routing

| Working on... | Read skill... |
|---|---|
| Any change (start here) | **Kuskus-Safe-Development** |
| Opening or reviewing a PR | **Kuskus-PR-Workflow** |
| Release, version, publishing | **Kuskus-Release-Process** |
| Issues, triage, bug reports | **Kuskus-Issue-Triage** |
| Branch protection, rulesets | **Kuskus-Branch-Protection** |

---

## Publishing Pipeline (Know Before You Touch)

Push to `master` → CI runs `*-publish.yml` → auto version bump → marketplace publish → version bump
commit pushed back to `master`.

Every extension has its own workflow scoped to its directory path. A push touching
`kusto-language-server/**` triggers only `kusto-language-server-publish.yml`, etc.

See the **Kuskus-Release-Process** skill for full details and failure recovery.

---

## Repository Links

- **GitHub:** https://github.com/rosshamish/kuskus
- **Marketplace:** https://marketplace.visualstudio.com/items?itemName=rosshamish.kuskus-extensions-pack
- **Issues:** https://github.com/rosshamish/kuskus/issues
- **Actions:** https://github.com/rosshamish/kuskus/actions
