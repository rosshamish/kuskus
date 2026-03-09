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

```bash
gh pr checkout <number> --repo rosshamish/kuskus
# Test locally per CONTRIBUTING.md for the affected package
gh pr review <number> --repo rosshamish/kuskus --approve   # or --request-changes
```

## Merging

```bash
# 1. Wait for all checks to pass — NEVER merge before this
gh pr checks <number> --repo rosshamish/kuskus --watch

# 2. Then merge
gh pr merge <number> --repo rosshamish/kuskus --squash --delete-branch
```

**Every merge to master is a release.** Master must always be green.

---

## 🚨 Golden Rules (non-negotiable)

### 1. NEVER push directly to master

Every change — no matter how small — goes through a PR. No exceptions. Direct pushes are now **infrastructure-blocked** by branch ruleset 13087704, but the rule exists independently of enforcement.

### 2. ALWAYS wait for CI before merging

After any force-push to a branch, CI reruns from scratch. **Never merge until `gh pr checks --watch` shows all checks passing.** If you merge while CI is running, broken code lands on master.

When waiting on CI: **create a bead** (`bd q "wait: CI passes on #<number>"`) and **wire it as a dep** on the merge bead. Never skip this step.

```bash
# Pattern: always bead the wait
bd q "wait: CI passes on #<number>"   # → kuskus-xxx
bd dep add <merge-bead> kuskus-xxx    # merge is blocked until CI wait closes
```

### 3. L7 Principal review before every merge

Every PR must have 2× serial `claude-opus-4.6` reviews — both APPROVE — before merge. See prompt below.

**Exact prompt for L7 review agent** (type: `general-purpose`, model: `claude-opus-4.6`, mode: `background`):

```
You are a principal engineer (L7) reviewing a GitHub pull request for the kuskus VS Code extension
(rosshamish/kuskus). Perform TWO full independent reviews IN SERIAL — complete review 1 entirely
before starting review 2. Do not let review 1 bias review 2.

For each review:
1. Fetch the PR diff: gh pr diff <number> --repo rosshamish/kuskus
2. Read the full diff carefully
3. Check: correctness, security, test coverage, CI impact, documentation
4. Give verdict: APPROVE or REQUEST CHANGES with specific findings

After both reviews, summarize: both APPROVE → cleared for merge. Any REQUEST CHANGES → list what must be fixed.

Then close bead <bead-id> if both APPROVE.
```

Use `claude-opus-4.6` — do **not** substitute a cheaper model. L7 quality requires it.

