#!/usr/bin/env bash
# start.sh — Launch Signal Watch (backend + frontend)
#
# Usage:
#   chmod +x start.sh
#   ./start.sh
#
# Backend  → http://localhost:8006   (FastAPI + uvicorn)
# Frontend → http://localhost:5026   (Python dynamic server)
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=8006
FRONTEND_PORT=5026

# ── Colours ───────────────────────────────────────────────────
C_RESET='\033[0m'
C_CYAN='\033[0;36m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[1;33m'
C_RED='\033[0;31m'
C_BOLD='\033[1m'

log() { echo -e "${C_CYAN}  ◆${C_RESET} $*"; }
ok()  { echo -e "${C_GREEN}  ✓${C_RESET} $*"; }
err() { echo -e "${C_RED}  ✗${C_RESET} $*"; }

echo ""
echo -e "${C_BOLD}  ════════════════════════════════════════${C_RESET}"
echo -e "${C_BOLD}  ◆  SIGNAL WATCH — Starting Services${C_RESET}"
echo -e "${C_BOLD}  ════════════════════════════════════════${C_RESET}"
echo ""

# ── Free ports if occupied ────────────────────────────────────
for PORT in $BACKEND_PORT $FRONTEND_PORT; do
  PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PID" ]; then
    log "Freeing port $PORT (PID $PID)"
    kill -9 "$PID" 2>/dev/null || true
    sleep 0.3
  fi
done

# ── Check Python deps ─────────────────────────────────────────
if ! python3 -c "import fastapi, uvicorn, yfinance, pandas, numpy" 2>/dev/null; then
  log "Installing Python dependencies..."
  pip install -r "$PROJECT_DIR/requirements.txt" -q
fi

# ── Start backend ─────────────────────────────────────────────
log "Starting backend  → ${C_CYAN}http://localhost:${BACKEND_PORT}${C_RESET}"
cd "$PROJECT_DIR/backend"
uvicorn main:app \
  --host 0.0.0.0 \
  --port "$BACKEND_PORT" \
  --reload \
  --log-level warning \
  &
BACKEND_PID=$!
cd "$PROJECT_DIR"

# ── Wait for backend to be ready ─────────────────────────────
log "Waiting for backend..."
for i in $(seq 1 20); do
  if curl -sf "http://localhost:${BACKEND_PORT}/health" > /dev/null 2>&1; then
    ok "Backend ready (${i}s)"
    break
  fi
  sleep 1
  if [ "$i" -eq 20 ]; then
    err "Backend did not start in 20s — check logs above"
  fi
done

# ── Start frontend ────────────────────────────────────────────
log "Starting frontend → ${C_CYAN}http://localhost:${FRONTEND_PORT}${C_RESET}"
python3 "$PROJECT_DIR/server.py" &
FRONTEND_PID=$!

sleep 1

echo ""
echo -e "${C_BOLD}  ════════════════════════════════════════${C_RESET}"
echo -e "  ${C_GREEN}◆  All services running${C_RESET}"
echo ""
echo -e "  ${C_CYAN}Frontend${C_RESET}  →  http://localhost:${FRONTEND_PORT}"
echo -e "  ${C_CYAN}Backend${C_RESET}   →  http://localhost:${BACKEND_PORT}"
echo -e "  ${C_CYAN}API Docs${C_RESET}  →  http://localhost:${BACKEND_PORT}/docs"
echo -e "  ${C_CYAN}Health${C_RESET}    →  http://localhost:${BACKEND_PORT}/health"
echo ""
echo -e "  Press ${C_BOLD}Ctrl+C${C_RESET} to stop all services"
echo -e "${C_BOLD}  ════════════════════════════════════════${C_RESET}"
echo ""

# ── Graceful shutdown ─────────────────────────────────────────
cleanup() {
  echo ""
  log "Stopping services..."
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  ok "Stopped. Goodbye."
  exit 0
}
trap cleanup INT TERM

# Keep script alive
wait "$BACKEND_PID" "$FRONTEND_PID"
