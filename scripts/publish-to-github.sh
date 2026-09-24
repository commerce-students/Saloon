#!/usr/bin/env bash
#
# Publishes this project to GitHub as `chic-by-sisters-clinic-booking`.
#
#   ./scripts/publish-to-github.sh [owner]
#
# Run it from the repository root, signed in with the GitHub CLI:
#
#   gh auth login            # once, if you have not already
#   ./scripts/publish-to-github.sh
#
# The script creates the repository (public by default), adds it as the remote
# `clinic`, and pushes the current branch to its `main`. Secrets are never
# touched: `.env*` files are git-ignored, and only `.env.example` is committed.

set -euo pipefail

REPO_NAME="chic-by-sisters-clinic-booking"
DESCRIPTION="Appointment-booking website for Chic by Sisters Clinic (Muscat, Oman) — Next.js, TypeScript, Tailwind CSS"
OWNER="${1:-}"
TARGET="${OWNER:+$OWNER/}$REPO_NAME"
REMOTE="clinic"

if ! command -v gh >/dev/null 2>&1; then
  echo "The GitHub CLI (gh) is required: https://cli.github.com" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not signed in to GitHub. Run: gh auth login" >&2
  exit 1
fi

if git status --porcelain | grep -q .; then
  echo "There are uncommitted changes. Commit them first so the push is complete." >&2
  exit 1
fi

if git ls-files | grep -E '(^|/)\.env($|\.)' | grep -qv '\.env\.example'; then
  echo "Refusing to publish: an environment file is tracked by git. Remove it and rotate the credentials." >&2
  exit 1
fi

echo "Creating ${TARGET} ..."
if gh repo view "$TARGET" >/dev/null 2>&1; then
  echo "Repository already exists — pushing into it."
else
  gh repo create "$TARGET" --public --description "$DESCRIPTION"
fi

if git remote get-url "$REMOTE" >/dev/null 2>&1; then
  git remote set-url "$REMOTE" "https://github.com/${TARGET}.git"
else
  git remote add "$REMOTE" "https://github.com/${TARGET}.git"
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "Pushing ${CURRENT_BRANCH} → ${TARGET}:main ..."
git push "$REMOTE" "${CURRENT_BRANCH}:main"

echo
echo "Done: https://github.com/${TARGET}"
echo "Next: add the environment variables from .env.example in your hosting dashboard"
echo "      (see docs/DEPLOYMENT.md) and connect Supabase when you are ready."
