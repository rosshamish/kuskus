---
name: Kuskus-Branch-Protection
description: Master branch protection rules, bypass policy, and how to modify when needed
---

# Kuskus Branch Protection

Master is protected by a GitHub Ruleset (not classic branch protection). All changes must go through a PR with 1 approval.

---

## What's Active

**Ruleset:** "Protect master" (ID: 13087704)  
**URL:** https://github.com/rosshamish/kuskus/rules/13087704

### Rules
- **No deletion** of master
- **No force pushes**
- **Pull request required** — 1 approving review, dismiss stale reviews on push

### Bypass actors
- **Repository admin role** (`bypass_mode: always`) — this covers:
  - You (rosshamish), pushing directly via PAT or CLI
  - CI workflows using `TOKEN_GITHUB` (your admin PAT) — version bump pushes work

### What is blocked
- Direct pushes from non-admins
- PRs merged without 1 approval (for non-admins)
- Workflows using `GITHUB_TOKEN` (write-level, not admin) pushing to master directly

---

## Diagnose Current State

```bash
# View current ruleset configuration
gh api repos/rosshamish/kuskus/rulesets/13087704 | python3 -m json.tool

# List all rulesets
gh api repos/rosshamish/kuskus/rulesets | python3 -m json.tool
```

Or via the UI: https://github.com/rosshamish/kuskus/rules/13087704

---

## Destructive Operations

Ruleset deletion, enforcement changes, and protection bypass are documented in a private runbook. Contact the maintainer.

---

## Why Ruleset, Not Classic Branch Protection

Classic branch protection doesn't support bypass actors on personal (non-org) repos. Rulesets work everywhere and are more flexible.

---

## CI Version Bump Compatibility

The publish workflows use `GITHUB_TOKEN: ${{ secrets.TOKEN_GITHUB }}` (rosshamish's admin PAT) for the version bump commit. Since admin bypasses the ruleset, version bump pushes to master continue to work without change.

If `TOKEN_GITHUB` is ever rotated/revoked, re-add the new PAT as the secret in repo settings, or switch to a deploy key with admin access.
