#!/usr/bin/env bash
set -euo pipefail

repo="coderabbit-demo/Warren"
root="$(git rev-parse --show-toplevel)"
cd "$root"

echo 'Open pair and smoke PRs:'
prs="$(gh pr list --repo "$repo" --state open --limit 500 --json number,headRefName --jq '.[] | select(.headRefName | startswith("pair-") or startswith("smoke/")) | [.number, .headRefName] | @tsv')"
printf '%s\n' "$prs"
echo 'Remote pair and smoke branches:'
remote_branches="$(git branch -r --list 'origin/pair-*' 'origin/smoke/*' --format='%(refname:short)')"
printf '%s\n' "$remote_branches"
read -r -p 'Close these PRs and delete these branches? [y/N] ' answer
if [[ "$answer" != y ]]; then
  echo 'Cancelled.'
  exit 0
fi

while IFS=$'\t' read -r number branch; do
  [[ -z "$number" ]] && continue
  if [[ "$branch" == pair-* || "$branch" == smoke/* ]]; then
    gh pr close "$number" --repo "$repo"
  fi
done <<< "$prs"

while IFS= read -r remote; do
  [[ -z "$remote" ]] && continue
  branch="${remote#origin/}"
  if [[ "$branch" == pair-* || "$branch" == smoke/* ]]; then
    git push origin --delete "$branch"
  fi
done <<< "$remote_branches"

bash scripts/workshop/create-pair-branches.sh
for ((n = 1; n <= 4; n++)); do
  git push origin "pair-$n/partial-refunds"
  git push origin "pair-$n/migrate-payment-provider-v2"
done
