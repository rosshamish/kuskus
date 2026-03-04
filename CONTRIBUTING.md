# Contributing to Kuskus

**This is a live, published extension.** Every merge to `master` ships to the VS Code Marketplace.

## Contents

- [Extensions in this repo](#extensions-in-this-repo)
- [Getting started](#getting-started)
- [Making a change](#making-a-change)
- [Opening a PR](#opening-a-pr)
- [⚠️ Never do these things](#️-never-do-these-things)
- [Manual testing checklist](#manual-testing-checklist)
- [Maintainer ops](#maintainer-ops)
- [GitHub Actions security policy](#github-actions-security-policy)

---

## Extensions in this repo

| Directory | Extension |
|---|---|
| `kusto-language-server/` | Kusto Language Server |
| `kusto-syntax-highlighting/` | Kusto Syntax Highlighting |
| `kusto-color-themes/` | Kusto Color Themes |
| `kusto-extensions-pack/` | Kuskus Extension Pack |

---

## Getting started

### Prerequisites

- **Node.js 18+** — `node --version` should print `v18.x` or higher
- **VS Code** — https://code.visualstudio.com/
- **git** — any recent version

### Clone and build

```bash
git clone https://github.com/rosshamish/kuskus.git
cd kuskus

# Language server (has a build step)
cd kusto-language-server && npm ci && npm run vscode:prepublish && cd ..

# Syntax highlighting (has tests)
cd kusto-syntax-highlighting && npm ci && cd ..

# Color themes and extensions pack: pure JSON — no build step needed
```

### Run tests locally

```bash
# Language server lint + type-check
cd kusto-language-server && npm run lint && npm run vscode:prepublish

# Syntax highlighting tests
cd kusto-syntax-highlighting && npm run test
```

### Pick a contribution flavor

| Flavor | Where to work | What to change |
|---|---|---|
| Grammar / syntax fix | `kusto-syntax-highlighting/` | Edit the TextMate grammar (`.tmLanguage.json`), add a test |
| Language server feature | `kusto-language-server/` | TypeScript source in `src/`, run `npm run lint` before opening a PR |
| New extension in the pack | Create a new `kusto-<name>/` directory | Follow the existing package structure; add it to `kusto-extensions-pack/package.json` |

---

## Making a change

1. Branch from `master` — never commit directly:
   ```bash
   git checkout -b fix/description    # bug fix
   git checkout -b feat/description   # new feature
   git checkout -b docs/description   # documentation
   git checkout -b deps/description   # dependency update
   ```
2. Make your change and test locally (see [Getting started](#getting-started) above).
3. **Version bump** — if you touched source files, grammar, themes, or `package.json`, bump the version in that package:
   ```bash
   cd kusto-<package> && npm version patch --no-git-tag-version
   ```
   CI will tell you exactly which package needs a bump if you forget.

---

## Opening a PR

```bash
git push -u origin <your-branch>
gh pr create --fill
```

**CI checks that run on every PR:**
- Lint (`npm run lint`) for `kusto-language-server`
- Tests (`npm run test`) for `kusto-syntax-highlighting`
- Version bump check — blocks merge if a publishable package wasn't bumped

One approving review is required before merge. For Actions security requirements (SHA pinning, allowlisted actions), see the [GitHub Actions security policy](#github-actions-security-policy) section below.

---

## ⚠️ Never do these things

- **Never manually run `vsce publish`.** Push to `master` — CI handles the rest.
- **Never commit directly to `master`.** Branch protection is enforced — PRs only.

If unsure, open a PR and ask.

---

## Manual testing checklist

Run this checklist before merging any release PR. These items cannot be automated and are accepted as manual-only risks.

- [ ] **Live cluster auth (AAD)** — Sign in with a real Azure identity and verify that "Load Symbols" connects to a live Kusto cluster successfully. Requires an actual AAD account; cannot be faked in CI.
- [ ] **Visual theme rendering** — Open a `.kql` file with the Kuskus Kusto (Dark) theme active and confirm that color assignments look correct. Color correctness is subjective and requires human review.
- [ ] **Marketplace publish smoke test** — After a release merges and the publish workflow completes, visit the extension listing on the VS Code Marketplace and confirm the new version number appears and the listing loads without errors.

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
