#!/usr/bin/env bash
# interactive-commit.sh
# Generic helper for staging, reviewing, committing, and pushing

set -euo pipefail

echo "===> Current branch & status"
git status
echo
read -r -p "Continue with staging? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

### 1. Stage changes (edit these patterns as needed) ###
echo "===> Stage changes"
# Examples:
# git add -u            # stage modified & deleted files
# git add src/          # stage everything under src/
# git add file1 file2   # stage specific files

# Default suggestion:
git add -u
git add .

git status
echo
read -r -p "Review staged files above. Continue to commit? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

### 2. Commit ###
echo "===> Commit"
read -r -p "Enter commit message: " msg
git commit -m "$msg"

echo
read -r -p "Push to origin/main now? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

### 3. Push ###
echo "===> Push"
git push origin main

echo "✅ All done."

# How to use it:

# 1. Save as `interactive-commit.sh` (or any name).
# 2. `chmod +x interactive-commit.sh`.
# 3. Run whenever you’re ready to commit:

#    ```bash
#    ./interactive-commit.sh
#    ```
# 4. Edit the `git add` lines inside for each commit scope (or comment them out and use `git add -p` inside the script).

# > The key idea: keep the pauses (`read -r -p`) so you can review at each step, while leaving the `git add` block easy to tweak for whatever set of files you’re committing.
