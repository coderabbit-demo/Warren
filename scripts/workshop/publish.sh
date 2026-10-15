#!/usr/bin/env bash
set -euo pipefail

repo="coderabbit-demo/Warren"
root="$(git rev-parse --show-toplevel)"
cd "$root"

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run gh auth login first." >&2
  exit 1
fi
actual="$(gh repo view "$repo" --json nameWithOwner --jq '.nameWithOwner')"
if [[ "$actual" != "$repo" ]]; then
  echo "Expected $repo, found $actual" >&2
  exit 1
fi

branches=(
  feat/partial-refunds
  agent/migrate-payment-provider-v2
  feat/merchant-webhook-config
  hotfix/webhook-signature-timing
  feat/session-timeout
  chore/bump-dev-deps
  docs/fix-readme-typos
  refactor/rename-money-utils
  experiment/checkout-ui-flags
  agent/add-retry-backoff
  agent/add-retry-backoff-v2
  fix/flaky-ledger-test
)
for ((n = 1; n <= 4; n++)); do
  branches+=("pair-$n/partial-refunds" "pair-$n/migrate-payment-provider-v2")
done
branches+=(fallback/partial-refunds fallback/migrate-payment-provider-v2)

echo "Branches to push:"
printf '  main\n'
printf '  %s\n' "${branches[@]}"
read -r -p 'Push these branches and open 12 PRs? [y/N] ' answer
if [[ "$answer" != y ]]; then
  echo "Cancelled."
  exit 0
fi

git push origin main
for branch in "${branches[@]}"; do
  git push origin "$branch"
done

for label in agent-authored fallback; do
  if ! gh label list --repo "$repo" --json name --jq '.[].name' | grep -Fxq "$label"; then
    if [[ "$label" == agent-authored ]]; then
      gh label create "$label" --repo "$repo" --description 'Opened by a coding agent'
    else
      gh label create "$label" --repo "$repo" --description 'Workshop backup PR'
    fi
  fi
done

issue_url="$(gh issue create --repo "$repo" --title 'Support partial refunds' --body-file scripts/workshop/issue-body.md)"
issue_number="${issue_url##*/}"
if [[ "$issue_number" != 1 ]]; then
  echo "WARNING: Issue #$issue_number was created. WORKSHOP.md and the partial-refunds PR body reference #1; update them before attendees use the links." >&2
fi

printf '%-7s %-42s %s\n' 'PR' 'Branch' 'URL'
create_pr() {
  local branch="$1" title="$2" body="$3" flag="${4:-}"
  local existing url number
  existing="$(gh pr list --repo "$repo" --state all --head "$branch" --json number --jq '.[0].number // empty')"
  if [[ -n "$existing" ]]; then
    url="$(gh pr view "$existing" --repo "$repo" --json url --jq '.url')"
    printf '#%-6s %-42s %s\n' "$existing" "$branch" "$url"
    return
  fi
  local args=(--repo "$repo" --base main --head "$branch" --title "$title" --body-file "scripts/workshop/pr-bodies/$body.md")
  case "$flag" in
    draft) args+=(--draft) ;;
    agent) args+=(--label agent-authored) ;;
    fallback) args+=(--label fallback) ;;
  esac
  url="$(gh pr create "${args[@]}")"
  number="${url##*/}"
  printf '#%-6s %-42s %s\n' "$number" "$branch" "$url"
}

create_pr hotfix/webhook-signature-timing 'Use timing-safe comparison for PayGrid webhook signatures (INC-482)' webhook-signature-timing
create_pr feat/session-timeout 'Add session timeout and token refresh' session-timeout
create_pr chore/bump-dev-deps 'Bump dev dependencies' bump-dev-deps
create_pr docs/fix-readme-typos 'Fix typos in README' fix-readme-typos
create_pr refactor/rename-money-utils 'Rename money helpers for clarity' rename-money-utils
create_pr experiment/checkout-ui-flags 'Checkout UI feature flags (WIP)' checkout-ui-flags draft
create_pr agent/add-retry-backoff 'Add exponential backoff to webhook dispatcher' retry-backoff agent
create_pr agent/add-retry-backoff-v2 'Webhook dispatcher: retry with backoff and jitter' retry-backoff-v2 agent
create_pr fix/flaky-ledger-test 'Fix flaky ledger timestamp test' flaky-ledger-test
create_pr feat/merchant-webhook-config 'Let merchants configure webhooks and search invoices' merchant-webhook-config
create_pr fallback/partial-refunds 'Add partial refunds API' partial-refunds fallback
create_pr fallback/migrate-payment-provider-v2 'Migrate payments to provider adapter with PayGrid V2 support' provider-v2 fallback
