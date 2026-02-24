#!/bin/zsh
set -e

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

PROJECT_DIR="/Users/josejunior/Projetos/Petshop"
PORT="3000"
LOG_FILE="$PROJECT_DIR/.petshop-dev.log"
PID_FILE="$PROJECT_DIR/.petshop-dev.pid"
WATCHER_SCRIPT="$PROJECT_DIR/scripts/auto-stop-petshop.sh"
NPM_BIN="$(command -v npm || true)"
WAIT_SECONDS="90"

cd "$PROJECT_DIR"

is_listening() {
  lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

stop_stale_server() {
  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"

  if [ -n "$pids" ]; then
    for pid in $pids; do
      kill -TERM "$pid" >/dev/null 2>&1 || true
    done
    sleep 2
    for pid in $pids; do
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill -KILL "$pid" >/dev/null 2>&1 || true
      fi
    done
  fi

  if [ -f "$PID_FILE" ]; then
    local tracked_pid
    tracked_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "$tracked_pid" ]; then
      kill -TERM "$tracked_pid" >/dev/null 2>&1 || true
    fi
  fi

  rm -f "$PID_FILE"
}

start_server() {
  rm -rf "$PROJECT_DIR/.next"
  nohup "$NPM_BIN" run dev >>"$LOG_FILE" 2>&1 &
  echo "$!" >"$PID_FILE"
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

if [ -z "$NPM_BIN" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') npm not found in PATH=$PATH" >>"$LOG_FILE"
  exit 1
fi

if [ ! -d node_modules ]; then
  "$NPM_BIN" install >>"$LOG_FILE" 2>&1
fi

if ! is_listening; then
  start_server

  if ! wait_for_boot; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') first boot attempt failed, retrying clean start" >>"$LOG_FILE"
    stop_stale_server
    start_server
    wait_for_boot || true
  fi
fi

if [ -f "$PID_FILE" ] && [ -x "$WATCHER_SCRIPT" ]; then
  nohup "$WATCHER_SCRIPT" >>"$LOG_FILE" 2>&1 &
fi

if is_listening; then
  open "http://localhost:$PORT"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') server did not start within ${WAIT_SECONDS}s" >>"$LOG_FILE"
  exit 1
fi
