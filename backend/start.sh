#!/bin/bash
# Start backend with proper error handling

# Get the directory where this script is located
SCRIPT_DIR="$(dirname "$(realpath "$0")")"

# Check if we're already in backend directory or need to navigate
if [[ "$SCRIPT_DIR" == *"backend"* ]]; then
    # Already in backend or script is in backend
    cd "$SCRIPT_DIR"
else
    # Navigate to backend directory
    cd "$SCRIPT_DIR/backend"
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Run: python3 -m venv venv"
    exit 1
fi

# Activate venv
source venv/bin/activate

# Kill any existing backend processes (both ports)
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null
echo "Killed existing backend processes on ports 8000 and 8001."

sleep 2

# Start backend on port 8001
echo "Starting backend server on port 8001..."
python3 -u main.py > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for startup
sleep 3

# Check if it's running on port 8001
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✓ Backend started successfully on port 8001 (PID: $BACKEND_PID)"
    echo "Backend URL: http://localhost:8001"
    echo "API Docs: http://localhost:8001/docs"
    echo "Logs: tail -f backend.log"
else
    echo "✗ Backend failed to start. Check backend.log for errors."
    exit 1
fi