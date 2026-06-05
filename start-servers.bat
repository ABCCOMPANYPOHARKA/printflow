@echo off
echo Starting PrintFlow Studio Servers...
echo =======================================

echo.
echo Starting Backend Server (Port 3001)...
start "PrintFlow Backend" cmd /k "cd backend && node server.js"

echo.
echo Starting Frontend Server (Port 5173)...
start "PrintFlow Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =======================================
echo Both servers are starting up in separate windows!
echo Once they load, open your browser and go to http://localhost:5173
echo You can close this launcher window now.
pause
