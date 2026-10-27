#!/usr/bin/env bash
# Finish moving the last three service folders into services/.
# Run it from the repo root AFTER you closed everything that holds them open:
#   - IntelliJ IDEA (File > Close Project), VS Code windows opened on these folders,
#   - any terminal whose current folder is inside user-service / payment-service / webblock-aicode-service,
#   - Claude Code sessions started in one of those folders, and any running Gradle daemon (./gradlew --stop).
# Usage: bash scripts/finish-services-move.sh
set -u
cd "$(dirname "$0")/.."
mkdir -p services
status=0
for s in user-service payment-service webblock-aicode-service; do
  if [ -d "services/$s" ]; then echo "skip   $s (already in services/)"; continue; fi
  if [ ! -d "$s" ]; then echo "skip   $s (not found at repo root)"; continue; fi
  if mv "$s" "services/$s"; then echo "moved  $s -> services/$s"; else echo "BUSY   $s (something still holds it open)"; status=1; fi
done
if [ -d services/webblock-aicode-service/.venv ]; then
  echo
  echo "Note: services/webblock-aicode-service/.venv has absolute paths inside and stops working after a move."
  echo "Recreate it:  cd services/webblock-aicode-service && rm -rf .venv && python3 -m venv .venv && . .venv/bin/activate && pip install -e '.[dev]'"
fi
echo
echo "Next: ./scripts/gradle-all.sh build   (Java services)   and   node --test .claude/hooks/tests/hooks.test.mjs"
exit $status
