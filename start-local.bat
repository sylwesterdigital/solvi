@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel% == 0 (
  node serve.mjs
  goto :eof
)
where python >nul 2>nul
if %errorlevel% == 0 (
  python -m http.server 8080
  goto :eof
)
echo Please install Node.js or Python 3. See README.md.
pause
