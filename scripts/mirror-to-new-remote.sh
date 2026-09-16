#!/usr/bin/env bash
#
# Mirror this repo to a NEW GitHub remote you fully own.
#
#   bash scripts/mirror-to-new-remote.sh <owner>/<repo> [--private]
#
# WHY THIS EXISTS
#   The current origin is whisperingpalmstech-hub/whispering-palms, where this
#   account has push but NOT admin rights. Vercel's GitHub App has to be
#   installed on the repo's OWNER to import a project, and installing an App
#   is an admin/owner action. So without org-owner access, Vercel cannot see
#   that repo — no amount of Vercel-side clicking fixes it.
#
#   Pushing to a repo you own removes that dependency entirely.
#
# WHAT IT DOES
#   1. Creates the new repo under your account (gh repo create).
#   2. Adds it as a SECOND remote called `newremote` — origin is left alone,
#      so nothing about the existing setup breaks and this is reversible.
#   3. Pushes every branch and tag.
#   4. Prints what to do next.
#
# WHAT IT DOES NOT DO
#   No force-push, no history rewrite, no deletion, no change to origin.
set -euo pipefail

TARGET="${1:-}"
VISIBILITY="--public"
[ "${2:-}" = "--private" ] && VISIBILITY="--private"

if [ -z "$TARGET" ]; then
  echo "usage: bash scripts/mirror-to-new-remote.sh <owner>/<repo> [--private]" >&2
  echo "   eg: bash scripts/mirror-to-new-remote.sh adminforhtt/whispering-palms --private" >&2
  exit 1
fi

echo "== preflight =="
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "  WARNING: uncommitted changes present; they will NOT be pushed."
fi
TRACKED_ENV=$(git ls-files | grep -cE '\.env|env\.local' || true)
if [ "$TRACKED_ENV" != "0" ]; then
  echo "  ABORT: $TRACKED_ENV env file(s) are tracked. Remove them before mirroring." >&2
  exit 1
fi
echo "  no env files tracked"
echo "  current origin: $(git remote get-url origin)"

echo "== creating $TARGET =="
if gh repo view "$TARGET" >/dev/null 2>&1; then
  echo "  already exists, reusing"
else
  gh repo create "$TARGET" $VISIBILITY \
    --description "Whispering Palms — AI palmistry and astrology readings"
fi

echo "== wiring remote 'newremote' =="
git remote remove newremote 2>/dev/null || true
git remote add newremote "https://github.com/$TARGET.git"

echo "== pushing all branches and tags =="
git push newremote --all
git push newremote --tags

echo
echo "== done =="
echo "  new remote : https://github.com/$TARGET"
echo "  origin     : unchanged ($(git remote get-url origin))"
echo
echo "Next:"
echo "  1. Import at https://vercel.com/new — the repo is under your own"
echo "     account, so Vercel's GitHub App can be installed without org admin."
echo "  2. Add env vars (see docs/DEPLOY.md)."
echo "  3. To make this the default push target:"
echo "       git remote rename origin oldorigin && git remote rename newremote origin"
