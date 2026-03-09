---
name: Kuskus-Issue-Triage
description: Triage and label issues in the kuskus repo
---

# Kuskus Issue Triage

## Useful queries

```bash
cd path/to/kuskus

# Open issues
gh issue list --state open --repo rosshamish/kuskus

# By label
gh issue list --state open --label bug --repo rosshamish/kuskus
gh issue list --state open --label enhancement --repo rosshamish/kuskus

# View specific issue
gh issue view <number> --repo rosshamish/kuskus
```

## Labels in use

- `bug` — something is broken
- `enhancement` — new feature or improvement
- `dependencies` — dependency updates

## Adding labels

```bash
gh issue edit <number> --add-label bug --repo rosshamish/kuskus
```
