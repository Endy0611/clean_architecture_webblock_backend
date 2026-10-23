---
paths:
  - "provisioning-service/**"
---
# Provisioning / deployment service

- Every action is a `command` (DEPLOY, PROMOTE, ROLLBACK, SUSPEND_HOSTING, RESUME_HOSTING, REDEPLOY) with an `idempotency_key`, `request_fingerprint` and increasing `command_number`. Commands with a number ≤ `project_hosting.last_command_number` are `SKIPPED`.
- Release path: ACCEPTED → BUILDING → BUILT → CANDIDATE_READY → PROMOTING → LIVE. The old LIVE release becomes SUPERSEDED.
- Each step is a `release_steps` row (attempt, deadline, `log_ref`). Logs stay in log storage; DB keeps only the reference.
- Owner retry limit for a failed deploy = config (default 2). Then show "Contact Admin" and email the admin.
- A failed redeploy rolls back to the previous LIVE release. A failed first deploy has nothing to roll back.
- `hosting_status = OFFLINE` must list its reasons (BILLING, USER_SUSPENDED, PROJECT_DELETED, ADMIN_SUSPENDED); remove a reason when its cause ends; ONLINE only when the list is empty.
- Subdomain → route mapping + automatic SSL (cert-manager) for `*.webblock.com`. Subdomain never changes.
- Emit events for Notifications: DeploymentSucceeded, DeploymentFailed, SiteCrashed, ResourceLimitExceeded.
