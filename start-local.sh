#!/usr/bin/env sh
cd "$(dirname "$0")" || exit 1
if command -v node >/dev/null 2>&1; then
  node serve.mjs
elif command -v python3 >/dev/null 2>&1; then
  echo 'Solvi XR → http://localhost:8080'
  python3 -m http.server 8080
else
  echo 'Install Node.js or Python 3, then use the commands in README.md.'
  exit 1
fi
