#!/bin/bash
# Rebuilds Md-Limon-Ali-Resume.pdf from the live resume page (resume/index.html, which reads your
# skills/projects from Supabase). Run from the project folder:  bash scripts/make-resume-pdf.sh
set -e
cd "$(dirname "$0")/.."
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT=4189
python3 -m http.server $PORT >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
sleep 1
TMP=$(mktemp -d)
"$CH" --headless=new --disable-gpu --user-data-dir="$TMP" --no-pdf-header-footer \
  --virtual-time-budget=9000 --run-all-compositor-stages-before-draw \
  --print-to-pdf="Md-Limon-Ali-Resume.pdf" "http://localhost:$PORT/resume/"
echo "Done: Md-Limon-Ali-Resume.pdf updated. Commit and push it to publish."
