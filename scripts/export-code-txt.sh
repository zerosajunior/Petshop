#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_PATH="${1:-/Users/josejunior/Desktop/petshop-codigo.txt}"

mkdir -p "$(dirname "$OUTPUT_PATH")"

if ! : > "$OUTPUT_PATH"; then
  echo "Falha ao escrever no destino: $OUTPUT_PATH" >&2
  exit 1
fi

{
  echo "PETSHOP CODE EXPORT"
  echo "Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "Project root: $ROOT_DIR"
  echo
} >> "$OUTPUT_PATH"

cd "$ROOT_DIR"

find . \
  \( -path "./.git" -o -path "./node_modules" -o -path "./.next" -o -path "./prisma/dev.db" -o -path "./.next.broken.*" -o -path "./.next.heal.*" \) -prune -o \
  -type f \
  ! -name "*.log" \
  ! -name "*.pid" \
  ! -name "*.png" \
  ! -name "*.jpg" \
  ! -name "*.jpeg" \
  ! -name "*.gif" \
  ! -name "*.webp" \
  ! -name "*.ico" \
  ! -name "*.pdf" \
  ! -name "*.zip" \
  ! -name "*.sqlite" \
  ! -name "*.db" \
  ! -name "*.mp4" \
  ! -name "*.mov" \
  ! -name "*.wav" \
  ! -name "*.mp3" \
  -print0 | sort -z | while IFS= read -r -d '' file; do
    rel="${file#./}"

    if file --mime "$file" | grep -q "charset=binary"; then
      continue
    fi

    {
      echo "============================================================"
      echo "FILE: $rel"
      echo "============================================================"
      cat "$file"
      echo
      echo
    } >> "$OUTPUT_PATH"
  done

echo "Arquivo gerado em: $OUTPUT_PATH"
