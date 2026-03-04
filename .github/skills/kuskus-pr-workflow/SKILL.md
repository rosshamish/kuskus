---
name: Kuskus-PR-Workflow
description: Opening and reviewing PRs in the kuskus repo
---

# Kuskus PR Workflow

## Opening a PR

```bash
cd initiatives/kuskus/repo
git checkout master && git pull
git checkout -b fix/description   # or feat/ deps/ ops/ docs/

# Make changes, then test locally per CONTRIBUTING.md

git push -u origin fix/description
gh pr create --repo rosshamish/kuskus --title "fix: description" --web
```

## Reviewing a PR

```bash
gh pr checkout <number> --repo rosshamish/kuskus
# Test locally per CONTRIBUTING.md for the affected package
gh pr review <number> --repo rosshamish/kuskus --approve   # or --request-changes
```

## Merging

```bash
gh pr merge <number> --repo rosshamish/kuskus --squash
```

CI must pass and 1 approving review required. Every merge to master is a release.
