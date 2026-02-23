---
name: Kuskus-Issue-Triage
description: Issue handling, label taxonomy, lifecycle, and triage workflow for kuskus
---

# Kuskus Issue Triage

Use this skill when creating, reviewing, or triaging issues in the kuskus repo.

See `bug-report-template.md` and `feature-request-template.md` in this directory for template
content (mirrors `.github/ISSUE_TEMPLATE/`).

---

## Label Taxonomy

### Type
| Label | Meaning |
|---|---|
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |
| `docs` | Documentation change |
| `ops` | CI, tooling, non-user-facing |
| `dependencies` | Dependency update |
| `security` | Security-related |

### Priority
| Label | Meaning |
|---|---|
| `priority-critical` | Blocking users; crashes, data loss, publish broken |
| `priority-high` | Significant degradation; common workflow broken |
| `priority-low` | Minor annoyance; edge case |

### Status
| Label | Meaning |
|---|---|
| `good first issue` | Suitable for first-time contributors |
| `help wanted` | Looking for external contribution |
| `status-stale` | No activity, low demand; candidate for closure |
| `wontfix` | Out of scope or intentionally not fixing |

---

## Triage Workflow

```bash
# List open issues
gh issue list --state open

# Label a bug as critical
gh issue edit <number> --add-label "bug,priority-critical"

# Label a feature request
gh issue edit <number> --add-label "enhancement,priority-low"

# Mark stale
gh issue edit <number> --add-label "status-stale"

# Close stale issue (include reason)
gh issue close <number> -c "Closing due to no activity for 2+ years and limited community interest. Please open a new issue if this is still relevant — a minimal reproduction case would help."

# Assign to self
gh issue edit <number> --add-assignee "@me"
```

---

## What to Look for in Bug Reports

A good bug report has:
- VS Code version (exact — from Help → About)
- Extension version (from Extensions panel)
- OS
- Reproduction steps
- Expected vs actual behavior
- Output logs from "Kusto Language Server" in the Output panel

If any of these are missing, comment and ask. Without VS Code + extension version, reproducing is
very difficult.

**Common gaps:**
- "It stopped working" with no version info → ask for environment details
- No repro steps → ask for a minimal `.kql` file or query snippet
- No logs → ask them to check Output → Kusto Language Server

---

## Known Issue Categories

Based on history:
- **Language server crashes** (see #218, #104): often null-safety in symbol loading; check
  `kustoSymbols.ts` and hover provider
- **Syntax highlighting gaps**: TextMate grammar issues in `kusto-syntax-highlighting/`; needs
  specific KQL syntax example to reproduce
- **Load Symbols failures**: auth/clipboard issues; check `clipboardy` version (pinned to 2.3.0)
- **Theme conflicts**: color theme applying to non-Kusto files (fixed in #208 via scope restriction)

---

## Closing Stale Issues

Issues with no activity for 2+ years and low reaction counts (< 5 👍) are candidates for closure.

**Stale closure template:**
```
Closing this issue as it's been open for [X] years with limited activity. 
The project focus is on core stability and actively-reported bugs.

If this is still affecting you, please open a new issue with:
- Current VS Code version
- Current extension version  
- Minimal reproduction steps

That will help us prioritize appropriately.
```

Don't close issues with high 👍 counts or active recent discussion — those signal real demand.

---

## Useful Queries

```bash
# Issues with no labels (need triage)
gh issue list --state open --json number,title,labels --jq '.[] | select(.labels | length == 0)'

# Bugs only
gh issue list --state open --label bug

# Critical priority
gh issue list --state open --label priority-critical

# Recently opened (last 30 days)
gh issue list --state open --json number,title,createdAt --jq --argjson since "$(date -u -d '30 days ago' +%s 2>/dev/null || date -u -v-30d +%s)" '.[] | select((.createdAt | fromdateiso8601) > $since)'

# By reactions (find high-demand features)
gh issue list --state open --json number,title,reactions --jq 'sort_by(-.reactions.total_count) | .[:10]'
```
