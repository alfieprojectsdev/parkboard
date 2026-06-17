#!/usr/bin/env bash
# Secret-rotation runbook for ParkBoard — companion to
# plans/SECRET_ROTATION_PLAYBOOK_20260617.md
#
# Automates only the scriptable parts. The actual rotations (Neon reset,
# Supabase delete, Google revoke, Vercel env edits in the dashboard) are
# console actions — see the playbook checklist.
#
# This script contains NO secret values. New values come from args/env/stdin
# and are never echoed in full or written to tracked files.
#
# All subcommands are idempotent or read-only EXCEPT `scrub-history`
# (destructive — rewrites git history; guarded behind an explicit CONFIRM).
#
# Usage:
#   plans/rotate-secrets.sh <command> [args]
#
# Commands:
#   gen-nextauth                 Print a fresh NEXTAUTH_SECRET (openssl rand -base64 32)
#   verify-neon <conn-string>    Run `select 1` against a Neon connection string
#   set-vercel-env <NAME>        Set/replace a Vercel env var (prompts for value; needs `vercel login`)
#   scan                         Read-only sweep for leftover leaked-secret patterns (tree + history)
#   scrub-history <repl-file>    DESTRUCTIVE: git filter-repo --replace-text, then instructions to force-push
#   checklist                    Print the manual console steps (default)
set -euo pipefail

repo_root() { git rev-parse --show-toplevel 2>/dev/null || pwd; }

cmd_gen_nextauth() {
  command -v openssl >/dev/null || { echo "openssl not found" >&2; exit 1; }
  echo "New NEXTAUTH_SECRET (set in Vercel + local .env, do NOT commit):"
  openssl rand -base64 32
}

cmd_verify_neon() {
  local conn="${1:?usage: verify-neon <connection-string>}"
  command -v psql >/dev/null || { echo "psql not found (install postgresql-client)" >&2; exit 1; }
  echo "Connecting…"
  if psql "$conn" -tAc 'select 1' | grep -qx 1; then
    echo "OK — Neon connection works."
  else
    echo "FAILED — check the connection string / password reset." >&2
    exit 1
  fi
}

cmd_set_vercel_env() {
  local name="${1:?usage: set-vercel-env <NAME>}"
  command -v vercel >/dev/null || { echo "vercel CLI not found (npm i -g vercel; vercel login)" >&2; exit 1; }
  # Idempotent: remove existing var (ignore if absent), then add for prod+preview.
  for env in production preview; do
    vercel env rm "$name" "$env" -y >/dev/null 2>&1 || true
    echo "Enter value for $name [$env] (input hidden):"
    vercel env add "$name" "$env"
  done
  echo "Set $name on production+preview. Redeploy to pick it up."
}

cmd_scan() {
  local root; root="$(repo_root)"
  echo "== tracked-file scan (committable content; patterns, not values) =="
  echo "   (gitignored .env.* legitimately hold live secrets and are excluded)"
  local hits=0
  # Scan only git-TRACKED files (a leak that matters is one that's committed).
  # Exclude this runbook — it contains the patterns themselves.
  local self=':(exclude)plans/rotate-secrets.sh'
  local pat
  for pat in 'npg_[A-Za-z0-9]{8,}' \
             'SUPABASE_SERVICE_ROLE_KEY=eyJ' \
             'GOCSPX-[A-Za-z0-9_-]{10,}' \
             'NEXTAUTH_SECRET=[A-Za-z0-9+/=]{16,}'; do
    if git -C "$root" grep -lIE "$pat" -- . "$self" 2>/dev/null; then hits=1; fi
  done
  # On-disk OAuth key file (untracked but sensitive)
  ls "$root"/lib/client_secret_*.json 2>/dev/null && hits=1 || true
  [ "$hits" -eq 0 ] && echo "  clean — no leaked-secret patterns in tracked files."
  echo
  echo "== git history note =="
  echo "  Secrets may still exist in past commits even when the tree is clean."
  echo "  Rotation (not deletion) is what neutralizes them. Use scrub-history for hygiene."
  echo
  echo "  Reminder: your gitignored .env.dev/.env.prod/.env.local still hold the"
  echo "  LIVE secrets — rotate them per the playbook, then update those files."
}

cmd_scrub_history() {
  local repl="${1:?usage: scrub-history <replacements-file>}"
  [ -f "$repl" ] || { echo "replacements file not found: $repl" >&2; exit 1; }
  command -v git-filter-repo >/dev/null || command -v git >/dev/null \
    || { echo "git-filter-repo required (pip install git-filter-repo)" >&2; exit 1; }
  echo "DESTRUCTIVE: rewrites ALL history using $repl (lines like  OLD==>REDACTED )."
  echo "Rotate the secrets FIRST. This breaks existing clones and needs a force-push."
  printf 'Type CONFIRM to proceed: '
  read -r ans
  [ "$ans" = "CONFIRM" ] || { echo "aborted."; exit 1; }
  git filter-repo --replace-text "$repl"
  echo
  echo "Done. Now:  git push --force --all  &&  git push --force --tags"
  echo "(Coordinate first — PR #1 and any clones will need a reset.)"
}

cmd_checklist() {
  cat <<'TXT'
ParkBoard secret rotation — manual console steps (cannot be scripted):

  1. Neon     Console -> Branches -> Roles -> neondb_owner -> Reset password
              then: rotate-secrets.sh verify-neon "<new-conn-string>"
  2. Supabase Dashboard -> Settings -> General -> Delete project  (kills service_role)
  3. NextAuth rotate-secrets.sh gen-nextauth   -> set NEXTAUTH_SECRET in Vercel + local
  4. Google   Cloud Console (project strange-mariner-474408-r4) -> APIs & Services
              -> Credentials -> delete the OAuth client secret

  5. Vercel   set DATABASE_URL + NEXTAUTH_SECRET (prod+preview); remove SUPABASE_*/GOOGLE_*
  6. Verify   rotate-secrets.sh scan   (expect: clean)
  7. GitHub   Security -> Secret scanning alerts -> review/resolve

Full detail: plans/SECRET_ROTATION_PLAYBOOK_20260617.md
TXT
}

case "${1:-checklist}" in
  gen-nextauth)   cmd_gen_nextauth ;;
  verify-neon)    shift; cmd_verify_neon "$@" ;;
  set-vercel-env) shift; cmd_set_vercel_env "$@" ;;
  scan)           cmd_scan ;;
  scrub-history)  shift; cmd_scrub_history "$@" ;;
  checklist|"")   cmd_checklist ;;
  *) echo "unknown command: $1" >&2; cmd_checklist; exit 1 ;;
esac
