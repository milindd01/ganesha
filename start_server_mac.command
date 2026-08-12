#!/bin/bash
cd "$(dirname "$0")"
python3 scripts/refresh_gallery_manifest.py
echo "Ganesh Gallery running at: http://localhost:8000"
echo "On iPad, use your Mac's local IP address followed by :8000"
python3 -m http.server 8000
