@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 18+ is required. See README.md.
  pause
  exit /b 1
)
node serve-https.mjs
if errorlevel 1 (
  echo See README.md for OpenSSL or mkcert installation instructions.
  pause
)
