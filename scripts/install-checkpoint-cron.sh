#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHECKPOINT_CMD="cd ${REPO_ROOT} && ./scripts/checkpoint-commit.sh >> /tmp/petshop-checkpoint.log 2>&1"
CRON_ENTRY="0 */2 * * * ${CHECKPOINT_CMD}"

existing="$(crontab -l 2>/dev/null || true)"
cleaned="$(printf '%s\n' "$existing" | grep -v 'scripts/checkpoint-commit.sh' || true)"

{
  printf '%s\n' "$cleaned"
  printf '%s\n' "$CRON_ENTRY"
} | sed '/^$/N;/^\n$/D' | crontab -

echo "Checkpoint agendado a cada 2 horas."
echo "Comando: $CRON_ENTRY"
