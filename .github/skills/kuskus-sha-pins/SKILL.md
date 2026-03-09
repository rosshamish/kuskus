---
name: Kuskus-SHA-Pins
description: How to update SHA-pinned GitHub Actions in kuskus workflows
---

# SHA-Pin Update Runbook

All actions in `.github/workflows/` are pinned to full commit SHAs for security. When a new action version is released, update the SHA manually.

---

## Current Pinned Actions

| Action | SHA | Version |
|--------|-----|---------|
| `actions/checkout` | `11bd71901bbe5b1630ceea73d27597364c9af683` | v4 |
| `actions/setup-node` | `49933ea5288caeca8642d1e84afbd3f7d6820020` | v4 |
| `phips28/gh-action-bump-version` | `2d294fcd028d7ec0de2fa4e94ad7fe04512cc13a` | v11.1.2 |
| `HaaLeo/publish-vscode-extension` | `f4ece70f329f66686bd71c54b1671353fe320e49` | v1 |

---

## List All Pinned Actions

```bash
grep -r 'uses:.*@[0-9a-f]\{40\}' .github/workflows/
```

---

## Find the Current SHA for an Action

### Option A: gh api (recommended)
```bash
# Get SHA for a specific tag
gh api repos/actions/checkout/git/refs/tags/v4 --jq '.object.sha'

# If the tag points to a tag object (not a commit), dereference it
gh api repos/actions/checkout/git/refs/tags/v4 --jq '.object.url' \
  | xargs gh api --jq '.object.sha'
```

### Option B: git ls-remote
```bash
git ls-remote https://github.com/actions/checkout refs/tags/v4
```

---

## Update a SHA Pin

Workflow files use the pattern:
```yaml
uses: owner/action@<SHA>  # vX.Y.Z
```

Steps:
1. Find the new SHA using one of the methods above
2. Replace the old SHA in every workflow file that references the action:
   ```bash
   OLD_SHA=11bd71901bbe5b1630ceea73d27597364c9af683
   NEW_SHA=<new-sha>
   sed -i '' "s/$OLD_SHA/$NEW_SHA/g" .github/workflows/*.yml
   ```
3. Update the version comment to match the new tag (e.g., `# v4.2.0`)
4. Update the table above in this file
5. Commit on an `ops/` branch and open a PR

---

## Workflow Files That Use SHA Pins

| File | Actions pinned |
|------|----------------|
| `kusto-language-server-pr-validation.yml` | checkout, setup-node |
| `kusto-language-server-publish.yml` | checkout, setup-node, gh-action-bump-version, publish-vscode-extension |
| `kusto-color-themes-pr-validation.yml` | checkout |
| `kusto-color-themes-publish.yml` | checkout, gh-action-bump-version, publish-vscode-extension |
| `kusto-syntax-highlighting-pr-validation.yml` | checkout |
| `kusto-syntax-highlighting-publish.yml` | checkout, gh-action-bump-version, publish-vscode-extension |
| `kusto-extensions-pack-pr-validation.yml` | checkout |
| `kusto-extensions-pack-publish.yml` | checkout, gh-action-bump-version, publish-vscode-extension |
