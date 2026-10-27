#!/usr/bin/env bash
# Run a Gradle task in every Java service (any folder under services/ with its own gradlew).
# Usage: ./scripts/gradle-all.sh build        (default task: build)
set -u
root="$(cd "$(dirname "$0")/../services" && pwd)"
task="${*:-build}"
failed=()

for dir in "$root"/*/; do
  svc="$(basename "$dir")"
  [ -f "$dir/gradlew" ] || continue
  echo "==> $svc: gradlew $task"
  if (cd "$dir" && sh ./gradlew $task -q); then
    echo "    OK"
  else
    echo "    FAILED"
    failed+=("$svc")
  fi
done

if [ ${#failed[@]} -gt 0 ]; then
  echo "Failed: ${failed[*]}"
  exit 1
fi
echo "All services passed."
