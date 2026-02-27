#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Stage tracked/untracked changes, then drop temporary runtime files.
git add -A
for transient in .petshop-dev.log .petshop-dev.pid .petshop-heal.pid tsconfig.tsbuildinfo; do
  git reset -- "$transient" >/dev/null 2>&1 || true
done

# Skip commit when there is nothing staged.
if git diff --cached --quiet; then
  exit 0
fi

stamp="$(date '+%Y-%m-%d %H:%M')"
git commit -m "checkpoint ${stamp}"
