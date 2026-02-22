#!/usr/bin/env bash
# Tests for the verify action logic.
# Run from repo root: bash .github/actions/kusto-color-themes/verify/test.sh
set -uo pipefail

PASS=0; FAIL=0; REPO_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"

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

echo "=== arithmetic increment (errors+=1 is string concat, not math) ==="
e=0; e+=1; e+=1
check "old errors+=1 twice produces '011' (the bug)" "$e" "011"
e=0; e=$((e+1)); e=$((e+1))
check "fixed errors=\$((errors+1)) twice = 2" "$e" "2"

echo ""
echo "=== command negation (!(test) is a subshell, not negation) ==="
tmpfile=$(mktemp)
if ! test -f "/nonexistent_xyz_kuskus"; then r="correct"; else r="wrong"; fi
check "! test -f nonexistent → true branch taken" "$r" "correct"
if ! test -f "$tmpfile"; then r="false negative"; else r="correct"; fi
check "! test -f existing → false branch taken" "$r" "correct"
rm "$tmpfile"

echo ""
echo "=== GITHUB_OUTPUT quoting survives spaces in path ==="
TMPDIR_SPACES=$(mktemp -d "/tmp/kuskus test XXXXXX")
TMPOUT="$TMPDIR_SPACES/output"
echo "value<<EOF" >> "$TMPOUT"
echo "my-theme.json" >> "$TMPOUT"
echo "EOF" >> "$TMPOUT"
check "quoted path with spaces: first line correct" "$(head -1 "$TMPOUT")" "value<<EOF"
rm -rf "$TMPDIR_SPACES"

echo ""
echo "=== all themes declared in package.json exist on disk ==="
WORKING_DIR="$REPO_ROOT/kusto-color-themes"
THEMES=$(jq '.contributes.themes[].path' "$WORKING_DIR/package.json" --raw-output)
errors=0
for theme in $THEMES; do
  filepath="$WORKING_DIR/$theme"
  if ! test -f "$filepath"; then
    echo "  MISSING: $filepath"
    errors=$((errors+1))
  else
    echo "  FOUND: $filepath"
  fi
done
check "missing theme count = 0" "$errors" "0"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
