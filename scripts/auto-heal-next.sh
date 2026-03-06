#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/josejunior/Projetos/Petshop"
PORT="3000"
LOG_FILE="$PROJECT_DIR/.petshop-dev.log"
PID_FILE="$PROJECT_DIR/.petshop-dev.pid"
HEALER_PID_FILE="$PROJECT_DIR/.petshop-heal.pid"
CHECK_INTERVAL_SEC="4"
COOLDOWN_SEC="20"
WAIT_SECONDS="90"
NPM_BIN="$(command -v npm || true)"

cd "$PROJECT_DIR"

cleanup() {
  rm -f "$HEALER_PID_FILE"
}
trap cleanup EXIT INT TERM

echo "$$" >"$HEALER_PID_FILE"

if [ -z "$NPM_BIN" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') auto-heal: npm não encontrado no PATH" >>"$LOG_FILE"
  exit 1
fi

if [ ! -f "$PID_FILE" ]; then
  exit 0
fi

last_checked_line=0
last_heal_at=0

if [ -f "$LOG_FILE" ]; then
  last_checked_line="$(wc -l <"$LOG_FILE" | tr -d ' ')"
fi

is_listening() {
  lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

wait_for_boot() {
  for _ in $(seq 1 "$WAIT_SECONDS"); do
    if is_listening; then
      return 0
    fi
    sleep 1
  done
  return 1
}

stop_current_server() {
  if [ ! -f "$PID_FILE" ]; then
    return 0
  fi

  local current_pid
  current_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -z "$current_pid" ]; then
    rm -f "$PID_FILE"
    return 0
  fi

  kill -TERM "$current_pid" >/dev/null 2>&1 || true
  sleep 2
  if kill -0 "$current_pid" >/dev/null 2>&1; then
    kill -KILL "$current_pid" >/dev/null 2>&1 || true
  fi
}

start_clean_server() {
  local stamp
  stamp="$(date '+%Y%m%d-%H%M%S')"

  if [ -d "$PROJECT_DIR/.next" ]; then
    mv "$PROJECT_DIR/.next" "$PROJECT_DIR/.next.heal.$stamp"
  fi

  nohup "$NPM_BIN" run dev:raw >>"$LOG_FILE" 2>&1 &
  echo "$!" >"$PID_FILE"
}

has_runtime_chunk_error() {
  if [ ! -f "$LOG_FILE" ]; then
    return 1
  fi

  local total_lines delta new_lines
  total_lines="$(wc -l <"$LOG_FILE" | tr -d ' ')"

  if [ "$total_lines" -le "$last_checked_line" ]; then
    return 1
  fi

  delta=$((total_lines - last_checked_line))
  new_lines="$(tail -n "$delta" "$LOG_FILE")"
  last_checked_line="$total_lines"

  printf '%s\n' "$new_lines" | grep -Eq \
    "Cannot find module '\\./[0-9]+\\.js'|MODULE_NOT_FOUND.+\\.next/server/webpack-runtime\\.js|Failed to get source map:|\\.next/static/chunks/webpack\\.js.+ENOENT|originalFactory is undefined|can't access property \"call\"|__webpack_modules__\\[moduleId\\] is not a function|TypeError: __webpack_modules__\\[moduleId\\]"
}

while true; do
  if [ ! -f "$PID_FILE" ]; then
    exit 0
  fi

  if has_runtime_chunk_error; then
    local now
    now="$(date +%s)"
    if [ $((now - last_heal_at)) -ge "$COOLDOWN_SEC" ]; then
      echo "$(date '+%Y-%m-%d %H:%M:%S') auto-heal: erro de chunk detectado, reiniciando next dev com build limpa" >>"$LOG_FILE"
      stop_current_server
      start_clean_server

      if wait_for_boot; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') auto-heal: servidor recuperado" >>"$LOG_FILE"
      else
        echo "$(date '+%Y-%m-%d %H:%M:%S') auto-heal: servidor não respondeu após recuperação" >>"$LOG_FILE"
      fi

      last_heal_at="$now"
    fi
  fi

  sleep "$CHECK_INTERVAL_SEC"
done
