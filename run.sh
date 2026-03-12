#!/bin/bash
echo "============================================"
echo "  T3 - Track. Trust. Transform."
echo "  AI Brand Visibility & Trust Platform"
echo "  Lane College - HBCU BOTB 2026"
echo "============================================"
echo ""

# Install backend dependencies
echo "[1/4] Installing backend dependencies..."
cd backend
pip3 install -r requirements.txt -q 2>/dev/null
cd ..

# Install frontend dependencies
echo "[2/4] Installing frontend dependencies..."
cd frontend
npm install --silent 2>/dev/null
cd ..

# Start backend
echo "[3/4] Starting backend API on http://localhost:8000..."
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "[4/4] Starting frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  T3 is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "============================================"
echo ""
echo "Press Ctrl+C to stop all services."

# Trap Ctrl+C to kill both processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
