#!/bin/bash

echo "Starting TSETMC Dashboard..."
echo ""

echo "Starting FastAPI Backend..."
python api/main.py &
BACKEND_PID=$!

sleep 3

echo "Starting React Frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Dashboard is starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
