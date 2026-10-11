@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:8765/index.html in your browser.
echo Keep this window open while using the website. Press Ctrl+C to stop.
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8765 --bind 127.0.0.1
) else (
  python -m http.server 8765 --bind 127.0.0.1
)
pause
