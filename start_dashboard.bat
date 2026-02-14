@echo off
echo Starting TSETMC Dashboard...
echo.

echo Starting FastAPI Backend...
start "FastAPI Backend" cmd /k "python api/main.py"

timeout /t 3 /nobreak > nul

echo Starting React Frontend...
start "React Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Dashboard is starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
pause
