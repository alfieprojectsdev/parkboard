#!/usr/bin/env bash
# Squash-merge a GitHub PR, delete its branch, sync local main.
# IDEMPOTENT: if the PR is already merged it reports and still syncs main.
#
# Usage:
#   scripts/merge-pr.sh <pr-number>
set -euo pipefail

PR="${1:?usage: merge-pr.sh <pr-number>}"

state="$(gh pr view "$PR" --json state --jq .state 2>/dev/null || echo UNKNOWN)"
if [ "$state" = "MERGED" ]; then
  echo "PR #$PR already merged."
else
  gh pr merge "$PR" --squash --delete-branch
fi

# Sync local main to the merged result.
git checkout main
git pull --ff-only origin main
git log --oneline -3
