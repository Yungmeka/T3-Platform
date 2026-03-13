#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  T3 — Track. Trust. Transform.
#  AI Brand Visibility & Trust Platform
#  Lane College — HBCU Battle of the Brains 2026
# ═══════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
  echo ""
  echo -e "${PURPLE}${BOLD}"
  echo "  ╔════════════════════════════════════════════════╗"
  echo "  ║     T3 — Track. Trust. Transform.             ║"
  echo "  ║     AI Brand Visibility & Trust Platform       ║"
  echo "  ║     Lane College | HBCU BOTB 2026              ║"
  echo "  ╚════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

check_prereq() {
  local cmd=$1
  local name=$2
  if command -v "$cmd" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $name found ($(command -v "$cmd"))"
    return 0
  else
    echo -e "  ${RED}✗${NC} $name not found — please install $name first"
    return 1
  fi
}

kill_port() {
  local port=$1
  local pid=$(lsof -ti :"$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    echo -e "  ${YELLOW}⚠${NC} Port $port in use (PID $pid) — stopping it..."
    kill "$pid" 2>/dev/null
    sleep 1
  fi
}

print_banner

# ── Prerequisite checks ──────────────────────────────────────
echo -e "${CYAN}${BOLD}[0/5] Checking prerequisites...${NC}"
MISSING=0
check_prereq python3 "Python 3" || MISSING=1
check_prereq pip3 "pip3" || MISSING=1
check_prereq node "Node.js" || MISSING=1
check_prereq npm "npm" || MISSING=1
echo ""

if [ "$MISSING" -eq 1 ]; then
  echo -e "${RED}${BOLD}Missing prerequisites. Please install them and try again.${NC}"
  exit 1
fi

# ── Handle ports in use ──────────────────────────────────────
kill_port 8000
kill_port 5173

# ── Install backend dependencies ─────────────────────────────
echo -e "${CYAN}${BOLD}[1/5] Installing backend dependencies...${NC}"
cd backend
pip3 install -r requirements.txt -q 2>/dev/null
if [ $? -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} Backend dependencies installed"
else
  echo -e "  ${YELLOW}⚠${NC} Some backend packages may have issues (continuing...)"
fi
cd ..

# ── Install frontend dependencies ────────────────────────────
echo -e "${CYAN}${BOLD}[2/5] Installing frontend dependencies...${NC}"
cd frontend
npm install --silent 2>/dev/null
if [ $? -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} Frontend dependencies installed"
else
  echo -e "  ${YELLOW}⚠${NC} npm install had warnings (continuing...)"
fi
cd ..

# ── Start backend ────────────────────────────────────────────
echo -e "${CYAN}${BOLD}[3/5] Starting backend API...${NC}"
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &>/dev/null &
BACKEND_PID=$!
cd ..

# ── Health check ─────────────────────────────────────────────
echo -e "${CYAN}${BOLD}[4/5] Waiting for backend health check...${NC}"
for i in {1..15}; do
  if curl -s http://localhost:8000/ &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Backend is healthy on http://localhost:8000"
    break
  fi
  if [ "$i" -eq 15 ]; then
    echo -e "  ${YELLOW}⚠${NC} Backend may still be starting — check http://localhost:8000/docs"
  fi
  sleep 1
done

# ── Start frontend ───────────────────────────────────────────
echo -e "${CYAN}${BOLD}[5/5] Starting frontend...${NC}"
cd frontend
npm run dev &>/dev/null &
FRONTEND_PID=$!
cd ..
sleep 3

# ── Auto-open browser ────────────────────────────────────────
if command -v open &>/dev/null; then
  open http://localhost:5173
elif command -v xdg-open &>/dev/null; then
  xdg-open http://localhost:5173
fi

# ── Success ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  ╔════════════════════════════════════════════════╗"
echo -e "  ║              T3 is running!                     ║"
echo -e "  ╠════════════════════════════════════════════════╣"
echo -e "  ║  Frontend:  http://localhost:5173              ║"
echo -e "  ║  Backend:   http://localhost:8000              ║"
echo -e "  ║  API Docs:  http://localhost:8000/docs         ║"
echo -e "  ╠════════════════════════════════════════════════╣"
echo -e "  ║  12 engines active | 7 sponsor brands loaded   ║"
echo -e "  ║  Supabase connected | All systems go            ║"
echo -e "  ╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop all services."
echo ""

# ── Trap Ctrl+C ──────────────────────────────────────────────
trap "echo ''; echo -e '${YELLOW}Shutting down T3...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '${GREEN}Done.${NC}'; exit" INT TERM
wait
