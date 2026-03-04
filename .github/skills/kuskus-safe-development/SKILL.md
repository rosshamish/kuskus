---
name: Kuskus-Safe-Development
description: Rules for safe development on this live, published extension
---

# Kuskus Safe Development

## The rules

1. **Never commit directly to `master`.** Always use a branch and PR.
2. **Never manually bump the version number.** CI does this on merge.
3. **Never run `vsce publish` manually.** CI handles publishing.
4. **Never edit `*-publish.yml` workflows without understanding them fully.** They are production infrastructure.

## Why this matters

Every merge to `master` triggers a publish to the VS Code Marketplace. There is no staging. A bad merge ships immediately.

## Language server e2e test

`npm test` in `kusto-language-server` runs an e2e suite that requires a VS Code extension host. It does not run in CI. Use `npm run lint` and `npm run vscode:prepublish` to catch issues before opening a PR.
