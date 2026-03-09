---
name: Kuskus-Version-Bump
description: How to bump package versions in kuskus — required before merging any PR that touches a package
---

# Version Bump Skill

Every PR that touches a package directory **must** include a version bump in that package's `package.json`. A PR validation check enforces this and will fail with:

```
ERROR: kusto-<pkg>/package.json version not bumped (X.Y.Z === origin/master).
  Fix: cd kusto-<pkg> && npm version patch --no-git-tag-version
  Docs: .github/skills/kuskus-version-bump/SKILL.md
```

---

## Which packages need bumping?

| If PR touches… | Bump this file |
|---|---|
| `kusto-language-server/**` | `kusto-language-server/package.json` |
| `.github/workflows/kusto-language-server-publish.yml` | `kusto-language-server/package.json` |
| `kusto-syntax-highlighting/**` | `kusto-syntax-highlighting/package.json` |
| `.github/workflows/kusto-syntax-highlighting-publish.yml` | `kusto-syntax-highlighting/package.json` |
| `kusto-color-themes/**` | `kusto-color-themes/package.json` |
| `.github/workflows/kusto-color-themes-publish.yml` | `kusto-color-themes/package.json` |
| `kusto-extensions-pack/**` | `kusto-extensions-pack/package.json` |
| `.github/workflows/kusto-extensions-pack-publish.yml` | `kusto-extensions-pack/package.json` |

**Rule: if your change would trigger the publish workflow, it must carry a version bump.**
The check mirrors the `on.push.paths` triggers in each publish workflow exactly.

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

When the PR validation check fails with a version bump error:

1. Identify which package(s) need bumping from the check name (`kusto-<pkg>-pr-validation`)
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

## Implementation

Each PR validation workflow uses two steps:
1. `tj-actions/changed-files@v46` — detects if publish-triggering files changed
2. `del-systems/check-if-version-bumped@v2` — checks version bumped, runs only `if: steps.publish-trigger.outputs.any_changed == 'true'`

Trigger paths are listed explicitly in each PR validation workflow (duplicated from the publish workflow). This is intentional — 4 stable packages, acceptable tradeoff vs parsing YAML at runtime. If publish trigger paths ever change, update both the publish and pr-validation workflows.

The publish workflow triggers on pushes to `master` that touch the package directory. It reads whatever version is in `package.json` and publishes that version to the VS Code Marketplace. No auto-bump in CI — the version in your PR is the version that ships.
