@echo off
echo Starting Backend and Frontend in same terminal...

cd /d "C:\Users\dasun\OneDrive\Desktop\delete practice\backend"
start "" /b cmd /c "npm run dev -- --host"

cd /d "C:\Users\dasun\OneDrive\Desktop\delete practice\frontend"
start "" /b cmd /c "npm run dev -- --host"

echo Both started in background of this same window!
pause
