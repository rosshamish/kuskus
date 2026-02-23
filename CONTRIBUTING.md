# Contributing to Kuskus

Kuskus is a **published VS Code extension pack** used by real Kusto developers. Every change you make
ships to the marketplace and affects end users. Read this before touching anything.

---

## ⚠️ Safety First

This is a **live, published extension**. Before making any change:

- Tests must pass where they exist. Lint must pass. No exceptions.
- **Never manually bump the version number.** The publishing pipeline does this automatically on push
  to `master`. If you bump it manually you will break the automated version bump.
- **Never manually publish.** Push to `master` — CI handles the rest.

If you are unsure about anything, open a PR and ask. A bad merge to `master` ships immediately.

---

## Extensions in This Repo

| Directory | Extension | Purpose |
|---|---|---|
| `kusto-language-server/` | Kusto Language Server | Autocomplete, hover, formatting, diagnostics |
| `kusto-syntax-highlighting/` | Kusto Syntax Highlighting | TextMate grammar |
| `kusto-color-themes/` | Kusto Color Themes | Editor color themes |
| `kusto-extensions-pack/` | Kuskus Extension Pack | Bundles all of the above |

---

## Development Setup

Each extension is an independent npm package. Work in the directory for the extension you're changing.

```bash
# Language server
cd kusto-language-server
npm ci
npm run lint
npm run vscode:prepublish   # compile

# Syntax highlighting
cd kusto-syntax-highlighting
npm ci
npm run test                # grammar snapshot tests

# Color themes / extensions pack — pure JSON manifests, no build step
# Nothing to install or run locally. CI just verifies the files exist.
```

The language server has an e2e test suite (`npm test`) that requires the VS Code extension host. Run it
locally with VS Code installed; it does not run in CI today.

There is no root-level `package.json`. Each subdirectory is self-contained.

---

## Making Changes

1. **Create a branch** — never commit directly to `master`
   ```bash
   git checkout -b fix/your-description
   # or: feature/your-description, feat/your-description, deps/package-name, ops/your-description
   ```

2. **Make your change**, following the relevant `SKILL.md` if working with an AI agent

3. **Test locally**
   ```bash
   cd kusto-language-server   # or whichever package you changed
   npm run lint
   npm test                   # if tests exist for that package
   ```

4. **Describe your change** in the PR body — what changed and why

5. **Open a PR** — the PR template will walk you through the checklist

6. **CI runs automatically** — all PRs require passing CI before merge

---

## Branch Naming

| Prefix | Use for |
|---|---|
| `fix/` | Bug fixes |
| `feat/` or `feature/` | New features |
| `deps/` | Dependency updates |
| `ops/` | Tooling, CI, non-user-facing changes |
| `docs/` | Documentation only |

---

## Publishing Pipeline

Publishing is **fully automated** — do not intervene manually.

On every push to `master` that touches an extension's directory:
1. CI runs the `*-publish.yml` workflow for that extension
2. The version is automatically bumped (patch by default) in `package.json`
3. The extension is published to the VS Code Marketplace via `HaaLeo/publish-vscode-extension`
4. The version bump commit is pushed back to `master`

**What this means for you:**
- Every merge to `master` is a release. Don't merge until it's ready.
- The version bump is a commit from CI — don't be surprised when you see it in `git log`.
- If a publish fails, check the Actions tab. Do not attempt to fix it by manually running `vsce publish`.

---

## Reporting Issues

Use the issue templates — they collect the information needed to reproduce and fix problems efficiently.
See [issues](https://github.com/rosshamish/kuskus/issues).

**For bugs:** VS Code version, extension version, OS, and reproduction steps are required.  
**For features:** Describe the problem you're trying to solve, not just the solution.

---

## Questions

Open an issue or discussion. Don't guess at undocumented behavior — ask.
