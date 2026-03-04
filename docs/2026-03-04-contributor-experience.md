# Contributor Experience Improvements — 2026-03-04

## Bug reports / feature requests
- Added ISSUE_TEMPLATE for bugs and features — structured forms instead of blank issues ([52e4dd6](https://github.com/rosshamish/kuskus/commit/52e4dd61))
- Closed 8+ stale issues (some 5+ years old) with kind messages pointing to CONTRIBUTING.md — signal/noise ratio improved
- Added "Contributions Welcome" table to README with 4 community-requested ideas + issue links — new contributors land somewhere actionable

## Opening a PR
- PR template added with Why/What/How structure ([1366ddd](https://github.com/rosshamish/kuskus/commit/1366ddd5))
- Version bump CI check — if you forget to bump, CI tells you exactly which package and exactly what command to run ([5067b41](https://github.com/rosshamish/kuskus/commit/5067b41a), [edba9b3](https://github.com/rosshamish/kuskus/commit/edba9b3d))

## CONTRIBUTING.md — restructured (#289)
Flows from new contributor → maintainer (prerequisites first, security policy last):
1. Extensions in this repo
2. Getting started (prerequisites, clone, build, run tests)
3. Contribution flavors table with real example commits:
   - Grammar / syntax fix — [2a5d25a](https://github.com/rosshamish/kuskus/commit/2a5d25aa)
   - Language server feature — [841c908](https://github.com/rosshamish/kuskus/commit/841c9087)
   - Color theme (new or modify) — [7aa46fd](https://github.com/rosshamish/kuskus/commit/7aa46fd4)
   - New extension in the pack
4. Making a change (branch naming, version bump)
5. Opening a PR (CI checks)
6. Never do these things
7. Manual testing checklist (3 items genuinely can't be automated)
8. Maintainer ops (PAT renewal)
9. GitHub Actions security policy

## Net experience change
A new contributor can clone, build, pick a flavor, open a PR, and get useful CI feedback — without reading anything except CONTRIBUTING.md top to bottom. That wasn't true before.
