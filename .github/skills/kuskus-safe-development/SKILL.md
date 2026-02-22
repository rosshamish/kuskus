---
name: Kuskus-Safe-Development
description: Non-negotiable safety rules for developing on a published VS Code extension
---

# Kuskus Safe Development

**Read this before making any change to kuskus.** This is a published extension on the VS Code
Marketplace. Real users install it. Every merge to `master` triggers an automated release.

---

## The Non-Negotiables

### 1. Never commit to `master` directly
All changes go through PRs. CI must pass. No exceptions — not even "quick fixes" or "docs only."

### 2. Never manually bump the version number
The `phips28/gh-action-bump-version` action in CI does this automatically on every merge to `master`.
If you manually bump in `package.json`, the next CI run will double-bump or conflict. Don't touch
`version` in any extension's `package.json`.

### 3. Never manually publish
Do not run `vsce publish`, `npx vsce publish`, or equivalent. Publishing is handled by
`HaaLeo/publish-vscode-extension` in the `*-publish.yml` workflows. Manual publishing bypasses
the automated version bump and can create duplicate versions on the marketplace.

### 4. Tests must pass before PR merge
```bash
npm test               # Must be green
npm run lint           # Must be green
```
If tests are failing and you don't know why, stop and investigate. Don't merge with failing tests
and plan to "fix it later" — later is a published broken extension.

### 5. Understand scope before touching the publishing pipeline
The workflows in `.github/workflows/` are production infrastructure. Before editing any `*-publish.yml`
or `*-pr-validation.yml` workflow, read it fully and understand what it does. Changes to CI take
effect immediately on the next trigger.

---

## Understanding the Publishing Pipeline

```
PR merged to master
  └─ GitHub Actions: *-publish.yml (scoped to changed directory)
      ├─ phips28/gh-action-bump-version  → bumps patch version in package.json, creates commit
      ├─ HaaLeo/publish-vscode-extension → publishes to VS Code Marketplace
      └─ pull-rebase-then-push          → pushes the version bump commit back to master
```

**Each extension has its own workflow.** A push to `kusto-language-server/**` triggers only
`kusto-language-server-publish.yml`. Touching `kusto-syntax-highlighting/**` triggers only its
workflow, etc.

---

## What "Real Users" Means

Kuskus is installed by Kusto developers — people writing queries against Azure Data Explorer,
Application Insights, Log Analytics. If the language server crashes on startup, they lose
autocomplete. If formatting breaks, they lose productivity. If a bad publish goes out, there's no
easy rollback (you can publish a fix, but the broken version has already landed on user machines).

**Test on a real `.kql` or `.csl` file before merging.** Don't just run automated tests — open
VS Code with the extension running and verify the change behaves as expected.

---

## Failure Recovery

If a publish workflow fails mid-flight:
1. Check Actions tab for the exact failure step
2. Do NOT manually re-trigger publish or manually bump version
3. If the version bump commit was pushed but publish failed: fix the root cause and push a new
   commit to trigger another publish attempt
4. If the version bump did NOT happen: safe to fix and re-merge (CI will re-run cleanly)
5. When uncertain: open an issue documenting what happened before taking action
