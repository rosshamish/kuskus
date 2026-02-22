---
name: Kuskus-Release-Process
description: How automated publishing works in kuskus and what not to touch manually
---

# Kuskus Release Process

**The release process is fully automated. Do not intervene manually unless something has gone wrong.**

---

## How It Works

Every merge to `master` that touches an extension's directory triggers its publish workflow:

| Extension | Workflow | Triggered by changes in |
|---|---|---|
| Kusto Language Server | `kusto-language-server-publish.yml` | `kusto-language-server/**` |
| Kusto Syntax Highlighting | `kusto-syntax-highlighting-publish.yml` | `kusto-syntax-highlighting/**` |
| Kusto Color Themes | `kusto-color-themes-publish.yml` | `kusto-color-themes/**` |
| Kuskus Extensions Pack | `kusto-extensions-pack-publish.yml` | `kusto-extensions-pack/**` |

### Pipeline steps (per extension)

```
1. actions/checkout@v4
2. gh-action-bump-version-master
   - reads current version from package.json
   - bumps patch version (default)
   - writes updated package.json
   - does NOT push yet (push: false)
3. HaaLeo/publish-vscode-extension@v1
   - packages and publishes to VS Code Marketplace
   - uses VS_MARKETPLACE_TOKEN secret
4. pull-rebase-then-push
   - fetches latest master
   - rebases the version bump commit
   - pushes (retries up to 5x on conflict)
```

### Required secrets

| Secret | Used by |
|---|---|
| `VS_MARKETPLACE_TOKEN` | `HaaLeo/publish-vscode-extension` — marketplace PAT |
| `TOKEN_GITHUB` | `gh-action-bump-version-master` — GitHub PAT for push |

---

## Version Bump Behavior

- Default: **patch** bump on every merge (1.2.3 → 1.2.4)
- Each extension is versioned independently
- Tag prefix per extension: `kusto-language-server-v*`, `kusto-syntax-highlighting-v*`, etc.
- Version bump commit message: `"Bump version to X.Y.Z"` — appears in `git log`, this is expected

**Do not change the version in `package.json` manually.** If you do, the next CI run will try to
bump from wherever you left it — could result in skipped versions or conflicts.

---

## Checking Release Status

```bash
# View recent workflow runs
gh run list --workflow kusto-language-server-publish.yml

# Check a specific run
gh run view <run-id>

# View logs for a failed run
gh run view <run-id> --log-failed

# Check what version was published
gh release list --limit 10
```

---

## Manual Re-Trigger (After Failure Only)

If a publish workflow failed and the root cause is fixed, you can re-trigger via:

```bash
gh workflow run kusto-language-server-publish.yml
# or use the Actions UI: Actions → workflow → Run workflow
```

**Only do this when:**
- The root cause is identified and resolved
- The version bump commit was NOT pushed (check `git log` on master)
- You've confirmed no duplicate publish would result

---

## CHANGELOG Process

The automated pipeline does **not** update `CHANGELOG.md`. That is a human responsibility.

Before merging any PR with user-visible changes:
1. Add entry under `## [Unreleased]`
2. Use standard sections: `Added`, `Changed`, `Fixed`, `Removed`, `Security`
3. Reference issue numbers: `Fix null-safety crash in hover (#104)`

When cutting a formal release (moving `[Unreleased]` → `[X.Y.Z]`), do it in the PR — the version
number in the changelog heading should match what CI will publish.

---

## Gotchas

- **Never run `vsce publish` manually.** It will publish without the automated version bump,
  creating a mismatch between the code and what's on the marketplace.
- **Simultaneous merges.** The `pull-rebase-then-push` action retries 5 times on conflict. For
  safety, avoid merging two PRs in rapid succession targeting the same extension.
- **`concurrency: cancel-in-progress: false`** on publish workflows means concurrent runs queue
  rather than cancel — this is intentional to prevent publish races.
