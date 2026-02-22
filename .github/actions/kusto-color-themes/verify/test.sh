#!/usr/bin/env bash
# Tests for .github/actions/kusto-color-themes/verify/action.yml
# Extracts the actual bash scripts from the YAML and runs them — no copies.
# Run from repo root: bash .github/actions/kusto-color-themes/verify/test.sh
set -uo pipefail

PASS=0; FAIL=0
REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
ACTION="$REPO_ROOT/.github/actions/kusto-color-themes/verify/action.yml"

check() {
  local desc="$1" got="$2" want="$3"
  if [[ "$got" == "$want" ]]; then
    echo "  PASS: $desc"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $desc — got '$got', want '$want'"
    FAIL=$((FAIL+1))
  fi
}

# Extract the actual run: scripts from action.yml using python3 yaml parser.
# This ensures tests run the real code — not a hand-copied version.
STEP0=$(python3 -c "
import yaml, sys
with open('$ACTION') as f: a = yaml.safe_load(f)
sys.stdout.write(a['runs']['steps'][0]['run'])
")
STEP1=$(python3 -c "
import yaml, sys
with open('$ACTION') as f: a = yaml.safe_load(f)
sys.stdout.write(a['runs']['steps'][1]['run'])
")

echo "=== step 0: extract themes → GITHUB_OUTPUT ==="
TMPOUT=$(mktemp)
WORKING_DIR="$REPO_ROOT/kusto-color-themes"
GITHUB_OUTPUT="$TMPOUT"
# Run the actual script from action.yml
eval "WORKING_DIR=\"$WORKING_DIR\" GITHUB_OUTPUT=\"$TMPOUT\" bash -c \"\$STEP0\""
# Parse the multiline output value from GITHUB_OUTPUT heredoc format
extracted=$(awk '/^value<<EOF/{found=1; next} /^EOF/{found=0} found' "$TMPOUT")
expected=$(jq '.contributes.themes[].path' "$WORKING_DIR/package.json" --raw-output)
check "extracted themes match package.json" "$extracted" "$expected"
rm "$TMPOUT"

echo ""
echo "=== step 1 happy path: all themes exist → exit 0 ==="
THEMES=$(jq '.contributes.themes[].path' "$REPO_ROOT/kusto-color-themes/package.json" --raw-output)
exit_code=0
bash -c "$STEP1" <<< "" \
  -- 2>/dev/null \
  || true
# Run via env so variables are set properly
output=$(WORKING_DIR="$REPO_ROOT/kusto-color-themes" THEMES="$THEMES" bash -c "$STEP1" 2>&1; echo "EXIT:$?") || true
actual_exit="${output##*EXIT:}"
check "all themes exist → exit 0" "$actual_exit" "0"

echo ""
echo "=== step 1 sad path: missing theme → exit 1 ==="
BAD_THEMES="./themes/does-not-exist.json"
output=$(WORKING_DIR="$REPO_ROOT/kusto-color-themes" THEMES="$BAD_THEMES" bash -c "$STEP1" 2>&1; echo "EXIT:$?") || true
actual_exit="${output##*EXIT:}"
check "missing theme → exit 1" "$actual_exit" "1"
# Also check the error message was printed
if echo "$output" | grep -q "ERROR: File not found"; then
  check "missing theme → ERROR message printed" "found" "found"
else
  check "missing theme → ERROR message printed" "not found" "found"
fi

echo ""
echo "=== step 1 sad path: two missing themes → exit 2 ==="
TWO_BAD="./themes/missing-a.json ./themes/missing-b.json"
output=$(WORKING_DIR="$REPO_ROOT/kusto-color-themes" THEMES="$TWO_BAD" bash -c "$STEP1" 2>&1; echo "EXIT:$?") || true
actual_exit="${output##*EXIT:}"
check "two missing themes → exit 2" "$actual_exit" "2"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
