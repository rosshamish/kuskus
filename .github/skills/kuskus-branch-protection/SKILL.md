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

## Temporarily Disable (Emergency / CI Fix)

```bash
# Disable the ruleset
gh api --method PUT repos/rosshamish/kuskus/rulesets/13087704 \
  --field enforcement=disabled

# Do your work...

# Re-enable
gh api --method PUT repos/rosshamish/kuskus/rulesets/13087704 \
  --field enforcement=active
```

Or via the UI: https://github.com/rosshamish/kuskus/rules/13087704

---

## Modify the Ruleset

```bash
# View current state
gh api repos/rosshamish/kuskus/rulesets/13087704 | python3 -m json.tool

# Change required reviews (e.g., back to 0 for a sprint)
gh api --method PUT repos/rosshamish/kuskus/rulesets/13087704 \
  --input - <<'EOF'
{
  "name": "Protect master",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["refs/heads/master"], "exclude": [] }
  },
  "bypass_actors": [
    { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }
  ],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    }
  ]
}
EOF
```

---

## Why Ruleset, Not Classic Branch Protection

Classic branch protection doesn't support bypass actors on personal (non-org) repos. Rulesets work everywhere and are more flexible.

---

## CI Version Bump Compatibility

The publish workflows use `GITHUB_TOKEN: ${{ secrets.TOKEN_GITHUB }}` (rosshamish's admin PAT) for the version bump commit. Since admin bypasses the ruleset, version bump pushes to master continue to work without change.

If `TOKEN_GITHUB` is ever rotated/revoked, re-add the new PAT as the secret in repo settings, or switch to a deploy key with admin access.

---

## Restore Default (Remove Protection Entirely)

```bash
gh api --method DELETE repos/rosshamish/kuskus/rulesets/13087704
```
