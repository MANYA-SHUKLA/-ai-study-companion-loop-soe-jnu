#!/bin/bash
# Start backend with proper error handling

cd "$(dirname "$0")/backend"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found. Run: python3 -m venv venv"
    exit 1
fi

# Activate venv
source venv/bin/activate

# Kill any existing backend processes
lsof -ti:8001 | xargs kill -9 2>/dev/null

# Start backend
echo "Starting backend server..."
python3 -u main.py > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for startup
sleep 3

# Check if it's running
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✓ Backend started successfully (PID: $BACKEND_PID)"
    echo "Backend URL: http://localhost:8001"
    echo "API Docs: http://localhost:8001/docs"
    echo "Logs: tail -f backend/backend.log"
else
    echo "✗ Backend failed to start. Check backend.log for errors."
    exit 1
fi
