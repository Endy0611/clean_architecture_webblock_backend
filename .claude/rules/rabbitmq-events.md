---
paths:
  - "contracts/events/**"
  - "services/**/presentation/messaging/**"
  - "services/**/infrastructure/messaging/**"
  - "services/**/domain/**/event/**"
  - "services/**/db/migration/**"
  - "**/*Listener*.java"
  - "**/*Publisher*.java"
  - "**/*consumer*.py"
  - "**/*publisher*.py"
---
# RabbitMQ events: "this happened" (Notion section 4)

Use an event to tell other services something happened, or to start long work. The sender does not wait.
For a question that needs an answer now, use gRPC (`grpc.md`). Never ask a question through an event.

## What an event looks like
Fields are `snake_case`. IDs and small values only. Schema files: `contracts/events/`.
```json
{
  "schema_version": 1,
  "message_id": "0192f4b0-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
  "message_type": "project.source_published.v1",
  "occurred_at": "2026-10-24T08:20:00Z",
  "correlation_id": "0192f4a9-0000-7aaa-8bbb-cccccccccccc",
  "project_id": "0192f4a8-7c2e-7b10-9a1e-3c5d6e7f8a90",
  "generation_request_id": "0192f4a9-0000-7aaa-8bbb-cccccccccccc",
  "repository_id": 81723,
  "git_commit_sha": "3f2a9c1e..."
}
```
Message headers also carry `traceparent` and `x-request-id`. **Never a token, never personal data** (no email, no name).

## Names
| Thing | Rule | Example |
|---|---|---|
| Exchange | one per SENDING service, type topic: `<service>.events` | `project.events` |
| Routing key | `<event>.v<N>` | `source_published.v1` |
| Queue | owned by the CONSUMER: `<consumer>.<event>.v<N>`, quorum queue | `provisioning.source_published.v1` |
| Dead-letter queue | `<queue>.dlq` | `provisioning.source_published.v1.dlq` |
| Broker user | one per service, can touch only its own exchange/queues | `provisioning` |
Kubernetes names cannot contain `_` (open point 2): the AI exchange is `ai_codegen.events` but its broker user is `ai-codegen`.

Known difference today: `payment-service` uses one shared exchange `webblock.events` and queue `payment.account-events`.
That is the old style. Do not copy it into new code; migrate it when the team decides (see `contracts/CATALOG.md`).

## Never lose an event, never act twice (page 4.3)
**Sender** (transactional outbox):
1. In ONE database transaction: save the business change AND an `outbox` row holding the event.
2. After commit, a publisher reads unsent outbox rows, publishes with publisher confirms, waits for the broker's OK,
   then marks the row sent.
3. A crash between 1 and 2 loses nothing; the publisher sends it on restart (so the event may be sent twice — see consumer).
Never publish directly from inside the business transaction ("dual write"). A broker failure must not undo a saved change,
and a saved change must never lack its event.

**Consumer** (inbox + idempotency):
1. In ONE transaction: do the work AND insert the dedupe key into the `inbox` table. A unique key stops a second copy.
2. The key is `message_id`, or the event's own stable key (`event_key`, or `(project_id, generation_request_id)`) when the
   consumer's table defines one — this also catches the same fact sent again with a new `message_id`.
3. **Ack only after the commit.** Never before.
4. A message can arrive twice, late, or out of order. Check your own database before acting. Counters
   (`status_version`) only go up: drop an event older than the stored number (business rule 27).
5. If an event never comes, the waiting service asks the owner with gRPC after its own deadline.

**Retries:** a failing message goes back to the queue up to 5 times, then to the `.dlq`. A human looks at the `.dlq` and moves
messages back after the fix. Never swallow an exception and ack.

## Migrations
`outbox` and `inbox` tables are in each service's own database, added by a NEW Flyway/Alembic migration
(`V<yyyyMMddHHmm>__create_outbox_inbox.sql`). Never edit an applied one (hard rule 2). Keep rows for a limited time and clean up.

## Per-service setup
| Service | Its exchange | Sends | Listens (its queues) |
|---|---|---|---|
| project | `project.events` | `generation_requested/cancelled`, `source_published`, `project_deleted`, `owner_status_changed` | `project.generation_completed.v1`, `project.user_status_changed.v1` |
| AI | `ai_codegen.events` | `generation_completed` | `ai_codegen.generation_requested.v1`, `ai_codegen.generation_cancelled.v1` |
| provisioning | `provisioning.events` | `publish_completed` | `provisioning.source_published.v1`, `.project_deleted.v1`, `.owner_status_changed.v1`, `.hosting_entitlement_ended.v1`, `.hosting_entitlement_restored.v1` |
| payment | `payment.events` | `hosting_entitlement_ended/restored` (+ `bill_paid`, `subscription_activated` today) | `payment.source_published.v1`, `.project_deleted.v1`, `.publish_completed.v1`, `.user_status_changed.v1` |
| account (user-service) | `account.events` | `user_status_changed` | none |
| notification | none | none | `notification.source_published.v1`, `.publish_completed.v1`, `.hosting_entitlement_ended.v1` |

## Changing an event
- Add an optional field: fine in the same version; consumers ignore fields they do not know (`@JsonIgnoreProperties(ignoreUnknown = true)`).
- Rename, remove or change a field: publish `v2` next to `v1` until every consumer moved, then stop `v1`.
- Update `contracts/events/...` and `contracts/CATALOG.md` in the same PR (`contracts.md`).

## Where the code goes (Java)
- Listener: `presentation/messaging/` -> calls ONE handler. The incoming message record sits next to it.
- Publisher, exchange/queue/binding setup, outbox publisher: `infrastructure/messaging/`.
- The event the domain raises: `domain/<feature>/event/` (saved to the outbox by the handler).

## Tests
Consumer: same message twice -> work done once; older `status_version` -> skipped; poison message -> ends in the `.dlq`.
Sender: change + outbox row are in the same transaction (roll back one = roll back both). Use a fake broker or Testcontainers RabbitMQ.
