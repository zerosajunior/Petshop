#!/bin/zsh
set -e

PROJECT_DIR="/Users/josejunior/Projetos/Petshop"
PORT="3000"
PID_FILE="$PROJECT_DIR/.petshop-dev.pid"
LOG_FILE="$PROJECT_DIR/.petshop-dev.log"
CHECK_INTERVAL_SEC="10"
IDLE_LIMIT_SEC="900"

if [ ! -f "$PID_FILE" ]; then
  exit 0
fi

SERVER_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -z "$SERVER_PID" ]; then
  rm -f "$PID_FILE"
  exit 0
fi

idle_for=0

while kill -0 "$SERVER_PID" >/dev/null 2>&1; do
  established_count="$(lsof -n -iTCP:"$PORT" -sTCP:ESTABLISHED 2>/dev/null | awk 'NR>1 {count++} END {print count+0}')"

  if [ "$established_count" -gt 0 ]; then
    idle_for=0
  else
    idle_for=$((idle_for + CHECK_INTERVAL_SEC))
  fi

  if [ "$idle_for" -ge "$IDLE_LIMIT_SEC" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') idle timeout reached, stopping dev server pid=$SERVER_PID" >>"$LOG_FILE"
    kill -TERM "$SERVER_PID" >/dev/null 2>&1 || true
    sleep 2
    if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
      kill -KILL "$SERVER_PID" >/dev/null 2>&1 || true
    fi
    rm -f "$PID_FILE"
    exit 0
  fi

  sleep "$CHECK_INTERVAL_SEC"
done

rm -f "$PID_FILE"
