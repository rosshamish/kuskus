---
name: Kuskus-Version-Bump
description: How to bump package versions in kuskus — required before merging any PR that touches a package
---

# Version Bump Skill

Every PR that touches a package directory **must** include a version bump in that package's `package.json`. A PR validation check enforces this and will fail with:

```
Error: kusto-<pkg>/package.json version not bumped.
Current: X.Y.Z — same as origin/master. Bump it before merging.
```

---

## Which packages need bumping?

| Directory touched | File to bump |
|---|---|
| `kusto-language-server/**` | `kusto-language-server/package.json` |
| `kusto-syntax-highlighting/**` | `kusto-syntax-highlighting/package.json` |
| `kusto-color-themes/**` | `kusto-color-themes/package.json` |
| `kusto-extensions-pack/**` | `kusto-extensions-pack/package.json` |

Only the **root** `package.json` per package matters — not `client/package.json` or `server/package.json`.

---

## How to bump

Use `npm version` from inside the package directory — it updates `package.json` and creates a git commit.

```bash
# patch bump (bug fixes, deps, chores) — most common
cd kusto-syntax-highlighting && npm version patch --no-git-tag-version

# minor bump (new features, backward-compatible)
cd kusto-language-server && npm version minor --no-git-tag-version

# major bump (breaking changes)
cd kusto-color-themes && npm version major --no-git-tag-version
```

`--no-git-tag-version` skips the git commit and tag — just edits `package.json`. Stage it with your other changes.

---

## Rules

- **patch** — bug fixes, dependency updates, CI/tooling changes, docs
- **minor** — new features, new commands, new completions
- **major** — breaking changes to extension behavior or settings

When in doubt: **patch**.

---

## Agentic workflow

When the PR validation check fails with the version bump error:

1. Identify which package(s) need bumping from the error message
2. Run `npm version patch --no-git-tag-version` inside each flagged package dir
3. `git add <pkg>/package.json && git commit -m "chore: bump <pkg> version"`
4. Push — CI will re-run and pass

Example:
```bash
cd kusto-syntax-highlighting
npm version patch --no-git-tag-version
cd ..
git add kusto-syntax-highlighting/package.json
git commit -m "chore: bump kusto-syntax-highlighting patch version"
git push
```

---

## What happens on merge

The publish workflow triggers on pushes to `master` that touch the package directory. It reads whatever version is in `package.json` and publishes that version to the VS Code Marketplace. No auto-bump in CI — the version in your PR is the version that ships.
