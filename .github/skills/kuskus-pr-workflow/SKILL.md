---
name: Kuskus-PR-Workflow
description: Opening and reviewing PRs in the kuskus repo
---

# Kuskus PR Workflow

## Opening a PR

```bash
cd path/to/kuskus
git checkout master && git pull
git checkout -b fix/description   # or feat/ deps/ ops/ docs/

# Make changes, then test locally per CONTRIBUTING.md

git push -u origin fix/description
gh pr create --repo rosshamish/kuskus --title "fix: description" --web
```

## Reviewing a PR

**Every PR must receive an L7 Principal review before merging.** This is a non-negotiable quality gate.

### L7 Principal Review (required)

Spawn a background agent with this prompt template:

```
You are a senior principal engineer (L7) reviewing PR #<N> in rosshamish/kuskus.

Run TWO independent reviews IN SERIAL. Refocus on engineering principles before each:
- Correctness: does the code do what it says?
- Security: no secrets, no path leaks, no injection vectors, shell safety
- Maintainability: will a future maintainer understand this in 6 months?
- Completeness: does the PR description match the diff?

gh pr diff <N>
gh pr view <N> --json body,title,comments,reviews

Review 1: gh pr review <N> --approve --body "..." OR --request-changes --body "..."
Review 2: gh pr review <N> --comment --body "Review 2/2: ..."

If both APPROVE → PR is cleared for merge.
If either REQUEST CHANGES → list specific blocking issues; fix before re-reviewing.
```

### Quick review (for trivial PRs only)
```bash
gh pr checkout <number>
# Test locally per CONTRIBUTING.md for the affected package
gh pr review <number> --approve
```

## Merging

```bash
gh pr merge <number> --repo rosshamish/kuskus --squash
```

CI must pass and 1 approving review required. Every merge to master is a release.

> ⚠️ **L7 Principal review is required before every merge.** See "Reviewing a PR" above.
