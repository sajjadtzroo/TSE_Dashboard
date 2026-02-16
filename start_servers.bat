@echo off
echo Starting API server on port 8002...
start "Bourse API" cmd /K "cd /d D:\Bourse && python -m uvicorn api.main:app --host 127.0.0.1 --port 8002 --reload"

echo Starting Frontend on port 3005...
start "Bourse Frontend" cmd /K "cd /d D:\Bourse\frontend && npx vite --port 3005"

echo.
echo Both servers starting in separate windows.
echo API: http://localhost:8002
echo Frontend: http://localhost:3005
echo.
pause
