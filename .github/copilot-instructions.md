# Kuskus — Copilot Instructions

Kuskus is a VS Code extension pack for Kusto (Azure Data Explorer query language).

## Repo structure

Four independent extensions, each with its own `package.json`. No root `package.json`.

| Directory | Extension |
|---|---|
| `kusto-language-server/` | Autocomplete, hover, formatting, diagnostics |
| `kusto-syntax-highlighting/` | TextMate grammar |
| `kusto-color-themes/` | Editor color themes |
| `kusto-extensions-pack/` | Bundles all of the above |

## Key commands

```bash
# Language server
cd kusto-language-server && npm ci && npm run lint && npm run vscode:prepublish

# Syntax highlighting
cd kusto-syntax-highlighting && npm ci && npm run test

# Color themes / extensions pack: pure JSON, no build step
```

## Publishing

Every merge to `master` triggers automated publishing via GitHub Actions. Never manually bump versions or run `vsce publish`. See `kuskus-release-process` skill.

## Skills available

- `kuskus-pr-workflow` — opening, reviewing, merging PRs
- `kuskus-release-process` — how automated publishing works
- `kuskus-safe-development` — rules for safe development
- `kuskus-issue-triage` — triaging and labeling issues
- `kuskus-language-service-upgrade` — upgrading the Kusto language service
- `kuskus-modernization` — modernizing kuskus to v3.5.0
