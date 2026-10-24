#!/usr/bin/env sh
# WebXR over local Wi-Fi / Ethernet; HTTPS + advertised LAN IPv4 address.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 18+ is required. See README.md.'
  exit 1
fi
node serve-https.mjs
