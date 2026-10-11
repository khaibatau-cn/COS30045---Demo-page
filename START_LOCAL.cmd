@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:8765/index.html in your browser.
echo Keep this window open while using the website. Press Ctrl+C to stop.
echo If port 8765 is already in use, your preview may already be running.
set "BILLWISE_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%BILLWISE_PYTHON%" (
  "%BILLWISE_PYTHON%" -m http.server 8765 --bind 127.0.0.1
) else (
  py -m http.server 8765 --bind 127.0.0.1
)
pause
