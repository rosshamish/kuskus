# Contributing to Kuskus

Kuskus is a **published VS Code extension pack** used by real Kusto developers. Every change you make
ships to the marketplace and affects end users. Read this before touching anything.

---

## ⚠️ Safety First

This is a **live, published extension**. Before making any change:

- Tests must pass. No exceptions.
- Lint must pass. No exceptions.
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

```bash
# Install all dependencies (root + workspaces)
npm ci

# Build
npm run compile        # or: npm run vscode:prepublish

# Watch mode (rebuilds on save)
npm run watch

# Lint
npm run lint           # check
npm run lint:fix       # auto-fix

# Test (end-to-end via VSCode extension host)
npm test
```

Each subdirectory (`kusto-language-server/`, etc.) also has its own `package.json`. The root-level
scripts delegate to them via workspace commands or shell scripts. Run everything from the repo root
unless you have a specific reason to go into a subdirectory.

---

## Making Changes

1. **Create a branch** — never commit directly to `master`
   ```bash
   git checkout -b fix/your-description
   # or: feature/your-description, deps/package-name, ops/your-description
   ```

2. **Make your change**, following the relevant `SKILL.md` if working with an AI agent

3. **Test locally**
   ```bash
   npm run lint
   npm test
   ```

4. **Describe your change** in the PR body — what changed and why

5. **Open a PR** — the PR template will walk you through the checklist

6. **CI runs automatically** — all PRs require passing CI before merge

---

## Branch Naming

| Prefix | Use for |
|---|---|
| `fix/` | Bug fixes |
| `feature/` | New features |
| `deps/` | Dependency updates |
| `ops/` | Tooling, CI, non-user-facing changes |
| `docs/` | Documentation only |

---

## Changelog Format

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Add your entry under `[Unreleased]`:

```markdown
### Added
- Brief description of new feature (#issue-number)

### Fixed
- Brief description of bug fix (#issue-number)

### Changed
- Brief description of behavior change

### Security
- Security fix details
```

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
