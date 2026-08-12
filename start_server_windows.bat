@echo off
cd /d %~dp0
python scripts\refresh_gallery_manifest.py
echo Ganesh Gallery running at http://localhost:8000
python -m http.server 8000
pause
