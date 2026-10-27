---
description: Start, stop or check the local WebBlock docker-compose stack
argument-hint: "[up | down | status | logs <service>]"
---
Local stack action: **$ARGUMENTS**
- `up` → `docker compose up -d`, then `docker compose ps` and report unhealthy containers.
- `down` → `docker compose down` (never add `-v`; that deletes data — ask me first).
- `status` → `docker compose ps`.
- `logs <service>` → `docker compose logs --tail=200 <service>` and summarize errors with the exact lines.
