#!/bin/bash
# Quick script to check if backend is running

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✓ Backend is running on http://localhost:8000"
    exit 0
else
    echo "✗ Backend is NOT running"
    echo "To start: cd backend && ./start.sh"
    exit 1
fi
