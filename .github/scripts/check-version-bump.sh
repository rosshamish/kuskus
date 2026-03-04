#!/usr/bin/env bash
# check-version-bump.sh <package-name>
#
# Reads the package's publish workflow to find which file paths trigger a
# publish. If any changed file in this PR matches those trigger paths, the
# package version in package.json must be bumped vs origin/master.
#
# Source of truth: .github/workflows/<package>-publish.yml on.push.paths
# Requires: git fetch origin master --depth=1 before running.
#
# Usage: bash .github/scripts/check-version-bump.sh kusto-color-themes
# Exit 0: version bumped, or no publish-triggering changes detected
# Exit 1: publish-triggering changes found but version not bumped
set -euo pipefail

PKG="${1:?Usage: check-version-bump.sh <package-name>}"
PUBLISH_WORKFLOW=".github/workflows/${PKG}-publish.yml"
PACKAGE_JSON="${PKG}/package.json"

# Read trigger paths directly from the publish workflow — single source of truth.
TRIGGER_PATHS=$(python3 -c "
import yaml, sys
with open('$PUBLISH_WORKFLOW') as f: w = yaml.safe_load(f)
for p in w['on']['push']['paths']:
    print(p)
")
echo "Publish trigger paths: $(echo "$TRIGGER_PATHS" | tr '\n' ' ')"

# Files changed in this PR.
CHANGED=$(git diff --name-only origin/master...HEAD)

# Match changed files against trigger paths.
# Supports: exact match, and <prefix>/** (any file under that directory).
TRIGGERED=""
while IFS= read -r pattern; do
    if [[ "$pattern" == */** ]]; then
        prefix="${pattern%/**}/"
        while IFS= read -r file; do
            [[ "$file" == "$prefix"* ]] && TRIGGERED+="$file"$'\n'
        done <<< "$CHANGED"
    else
        while IFS= read -r file; do
            [[ "$file" == "$pattern" ]] && TRIGGERED+="$file"$'\n'
        done <<< "$CHANGED"
    fi
done <<< "$TRIGGER_PATHS"
TRIGGERED=$(echo "$TRIGGERED" | sort -u | grep .)  || { echo "OK: no publish-triggering changes for ${PKG}"; exit 0; }
echo "Publish-triggering files: $(echo "$TRIGGERED" | tr '\n' ' ')"

# Require a version bump vs origin/master.
BASE_VERSION=$(git show "origin/master:${PACKAGE_JSON}" 2>/dev/null | jq -r .version) \
    || { echo "OK: new package, no bump required"; exit 0; }
HEAD_VERSION=$(jq -r .version "$PACKAGE_JSON")

if [[ "$BASE_VERSION" == "$HEAD_VERSION" ]]; then
    echo "ERROR: ${PACKAGE_JSON} version not bumped (${HEAD_VERSION} === origin/master)." >&2
    echo "  Fix: cd ${PKG} && npm version patch --no-git-tag-version" >&2
    echo "  Docs: .github/skills/kuskus-version-bump/SKILL.md" >&2
    exit 1
fi

echo "${PKG} version bumped: ${BASE_VERSION} -> ${HEAD_VERSION}"
