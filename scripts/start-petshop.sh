#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

NODE_BIN="$(command -v node || true)"

if [[ -z "${NODE_BIN}" && -s "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  source "${HOME}/.nvm/nvm.sh"
  NODE_BIN="$(command -v node || true)"
fi

if [[ -z "${NODE_BIN}" ]]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node /usr/bin/node; do
    if [[ -x "${candidate}" ]]; then
      NODE_BIN="${candidate}"
      break
    fi
  done
fi

if [[ -z "${NODE_BIN}" ]]; then
  echo "Node.js não encontrado. Instale o Node 20+ para iniciar o PetShop." >&2
  exit 127
fi

cd "${PROJECT_DIR}"
exec "${NODE_BIN}" scripts/start-petshop.mjs
