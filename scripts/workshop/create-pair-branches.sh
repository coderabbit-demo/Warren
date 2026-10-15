#!/usr/bin/env bash
set -euo pipefail

count="${1:-4}"
if ! [[ "$count" =~ ^[1-9][0-9]*$ ]]; then
  echo "Count must be a positive integer" >&2
  exit 1
fi

for ((n = 1; n <= count; n++)); do
  git branch -f "pair-$n/partial-refunds" feat/partial-refunds
  git branch -f "pair-$n/migrate-payment-provider-v2" agent/migrate-payment-provider-v2
done
git branch -f fallback/partial-refunds feat/partial-refunds
git branch -f fallback/migrate-payment-provider-v2 agent/migrate-payment-provider-v2
