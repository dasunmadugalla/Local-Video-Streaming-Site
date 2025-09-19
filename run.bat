@echo off
:: Start Backend hidden
powershell -WindowStyle Hidden -Command ^
  "Start-Process 'npm' -ArgumentList 'run dev -- --host' -WorkingDirectory 'C:\Users\dasun\OneDrive\Desktop\delete practice\backend' -WindowStyle Hidden"

:: Start Frontend hidden
powershell -WindowStyle Hidden -Command ^
  "Start-Process 'npm' -ArgumentList 'run dev -- --host' -WorkingDirectory 'C:\Users\dasun\OneDrive\Desktop\delete practice\frontend' -WindowStyle Hidden"

exit
