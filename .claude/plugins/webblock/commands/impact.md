---
description: Before changing something, list which other services are affected and in what order to change them
argument-hint: "[what you want to change, e.g. 'add field plan_id to source_published' or 'rename CheckAccess.action']"
---
Impact analysis for: **$ARGUMENTS**. Read-only; nothing is edited.

1. Name the thing precisely (contract file / message / RPC / event / REST path / status value / error code / DB table) and its **owner service**.
2. Find every user, with evidence: `grep -rn` the exact names across `services/`, `contracts/`, `docs/specs/`, `.claude/`. Also read `contracts/CATALOG.md`.
3. Classify: **additive** (safe in v1) or **breaking** (needs v2 / a staged rollout). Explain why in one sentence using the rules in `contracts.md`.
4. For each affected service give: file(s) that change, risk if it deploys before/after the owner, and the test that proves it.
5. Propose the rollout order (owner -> consumers -> retire old), and what happens during the overlap when versions differ.
6. List what must NOT be done (shortcuts that would break a boundary).
7. End with the matching skill to run next: `change-contract`, `add-grpc-method`, `add-rabbit-event`, `feign-to-grpc` or `add-feature-folder`.
Short, simple English; a table is fine.
