# Contributing to Kuskus

**This is a live, published extension.** Every merge to `master` ships to the VS Code Marketplace.

## ⚠️ Never do these things

- **Never manually bump the version number.** CI handles it automatically on push to `master`.
- **Never manually run `vsce publish`.** Push to `master` — CI handles the rest.

If unsure, open a PR and ask.

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

## Making a change

1. Branch from `master` — never commit directly
   ```bash
   git checkout -b fix/description   # or feat/ deps/ ops/ docs/
   ```
2. Make your change and test locally (see dev setup above)
3. Open a PR — CI must pass and 1 approving review is required before merge
