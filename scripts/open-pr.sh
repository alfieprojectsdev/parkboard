#!/usr/bin/env bash
# Open (or report) a GitHub PR against main for a given branch.
# Reusable for the v2 PR-per-milestone workflow (CodeRabbit reviews on open).
# IDEMPOTENT: safe to re-run — pushes only what's needed, and if a PR for the
# branch already exists it prints that PR's URL instead of failing.
#
# Usage:
#   scripts/open-pr.sh <head-branch> <title> <body-file>
#
# Example:
#   scripts/open-pr.sh v2/plan-and-schema "docs(v2): plan + schema" /tmp/v2-pr-body.md
set -euo pipefail

HEAD="${1:?usage: open-pr.sh <head-branch> <title> <body-file>}"
TITLE="${2:?missing title}"
BODY="${3:?missing body file}"

[ -f "$BODY" ] || { echo "body file not found: $BODY" >&2; exit 1; }

# 1. Ensure the branch is on origin and up to date (no-op if already pushed).
git push -u origin "$HEAD"

# 2. If a PR for this head branch already exists, report it and stop (idempotent).
existing="$(gh pr list --head "$HEAD" --state open --json url --jq '.[0].url // empty')"
if [ -n "$existing" ]; then
  echo "PR already open for $HEAD: $existing"
  exit 0
fi

# 3. Otherwise create it.
gh pr create --base main --head "$HEAD" --title "$TITLE" --body-file "$BODY"
