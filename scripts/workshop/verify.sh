#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"
trap 'git switch --quiet main' EXIT

word_flags="$(python3 -c 'import base64; print(base64.b64decode("XGIoYnVnfHZ1bG58dnVsbmVyYWJsZXxpbnNlY3VyZXxleHBsb2l0fHBsYW50ZWR8aW50ZW50aW9uYWwobHkpP3xzc3JmfGlkb3J8YmFja2Rvb3IpXGI=").decode())')"
secret_flags="$(python3 -c 'import base64; print(base64.b64decode("KEFLSUFbMC05QS1aXXsxNn18c2tfKGxpdmV8dGVzdClfWzAtOWEtekEtWl17MTAsfXxnaHBfWzAtOWEtekEtWl17MjAsfXx4b3hbYWJwXS18LS0tLS1CRUdJTiBbQS1aIF0qUFJJVkFURSBLRVktLS0tLSk=").decode())')"
branches="$(git for-each-ref --format='%(refname:short)' refs/heads)"
failures=0

for branch in $branches; do
  git switch --quiet "$branch"
  log="$(mktemp)"
  if npm ci --prefer-offline >"$log" 2>&1 && npm run ci >>"$log" 2>&1; then
    if [[ "$branch" == fix/flaky-ledger-test ]]; then
      echo "FAIL $branch: expected one failing test"
      failures=$((failures + 1))
    else
      echo "PASS $branch: npm ci and npm run ci"
    fi
  elif [[ "$branch" == fix/flaky-ledger-test ]] && grep -Eq 'Tests[[:space:]]+1 failed' "$log" && grep -q '> test' "$log"; then
    echo "PASS $branch: exactly one test fails"
  else
    echo "FAIL $branch: CI"
    tail -25 "$log"
    failures=$((failures + 1))
  fi
  rm -f "$log"

  if hits="$(git grep -n -i -E "$word_flags" "$branch" -- 2>/dev/null)"; then
    if printf '%s\n' "$hits" | grep -v -E ":docs/standards/[^:]+:"; then
      echo "FAIL $branch: tracked language scan"
      failures=$((failures + 1))
    fi
  fi
  if git grep -n "TODO: $(printf 'security')" "$branch" --; then
    echo "FAIL $branch: tracked comment scan"
    failures=$((failures + 1))
  fi
  if git grep -n -E "$secret_flags" "$branch" --; then
    echo "FAIL $branch: credential pattern scan"
    failures=$((failures + 1))
  fi
  if git grep -n -E '\b[0-9]{13,19}\b' "$branch" --; then
    echo "FAIL $branch: card-like number scan"
    failures=$((failures + 1))
  fi
done

git switch --quiet main
if git log --all --format='%s%n%b' | grep -i -E "$word_flags"; then
  echo 'FAIL commit message scan'
  failures=$((failures + 1))
fi
if [[ -n "$(git log --all --format=%H -- ANSWER_KEY.local.md)" ]] || ! git check-ignore -q ANSWER_KEY.local.md; then
  echo 'FAIL private file history or ignore rule'
  failures=$((failures + 1))
fi

mapper="$(git show agent/migrate-payment-provider-v2:services/webhook-dispatcher/src/eventMapper.ts)"
status="$(git show agent/migrate-payment-provider-v2:packages/payments-core/src/status.ts)"
if ! grep -q "\['settled', 'refunded', 'failed'\]" <<< "$mapper" || grep -q 'Settled:' <<< "$status" || git grep -n shouldNotify agent/migrate-payment-provider-v2 -- '*.test.ts'; then
  echo 'FAIL provider event mapping contract'
  failures=$((failures + 1))
fi

check_size() {
  local branch="$1" min="$2" max="$3" min_files="${4:-0}" max_files="${5:-999}"
  local totals files added removed changed
  totals="$(git diff --numstat "main...$branch" | awk '{a+=$1; r+=$2; f++} END {print f+0, a+0, r+0}')"
  read -r files added removed <<< "$totals"
  changed=$((added + removed))
  if ((changed < min || changed > max || files < min_files || files > max_files)); then
    echo "FAIL $branch size: $files files, +$added -$removed"
    failures=$((failures + 1))
  else
    echo "PASS $branch size: $files files, +$added -$removed"
  fi
}
check_size feat/partial-refunds 150 300
check_size agent/migrate-payment-provider-v2 1500 2500 25 40
check_size feat/merchant-webhook-config 250 450

for ((n = 1; n <= 4; n++)); do
  git diff --quiet feat/partial-refunds "pair-$n/partial-refunds" || failures=$((failures + 1))
  git diff --quiet agent/migrate-payment-provider-v2 "pair-$n/migrate-payment-provider-v2" || failures=$((failures + 1))
done
git diff --quiet feat/partial-refunds fallback/partial-refunds || failures=$((failures + 1))
git diff --quiet agent/migrate-payment-provider-v2 fallback/migrate-payment-provider-v2 || failures=$((failures + 1))
node scripts/workshop/verify-config.mjs || failures=$((failures + 1))
python3 scripts/workshop/verify-links.py || failures=$((failures + 1))

if ((failures > 0)); then
  echo "Verification failed: $failures checks"
  exit 1
fi
echo 'Verification passed'
