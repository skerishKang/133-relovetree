@echo off
echo ==========================================
echo      LoveTree Local Server Launcher
echo ==========================================
echo.
echo Starting a local web server to enable YouTube playback...
echo.
echo Once the server starts, open your browser and go to:
echo http://localhost:8000/index.html
echo.
echo (Keep this window open while using the site)
echo.
python -m http.server 8000
pause
