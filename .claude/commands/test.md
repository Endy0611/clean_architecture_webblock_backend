---
description: Run tests for one service or the web app and explain failures
argument-hint: "[service-name | web | all]"
---
Run tests for **$ARGUMENTS**:
- service name → `cd $ARGUMENTS-service && ./gradlew test` (Java) or `cd $ARGUMENTS-service && python -m pytest` (Python: ai-generator, provisioning)
- `web` → `cd apps/web && npm run lint && npm run typecheck && npm test`
- `all` → `./scripts/gradle-all.sh test`, then pytest in each Python service

For each failure: test name → the real error line → likely cause with evidence. Do not change code unless I ask.
