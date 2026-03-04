# Contributing to Kuskus

**This is a live, published extension.** Every merge to `master` ships to the VS Code Marketplace.

## ⚠️ Never do these things

- **Never manually run `vsce publish`.** Push to `master` — CI handles the rest.
- **Never commit directly to `master`.** Branch protection is enforced — PRs only.

If unsure, open a PR and ask.

---

## Version bumps

If your PR touches files that trigger a publish workflow (source files, grammar, themes, package config), **you must bump the version** in that package's `package.json` before merging. CI will block the PR if you forget.

```bash
cd kusto-<package> && npm version patch --no-git-tag-version
```

The PR validation check tells you exactly which package needs a bump and what command to run. See `.github/skills/kuskus-version-bump/SKILL.md` for details.

---

## Extensions in this repo

| Directory | Extension |
|---|---|
| `kusto-language-server/` | Kusto Language Server |
| `kusto-syntax-highlighting/` | Kusto Syntax Highlighting |
| `kusto-color-themes/` | Kusto Color Themes |
| `kusto-extensions-pack/` | Kuskus Extension Pack |

---

## Dev setup

Each package is self-contained. No root `package.json`.

```bash
# Language server
cd kusto-language-server && npm ci && npm run lint && npm run vscode:prepublish

# Syntax highlighting
cd kusto-syntax-highlighting && npm ci && npm run test

# Color themes / extensions pack: pure JSON, no build step
```

---

## Maintainer ops

### Renewing the VS Marketplace PAT

All 4 publish workflows authenticate to the VS Marketplace using a Personal Access Token stored as the `VSCE_PAT` secret in GitHub Actions. PATs expire periodically — when they do, every publish workflow will fail with:

```
Access Denied: The Personal Access Token used has expired.
You're using an expired Personal Access Token, please get a new PAT.
More info: https://aka.ms/vscodepat
```

To renew:
1. Go to **https://dev.azure.com** → your org → User Settings → **Personal access tokens** → New Token
   - Organization: **All accessible organizations**
   - Scopes: Custom → scroll to **Marketplace** → check **Manage**
   - See **https://aka.ms/vscodepat** for screenshots
2. Update the secret at **https://github.com/rosshamish/kuskus/settings/secrets/actions** → `VS_MARKETPLACE_TOKEN`
3. Re-run any failed publish workflow to verify

---

## GitHub Actions security policy

### Declared policy

| Setting | Value |
|---|---|
| Default workflow permissions | `read` only |
| Allowed actions | Explicit allowlist (no wildcards) |
| SHA pinning required | Yes — all actions must reference a full commit SHA |
| `can_approve_pull_request_reviews` | Disabled |

### Allowlisted actions

Only the following actions may be used in workflows. All are pinned to a full SHA:

| Action | SHA | Version |
|---|---|---|
| `actions/checkout` | `11bd71901bbe5b1630ceea73d27597364c9af683` | v4 |
| `actions/setup-node` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | v4 |
| `HaaLeo/publish-vscode-extension` | `ca5561daa085dee804bf9f37fe0165785a9b14db` | v2 |
| `del-systems/check-if-version-bumped` | `d5d13ffd75dc8aa9c2e1dca10d9bb27be10307b2` | v2 |
| `tj-actions/changed-files` | `ed68ef82c095e0d48ec87eccea555d944a631a4c` | v46 |

### Adding a new action

1. Find the full commit SHA for the exact version you want:
   ```bash
   gh api repos/<owner>/<repo>/git/refs/tags/<tag> --jq '.object.sha'
   ```
2. Add to the repo allowlist via Settings → Actions → General → Allow specified actions, or:
   ```bash
   # Get current list, append, PUT back
   gh api repos/rosshamish/kuskus/actions/permissions/selected-actions
   ```
3. Reference in your workflow using the SHA with a version comment:
   ```yaml
   uses: owner/action@<full-sha> # vX.Y
   ```

---

## Making a change

1. Branch from `master` — never commit directly
   ```bash
   git checkout -b fix/description   # or feat/ deps/ ops/ docs/
   ```
2. Make your change and test locally (see dev setup above)
3. Open a PR — CI must pass and 1 approving review is required before merge
