---
description: Show what one service owns, gives, needs, sends and listens to (from the catalog and the code)
argument-hint: "[service-name]"
---
Explain **$ARGUMENTS** in simple English for a teammate who has never opened it. Read `.claude/rules/repo-layout.md`, `contracts/CATALOG.md`, then the folder under `services/`.

Use this exact shape:
- **What it is for** (one sentence) and its port / API prefix / language.
- **Owns:** tables (check `src/main/resources/db/migration` or `sql/`) - say which exist vs only planned.
- **Gives** (others call it): REST under `/api/<service>/v1`, gRPC from the catalog, with the file path of each contract.
- **Needs** (it calls): which service, which method, REST/Feign or gRPC today.
- **Sends events / Listens to events:** names, queues, and whether outbox/inbox exist.
- **Folder layout today:** the real tree two levels under the main package; mark folders that are empty or still on the old layout.
- **What is built vs only planned**, honestly (many services are scaffolds).
- **Where to add the next thing** for the three most likely tasks (new endpoint, new event, new call), pointing to the matching skill.
Do not edit anything.
