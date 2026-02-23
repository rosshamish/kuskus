---
name: Kuskus-PR-Workflow
description: Step-by-step PR process for kuskus, including safety checklist
---

# Kuskus PR Workflow

Use this skill when opening, reviewing, or preparing to merge a PR in kuskus.

See `pr-checklist.md` in this directory for the checklist content (mirrors `.github/pull_request_template.md`).

---

## Opening a PR

```bash
# 1. Create branch from master
git checkout master && git pull
git checkout -b fix/your-description
# prefixes: fix/ feature/ feat/ deps/ ops/ docs/

# 2. Make changes, then verify locally
# Language server: npm run lint && npm run vscode:prepublish
# Syntax highlighting: npm run test
# Color themes / extensions pack: no lint or test scripts

# 3. Push and open PR
git push -u origin fix/your-description
gh pr create --title "fix: brief description" --body "$(cat .github/skills/kuskus-pr-workflow/pr-checklist.md)"
# Or open in browser: gh pr create --web
```

---

## Reviewing a PR

```bash
# Check out the PR
gh pr checkout <number>

# Verify locally before approving (don't trust CI alone)
# Language server: npm run lint && npm run vscode:prepublish
# Syntax highlighting: npm run test
# Color themes / extensions pack: no lint or test scripts

# Read the diff carefully for:
# - Version number changes (should not exist)
# - Publishing pipeline changes (workflows, actions)
# - Breaking changes not called out in PR description
```

**Red flags that should block merge:**
- `version` field changed in any `package.json`
- Manual calls to `vsce publish` or `npm publish`
- `.github/workflows/*.yml` changes without explanation
- Tests skipped or commented out

---

## Merging

Only merge when:
- [ ] CI is green (all checks passing)
- [ ] PR template checklist is complete
- [ ] At least one review if the change is non-trivial

After merge to `master`:
- CI auto-bumps the version and publishes
- A version bump commit will appear in `git log` — this is expected
- Check the Actions tab to confirm publish succeeded

---

## Gotchas

- **Don't merge multiple PRs simultaneously.** The `pull-rebase-then-push` action handles conflicts
  via retry, but simultaneous merges can still cause issues. Wait for one publish pipeline to finish
  before merging the next PR.
- **Path-scoped workflows.** Only changes to a given extension's directory trigger that extension's
  publish workflow. Changing only `CONTRIBUTING.md` or `.github/` files does NOT trigger a publish.
- **`workflow_dispatch`** is available on all publish workflows — use it in the Actions UI if you
  need to manually re-trigger a publish after a failure, but only after verifying the root cause.
