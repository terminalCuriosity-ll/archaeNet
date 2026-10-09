#!/bin/bash
# SessionStart hook for Claude Code cloud sessions.
# Installs whatever dependencies the repo declares so linters and tests work.
# Each step only runs when its manifest exists, so the hook stays a no-op
# until the SKYSWIPED programs start pulling in packages.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# JavaScript: every package.json outside node_modules (root or per-program).
while IFS= read -r manifest; do
  dir=$(dirname "$manifest")
  echo "[session-start] npm install in $dir"
  (cd "$dir" && npm install --no-audit --no-fund)
done < <(find . -name node_modules -prune -o -name package.json -print)

# Python: requirements.txt at the root.
if [ -f requirements.txt ]; then
  echo "[session-start] pip install -r requirements.txt"
  python3 -m pip install --quiet -r requirements.txt
fi

# Java: Maven or Gradle projects, resolved offline-ready.
if [ -f pom.xml ] && command -v mvn >/dev/null 2>&1; then
  echo "[session-start] mvn dependency:go-offline"
  mvn -q -B dependency:go-offline
fi
if [ -f gradlew ]; then
  echo "[session-start] ./gradlew dependencies"
  ./gradlew --quiet dependencies >/dev/null
fi

echo "[session-start] toolchain: node $(node --version), $(javac -version 2>&1 | tail -1), $(python3 --version)"
