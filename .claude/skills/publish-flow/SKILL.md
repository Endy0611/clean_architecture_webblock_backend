---
name: publish-flow
description: End-to-end WebBlock publish/deploy flow across project, payment, ai and provisioning services — Deploy click, subdomain, trial/plan check, generation, Git push, build, promote, rollback, notifications. Use when working on or debugging deploy/redeploy.
---
# Publish flow (Deploy / Redeploy)

From workflow "Website Management" + "Deployment":
1. Editor **Deploy** → **Is anything changed?** No → "No changes to deploy".
2. **Is first deploy?** Yes → Domain Setup: input subdomain → **Is name available?** → set address (immutable).
3. **Is subscription active?** No → first deploy may use the free trial (once per client); otherwise Subscription Plan → KHQR checkout (see `khqr-checkout`).
4. project-service freezes input → `project_generation_requests` `CAPTURED` (idempotency key, `captured_input`, hash, edit revision).
5. ai-generator-service: `input_versions` → `harness_runs` → `validation_runs` (all required pass) → push to Gitea → `source_commit_sha`; request `PUBLISHING`.
6. provisioning-service: `DEPLOY`/`REDEPLOY` command → release ACCEPTED → BUILDING (Kaniko image, `container_image_digest`) → CANDIDATE_READY → PROMOTING → LIVE; previous LIVE → SUPERSEDED; `project_hosting.live_release_id`; subdomain route + SSL.
7. Request → `PUBLISHED`. Usage record `PUBLISH_COMPLETED`. Notify owner (web + mobile).
8. **Is deploy fail?** → **Is max retry exceeded?** (config, default 2) No → owner may retry; Yes → "Contact Admin" + email admin. Failed redeploy (not first) → ROLLBACK to previous release.

Admin Monitoring › Pipeline & Generation shows this as 4 phases: Request · Generation · Release · Live.
When debugging, find the request id and walk the tables in this order; the first non-success status is where it stopped.
