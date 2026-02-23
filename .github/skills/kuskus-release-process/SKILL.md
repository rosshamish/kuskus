---
name: Kuskus-Release-Process
description: How automated publishing works in kuskus
---

# Kuskus Release Process

## How it works

Every merge to `master` that touches an extension's directory triggers its publish workflow:

| Extension | Workflow | Trigger path |
|---|---|---|
| Kusto Language Server | `kusto-language-server-publish.yml` | `kusto-language-server/**` |
| Kusto Syntax Highlighting | `kusto-syntax-highlighting-publish.yml` | `kusto-syntax-highlighting/**` |
| Kusto Color Themes | `kusto-color-themes-publish.yml` | `kusto-color-themes/**` |
| Kuskus Extensions Pack | `kusto-extensions-pack-publish.yml` | `kusto-extensions-pack/**` |

Pipeline: checkout → (npm ci for LS/syntax-highlighting) → bump version (phips28) → publish (HaaLeo) → push bump commit (pull-rebase-then-push, retries 5x)

Version bump commit message: `'CI: version bump [skip ci]'`

## Required secrets

| Secret | Used by |
|---|---|
| `VS_MARKETPLACE_TOKEN` | `HaaLeo/publish-vscode-extension` |
| `TOKEN_GITHUB` | `phips28/gh-action-bump-version` (needs push to master) |

## If a publish fails

Check the Actions tab: `gh run list --workflow kusto-language-server-publish.yml --repo rosshamish/kuskus`

Do not attempt to fix by running `vsce publish` manually.
