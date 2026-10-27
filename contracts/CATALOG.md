# Contract catalog — who gives what, who uses it

Keep this file in sync with `proto/` and `events/`. A pull request that adds, changes or removes a contract
must change this file too (the `/sync-check` command and the `contract-guardian` agent look for that).

Status: **planned** = file exists here, no service code uses it yet. **live** = at least one service uses it.
Today nothing is live except the two payment events that already exist in `payment-service`.

## gRPC (ask and wait) — `proto/webblock/...`

| Contract | Owner (serves it) | Consumers (call it) | Why | Status |
|---|---|---|---|---|
| `project/v1/access.proto` · `AccessService.CheckAccess` | project-service | provisioning-service, website-portal proxy | May this user manage this site? | planned |
| `project/v1/codegen_input.proto` · `GetCodegenInput`, `GetScaffold`, `CheckThreadOwner` | project-service | ai-generator-service | What to generate; who owns a chat thread | planned |
| `project/v1/repository.proto` · `GetRepository` | project-service | provisioning-service (Jenkins build) | Where is the site's code? | planned |
| `project/v1/owner.proto` · `GetProjectOwner` | project-service | notification-service | Who owns this project? | planned |
| `payment/v1/admission.proto` · `AdmitWebsite`, `ReleaseWebsiteAdmission`, `AdmitGenerationAttempt` | payment-service | project-service | Does the plan allow a new site / generation? | planned |
| `payment/v1/entitlement.proto` · `GetEntitlement` | payment-service | provisioning-service, project-service | Is hosting still paid for? | planned |
| `account/v1/users.proto` · `GetUserContact`, `GetSignupTime` | user-service | notification-service, payment-service | Owner's email/name; trial start date | planned |
| `ai_codegen/v1/runs.proto` · `GetGenerationRun`, `ListGenerationRuns` | ai-generator-service | project-service | Read a run result after the event (or when it is late) | planned |

## Events (this happened) — `events/...`

Exchange = `<sender>.events` (topic). Routing key = `<event>.v<N>`. Queue = `<consumer>.<event>.v<N>` (+ `.dlq`).

| Event (`message_type`) | Sent by | Received by | Status |
|---|---|---|---|
| `account.user_status_changed.v1` | user-service | project-service, payment-service | planned (payment-service already listens, on the old shared exchange) |
| `project.generation_requested.v1` | project-service | ai-generator-service | planned |
| `project.generation_cancelled.v1` | project-service | ai-generator-service | planned |
| `ai_codegen.generation_completed.v1` | ai-generator-service | project-service | planned |
| `project.source_published.v1` | project-service | provisioning-service, payment-service, notification-service | planned |
| `project.project_deleted.v1` | project-service | provisioning-service, payment-service | planned |
| `project.owner_status_changed.v1` | project-service | provisioning-service | planned |
| `provisioning.publish_completed.v1` | provisioning-service | payment-service, notification-service | planned |
| `payment.hosting_entitlement_ended.v1` | payment-service | provisioning-service, notification-service | planned |
| `payment.hosting_entitlement_restored.v1` | payment-service | provisioning-service | planned |
| `payment.bill_paid.v1` | payment-service | (notification/admin, invoice email) | live in payment-service |
| `payment.subscription_activated.v1` | payment-service | notification-service | live in payment-service |

## Known differences between the code and the Notion page (decide, then fix)

1. `payment-service` publishes on one shared exchange `webblock.events` with queue `payment.account-events`.
   The page wants `payment.events` / `account.events` and queues named `<consumer>.<event>.v<N>`.
2. No service has the outbox/inbox tables yet (page 4.3). Until they exist, events can be lost on a crash.
3. Service-to-service calls today are OpenFeign (REST). The page wants gRPC (open point 5). Migrate one call at a time, starting with `CheckAccess`.

## Never (from the page, section 5.5)

- A service reading another service's database.
- ai-generator-service calling provisioning-service or payment-service.
- notification-service deciding anything (it only reports what others decided).
- A service calling the frontend.
- Two services calling each other in a loop inside one request.
