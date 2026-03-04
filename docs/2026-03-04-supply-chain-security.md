# Supply Chain Security Hardening — 2026-03-04

## What was hardened

### 1. Dependency vulnerabilities patched
- `axios` CVE, `minimatch` ReDoS, `serialize-javascript` CVE across all language-server packages ([8ba9492](https://github.com/rosshamish/kuskus/commit/8ba9492c)) — #272
- `minimatch` ReDoS in `kusto-syntax-highlighting` specifically ([0af8308](https://github.com/rosshamish/kuskus/commit/0af8308d)) — shipped as v2.0.8

### 2. GitHub Actions locked down ([ff774d3](https://github.com/rosshamish/kuskus/commit/ff774d38)) — #282
- Default workflow permissions: `write` → **`read` only**
- All actions SHA-pinned to full commit hash (no floating `@v1` tags — those can be silently replaced)
- Explicit allowlist of permitted actions — no wildcards
- `can_approve_pull_request_reviews` disabled for GITHUB_TOKEN

### 3. Vendored/untrusted actions removed ([e5e50c5](https://github.com/rosshamish/kuskus/commit/e5e50c55)) — #265
- Deleted `gh-action-bump-version-master/` and `jq-action-master/` from the repo — vendored third-party action copies with no integrity guarantee

### 4. Post-publish auto-push removed ([fb0004b](https://github.com/rosshamish/kuskus/commit/fb0004ba)) — #284
- Publish workflows were writing directly back to `master` (bypassing branch protection via CI token). Removed entirely — `contents: write` → `contents: read` on all publish workflows

### 5. VSCE_PAT scope documented ([a693bcb](https://github.com/rosshamish/kuskus/commit/a693bcb2))
- PAT renewal runbook added so the secret can be rotated correctly and with minimum scope

## Net posture change
Repo went from floating action tags + vendored copies + write-capable CI tokens + unpatched CVEs → SHA-pinned allowlist + read-only CI + no vendored code + clean deps. The publish pipeline is now the only thing with elevated access, and it's scoped to Marketplace only.
